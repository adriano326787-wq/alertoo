/**
 * radarProximityAlert — aviso sonoro/falado de proximidade de radar.
 *
 * Voz: MP3s pré-gerados com ElevenLabs (Brian, eleven_multilingual_v2),
 * um arquivo por idioma × distância — qualidade premium, funciona offline.
 * Beep: WAV gerado localmente (3 × 880Hz), via expo-audio (import lazy).
 *
 * Guard rails:
 *   - Feature opt-in (preferência local, ver getRadarProximityAlertsPreference)
 *   - Só dispara com velocidade ≥ RADAR_ALERT_MIN_SPEED_KMH (contexto de veículo)
 *   - Se o GPS fornece heading, só alerta radares "na frente" (±HEADING_TOLERANCE_DEG)
 *   - Por radar: cada limiar e o beep disparam no máximo uma vez por aproximação
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Radar } from '../types/radar';
import { haversineDistance, bearing, angleDiff } from '../utils/geo';
import { getCurrentLang } from '../utils/i18n';
import { captureError } from './sentry';

const ENABLED_KEY      = '@alertoo_radar_proximity_enabled';
const STATE_KEY        = '@alertoo_radar_proximity_state';
const RADARS_CACHE_KEY = 'radars_cache_v2';

export const RADAR_ALERT_MIN_SPEED_KMH = 30;

const MAX_RANGE_M          = 900;
const VOICE_TIERS_M        = [800, 300, 100];
const BEEP_DISTANCE_M      = 30;
const HEADING_TOLERANCE_DEG = 50;
const STATE_STALE_MS       = 5 * 60_000;

// MP3s pré-gerados pelo ElevenLabs — um por idioma × distância
const VOICE_ASSETS: Record<string, { m800: number; m300: number; m100: number }> = {
  pt: {
    m800: require('../../assets/sounds/radar/pt_800.mp3'),
    m300: require('../../assets/sounds/radar/pt_300.mp3'),
    m100: require('../../assets/sounds/radar/pt_100.mp3'),
  },
  en: {
    m800: require('../../assets/sounds/radar/en_800.mp3'),
    m300: require('../../assets/sounds/radar/en_300.mp3'),
    m100: require('../../assets/sounds/radar/en_100.mp3'),
  },
  es: {
    m800: require('../../assets/sounds/radar/es_800.mp3'),
    m300: require('../../assets/sounds/radar/es_300.mp3'),
    m100: require('../../assets/sounds/radar/es_100.mp3'),
  },
  fr: {
    m800: require('../../assets/sounds/radar/fr_800.mp3'),
    m300: require('../../assets/sounds/radar/fr_300.mp3'),
    m100: require('../../assets/sounds/radar/fr_100.mp3'),
  },
};

interface RadarAlertEntry {
  lastTier: number;   // menor limiar já anunciado (m); Infinity = nenhum ainda
  beeped: boolean;
  lastSeenAt: number;
}
type RadarAlertState = Record<string, RadarAlertEntry>;

let audioModeReady = false;

async function ensureAudioMode(): Promise<typeof import('expo-audio') | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const audio = require('expo-audio') as typeof import('expo-audio');
    if (!audioModeReady) {
      await audio.setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
      });
      audioModeReady = true;
    }
    return audio;
  } catch (err) {
    // Ex: "Cannot find native module 'ExpoAudio'" — acontece quando o binário
    // nativo instalado é mais antigo que o JS bundle (OTA entregou JS que usa
    // expo-audio antes do app nativo correspondente ter sido publicado).
    // Reporta uma vez (não a cada chamada) pra não inflar o Sentry, mas nunca propaga.
    if (!audioModeReady) captureError(err, { where: 'radarProximityAlert.ensureAudioMode' });
    return null;
  }
}

function playAsset(asset: number): void {
  // #35 — segunda camada de proteção: mesmo que algo escape do try/catch
  // de ensureAudioMode (ex: bundle antigo sem essa correção ainda via OTA),
  // este .catch() garante que a promise nunca fica rejeitada sem tratamento.
  Promise.resolve().then(async () => {
    const audio = await ensureAudioMode();
    if (!audio) return;
    try {
      const player = audio.createAudioPlayer(asset);
      player.play();
      setTimeout(() => { try { player.remove(); } catch (_) {} }, 5000);
    } catch (_) {}
  }).catch((err) => captureError(err, { where: 'radarProximityAlert.playAsset' }));
}

function playVoice(tierM: number): void {
  const lang = getCurrentLang();
  const assets = VOICE_ASSETS[lang] ?? VOICE_ASSETS['pt'];
  const asset = tierM <= 100 ? assets.m100 : tierM <= 300 ? assets.m300 : assets.m800;
  playAsset(asset);
}

function playBeep(): void {
  playAsset(require('../../assets/sounds/radar-beep.wav'));
}

async function loadState(): Promise<RadarAlertState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
}

async function saveState(state: RadarAlertState): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (_) {}
}

async function loadRadars(): Promise<Radar[]> {
  try {
    const raw = await AsyncStorage.getItem(RADARS_CACHE_KEY);
    if (!raw) return [];
    const { radars } = JSON.parse(raw) as { radars: Radar[] };
    return (radars ?? []).filter((r) => r.status === 'active');
  } catch (_) {
    return [];
  }
}

export async function getRadarProximityAlertsPreference(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
  } catch (_) {
    return false;
  }
}

export async function setRadarProximityAlertsPreference(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
    if (!enabled) await AsyncStorage.removeItem(STATE_KEY);
  } catch (_) {}
}

export async function checkRadarProximity(
  latitude: number,
  longitude: number,
  speedKmh: number,
  headingDeg: number | null,
): Promise<void> {
  if (speedKmh < RADAR_ALERT_MIN_SPEED_KMH) return;
  if (!(await getRadarProximityAlertsPreference())) return;

  const radars = await loadRadars();
  if (radars.length === 0) return;

  const state = await loadState();
  const now = Date.now();
  let changed = false;

  for (const radar of radars) {
    const distanceM = haversineDistance(latitude, longitude, radar.latitude, radar.longitude) * 1000;
    if (distanceM > MAX_RANGE_M) continue;

    if (headingDeg != null && headingDeg >= 0) {
      const radarBearing = bearing(latitude, longitude, radar.latitude, radar.longitude);
      if (angleDiff(headingDeg, radarBearing) > HEADING_TOLERANCE_DEG) continue;
    }

    const entry = state[radar.id] ?? { lastTier: Infinity, beeped: false, lastSeenAt: now };
    entry.lastSeenAt = now;

    if (distanceM <= BEEP_DISTANCE_M && !entry.beeped) {
      entry.beeped = true;
      playBeep();
      changed = true;
    }

    for (const tierM of VOICE_TIERS_M) {
      if (distanceM <= tierM && entry.lastTier > tierM) {
        entry.lastTier = tierM;
        playVoice(tierM);
        changed = true;
        break;
      }
    }

    state[radar.id] = entry;
  }

  for (const id of Object.keys(state)) {
    const entry = state[id];
    const stillNearby = radars.some((r) => {
      if (r.id !== id) return false;
      const d = haversineDistance(latitude, longitude, r.latitude, r.longitude) * 1000;
      return d <= MAX_RANGE_M;
    });
    if (!stillNearby && now - entry.lastSeenAt > STATE_STALE_MS) {
      delete state[id];
      changed = true;
    }
  }

  if (changed) await saveState(state);
}
