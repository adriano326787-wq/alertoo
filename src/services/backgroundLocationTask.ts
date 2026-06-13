/**
 * backgroundLocationTask
 *
 * Rastreamento de localização em segundo plano para alertas de trânsito
 * "fora do app" (#43-b) — quando o usuário ativa essa opção no perfil, o app
 * continua recebendo updates de localização mesmo minimizado ou fechado
 * (Android: serviço em primeiro plano persistente; iOS: relançamento headless
 * pelo SO quando há atualização significativa de localização).
 *
 * `TaskManager.defineTask` precisa ser chamado no module scope, e este módulo
 * precisa ser importado cedo (App.tsx) para que o SO consiga invocar a task
 * mesmo com o app morto.
 *
 * A cada lote de localizações, roda uma versão simplificada da detecção de
 * trânsito de `useTrafficSpeedDetection` (lento <15km/h por >30s, parado
 * <0.5km/h por >60s, cooldown de 5min). Como o contexto JS pode ser recriado
 * entre invocações, o estado (timestamps) persiste em AsyncStorage.
 *
 * Em caso de alerta, chama `sendLocalNotification` — aparece como pop-up do
 * SO mesmo com o app fechado.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendLocalNotification, setupNotificationChannels } from './notificationService';
import { t } from '../utils/i18n';

export const BACKGROUND_LOCATION_TASK = 'alertoo-background-traffic-task';

const STATE_KEY   = '@alertoo_bg_traffic_state';
const ENABLED_KEY = '@alertoo_bg_traffic_enabled';

// Mesmos limiares de useTrafficSpeedDetection
const SLOW_THRESHOLD_KMH    = 15;
const STOPPED_THRESHOLD_KMH = 0.5;
const SLOW_DURATION_MS      = 30_000;
const STOPPED_DURATION_MS   = 60_000;
const COOLDOWN_MS           = 5 * 60_000;

// Opções compartilhadas por enableBackgroundTrafficAlerts e
// resumeBackgroundTrafficAlertsIfEnabled — devem ficar em sincronia
function getLocationUpdateOptions(): Location.LocationTaskOptions {
  return {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 15_000,
    distanceInterval: 50,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: t('bg_traffic_notif_title'),
      notificationBody: t('bg_traffic_notif_body'),
      notificationColor: '#FF5722',
    },
  };
}

// Contexto de veículo — mesmos valores de useTrafficSpeedDetection.
// Só alerta se o usuário esteve a velocidade de veículo recentemente
// (evita spam para pedestres parados em bar/casa/fila).
const VEHICLE_SPEED_THRESHOLD_KMH = 25;
const VEHICLE_CONTEXT_WINDOW_MS   = 3 * 60_000;

// Anti-fadiga: máximo de alertas de trânsito por dia e janela de silêncio
// noturno (22h–6h, hora local do dispositivo).
const MAX_ALERTS_PER_DAY = 5;
const QUIET_HOUR_START   = 22;
const QUIET_HOUR_END     = 6;

interface BgState {
  slowSince: number | null;
  stoppedSince: number | null;
  lastAlertAt: number;
  /** Último instante em que o usuário esteve a velocidade de veículo */
  lastVehicleSpeedAt: number | null;
  /** Contagem de alertas no dia corrente (chave dayKey) */
  alertsToday: number;
  /** Dia (YYYY-MM-DD local) a que alertsToday se refere */
  dayKey: string;
}

const DEFAULT_STATE: BgState = {
  slowSince: null,
  stoppedSince: null,
  lastAlertAt: 0,
  lastVehicleSpeedAt: null,
  alertsToday: 0,
  dayKey: '',
};

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function inQuietHours(d: Date): boolean {
  const h = d.getHours();
  return h >= QUIET_HOUR_START || h < QUIET_HOUR_END;
}

async function loadState(): Promise<BgState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (_) {}
  return { ...DEFAULT_STATE };
}

async function saveState(state: BgState): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (_) {}
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  // Usa a leitura mais recente do lote
  const last = locations[locations.length - 1];
  const speed = last.coords.speed;
  const speedKmh = speed != null && speed >= 0 ? speed * 3.6 : null;
  if (speedKmh === null) return; // sem velocidade — ignora amostra

  const state = await loadState();
  const now = Date.now();
  const nowDate = new Date(now);

  // Reset do contador diário ao virar o dia
  const dayKey = localDayKey(nowDate);
  if (state.dayKey !== dayKey) {
    state.dayKey = dayKey;
    state.alertsToday = 0;
  }

  // Marca contexto de veículo (≥25 km/h recentemente)
  if (speedKmh >= VEHICLE_SPEED_THRESHOLD_KMH) {
    state.lastVehicleSpeedAt = now;
  }
  const inVehicleContext =
    state.lastVehicleSpeedAt !== null &&
    now - state.lastVehicleSpeedAt <= VEHICLE_CONTEXT_WINDOW_MS;

  const cooldownOk = now - state.lastAlertAt > COOLDOWN_MS;
  const allowedNow =
    cooldownOk &&
    inVehicleContext &&
    state.alertsToday < MAX_ALERTS_PER_DAY &&
    !inQuietHours(nowDate);
  let alertKind: 'slow' | 'stopped' | null = null;

  if (speedKmh < STOPPED_THRESHOLD_KMH) {
    state.slowSince = null;
    if (state.stoppedSince === null) {
      state.stoppedSince = now;
    } else if (allowedNow && now - state.stoppedSince >= STOPPED_DURATION_MS) {
      alertKind = 'stopped';
      state.stoppedSince = null;
    }
  } else {
    state.stoppedSince = null;
    if (speedKmh < SLOW_THRESHOLD_KMH) {
      if (state.slowSince === null) {
        state.slowSince = now;
      } else if (allowedNow && now - state.slowSince >= SLOW_DURATION_MS) {
        alertKind = 'slow';
        state.slowSince = null;
      }
    } else {
      state.slowSince = null;
    }
  }

  if (alertKind) {
    state.lastAlertAt = now;
    state.alertsToday += 1;
    const title = alertKind === 'stopped'
      ? `🛑 ${t('traffic_alert_stopped_title')}`
      : `🚦 ${t('traffic_alert_slow_title')}`;
    await sendLocalNotification(title, t('traffic_alert_notif_body'), {
      trafficAlert: true,
      kind: alertKind,
      latitude: last.coords.latitude,
      longitude: last.coords.longitude,
    }).catch(() => {});
  }

  await saveState(state);
});

// ─── Permissões e controle do rastreamento ─────────────────────────────────

/**
 * Lê a preferência salva (independente de a task estar de fato rodando).
 * Usado pelo App.tsx no boot para decidir se deve retomar o rastreamento.
 */
export async function getBackgroundTrafficAlertsPreference(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
  } catch (_) {
    return false;
  }
}

/** Verifica se a task de localização está de fato ativa no SO. */
export async function isBackgroundTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch (_) {
    return false;
  }
}

export type BackgroundTrafficResult = 'granted' | 'denied' | 'foreground_only';

/**
 * Solicita permissões (foreground → background) e inicia o rastreamento.
 * Retorna:
 *  - 'granted'        : permissão "sempre" concedida, rastreamento iniciado
 *  - 'foreground_only': usuário concedeu apenas "ao usar o app" — não dá para
 *                        rastrear em segundo plano
 *  - 'denied'         : usuário negou até a permissão de localização básica
 */
export async function enableBackgroundTrafficAlerts(): Promise<BackgroundTrafficResult> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    const req = await Location.requestForegroundPermissionsAsync();
    if (req.status !== 'granted') return 'denied';
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') {
    return 'foreground_only';
  }

  await saveState({ ...DEFAULT_STATE });

  // Pré-cria o canal de importância mínima antes do serviço (ver notificationService)
  await setupNotificationChannels().catch(() => {});

  const alreadyStarted = await isBackgroundTrackingActive();
  if (!alreadyStarted) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, getLocationUpdateOptions());
  }

  await AsyncStorage.setItem(ENABLED_KEY, '1');
  return 'granted';
}

export async function disableBackgroundTrafficAlerts(): Promise<void> {
  try {
    if (await isBackgroundTrackingActive()) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (_) {}
  try {
    await AsyncStorage.setItem(ENABLED_KEY, '0');
  } catch (_) {}
}

/**
 * Chamado no boot do app (App.tsx): se o usuário já tinha ativado a opção e a
 * permissão "sempre" continua concedida, religa a task (necessário porque o
 * SO pode encerrar o registro da task em alguns cenários, ex.: app atualizado).
 */
export async function resumeBackgroundTrafficAlertsIfEnabled(): Promise<void> {
  const enabled = await getBackgroundTrafficAlertsPreference();
  if (!enabled) return;

  try {
    const bg = await Location.getBackgroundPermissionsAsync();
    if (bg.status !== 'granted') return; // permissão revogada — não força nada

    await setupNotificationChannels().catch(() => {});

    if (!(await isBackgroundTrackingActive())) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, getLocationUpdateOptions());
    }
  } catch (_) {}
}
