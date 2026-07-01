/**
 * weather.ts — cache de clima por região, usado pelo Context Signal Engine
 * (contextScoring.ts no cliente lê rainMm1h de weather_cache/{geohash4}).
 *
 * Processamento no servidor (não no cliente) para evitar 1 chamada de API
 * por usuário — busca só as células com atividade recente (context_signals)
 * e faz 1 chamada por célula de geohash4 (~20km), bem abaixo do free tier
 * da OpenWeatherMap (1000 calls/dia).
 *
 * Requer o secret OPENWEATHER_API_KEY (Secret Manager). Sem ele, a função
 * roda e não faz nada — não quebra o deploy nem o app (mesmo padrão de
 * resiliência usado em src/services/sentry.ts: feature ausente, não crash).
 *
 * Setup: firebase functions:secrets:set OPENWEATHER_API_KEY
 * Plano gratuito: https://openweathermap.org/api
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { encode as geohashEncode, decode as geohashDecode } from 'ngeohash';
import { db, readSecret, OPENWEATHER_API_KEY } from './shared';

const ACTIVE_CELL_WINDOW_MS = 30 * 60 * 1000; // considera "ativa" célula com sinal nos últimos 30min
const CACHE_TTL_MS = 30 * 60 * 1000; // não busca de novo se já tem cache fresco
const GEOHASH4_PRECISION = 4; // ~20km de lado — granularidade da API de clima

// ── Guarda-corpo do plano gratuito da OpenWeatherMap (1000 calls/dia, 60/min) ──
// Mesmo que o app cresça muito, isto garante que NUNCA passamos do free tier:
// limite diário com margem de segurança + limite por execução + espaçamento
// entre chamadas (bem abaixo de 60/min mesmo somando chamadas de runs vizinhos).
const DAILY_CALL_CAP = 900; // margem de 100 abaixo do limite real (1000/dia)
const MAX_CALLS_PER_RUN = 40; // a cada 15min, 40 calls/run x 96 runs/dia teórico = 3840 — o cap diário acima é o que de fato protege
const DELAY_BETWEEN_CALLS_MS = 1100; // garante <60 calls/min com folga, mesmo em rajada

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

/** Lê o contador do dia e incrementa atomicamente — retorna o valor APÓS o incremento. */
async function incrementDailyCallCount(): Promise<number> {
  const ref = db.collection('weather_quota').doc(todayKey());
  await ref.set({ calls: FieldValue.increment(1), updatedAt: Timestamp.now() }, { merge: true });
  const snap = await ref.get();
  return snap.data()?.calls ?? 0;
}

async function getDailyCallCount(): Promise<number> {
  const snap = await db.collection('weather_quota').doc(todayKey()).get();
  return snap.data()?.calls ?? 0;
}

function classifyCondition(rainMm1h: number, weatherMain: string): 'rain' | 'fog' | 'clear' {
  if (rainMm1h > 0) return 'rain';
  if (weatherMain === 'Fog' || weatherMain === 'Mist' || weatherMain === 'Haze') return 'fog';
  return 'clear';
}

async function fetchRain(lat: number, lon: number, apiKey: string): Promise<{ rainMm1h: number; condition: string } | null> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json: any = await res.json();
    const rainMm1h = json?.rain?.['1h'] ?? 0;
    const weatherMain = json?.weather?.[0]?.main ?? 'Clear';
    return { rainMm1h, condition: classifyCondition(rainMm1h, weatherMain) };
  } catch (err) {
    console.error('[weather] fetch falhou:', err);
    return null;
  }
}

export const weatherRefreshScheduler = onSchedule(
  { schedule: 'every 15 minutes', region: 'us-central1', timeZone: 'America/Sao_Paulo', secrets: [OPENWEATHER_API_KEY] },
  async () => {
    const apiKey = readSecret(OPENWEATHER_API_KEY);
    if (!apiKey) {
      console.log('[weather] OPENWEATHER_API_KEY não configurada — pulando (feature opcional).');
      return;
    }

    const activeSnap = await db.collection('context_signals')
      .where('lastUpdatedAt', '>', Timestamp.fromMillis(Date.now() - ACTIVE_CELL_WINDOW_MS))
      .limit(500)
      .get();

    if (activeSnap.empty) {
      console.log('[weather] nenhuma célula ativa — nada a atualizar.');
      return;
    }

    // Agrupa as células ativas (geohash6) em células maiores (geohash4) para
    // não fazer 1 chamada de API por célula fina — várias geohash6 caem na
    // mesma geohash4 (~20km), reduzindo bastante o número de requests.
    const cells4 = new Set<string>();
    for (const doc of activeSnap.docs) {
      const cell6 = doc.id;
      const { latitude, longitude } = geohashDecode(cell6);
      cells4.add(geohashEncode(latitude, longitude, GEOHASH4_PRECISION));
    }

    const dailyCountBefore = await getDailyCallCount();
    if (dailyCountBefore >= DAILY_CALL_CAP) {
      console.log(`[weather] cota diária atingida (${dailyCountBefore}/${DAILY_CALL_CAP}) — pulando até virar o dia.`);
      return;
    }

    let updated = 0;
    let skippedFresh = 0;
    let skippedQuota = 0;
    let callsThisRun = 0;

    for (const cell4 of cells4) {
      const ref = db.collection('weather_cache').doc(cell4);
      const existing = await ref.get();
      if (existing.exists) {
        const fetchedAt = existing.data()?.fetchedAt as Timestamp | undefined;
        if (fetchedAt && Date.now() - fetchedAt.toMillis() < CACHE_TTL_MS) {
          skippedFresh++;
          continue;
        }
      }

      // Guarda-corpo duplo: limite por execução (ritmo) + limite diário (cota real)
      if (callsThisRun >= MAX_CALLS_PER_RUN) {
        skippedQuota += cells4.size; // o resto da fila fica pra próxima execução (15min depois)
        break;
      }
      const dailyCount = await incrementDailyCallCount();
      if (dailyCount > DAILY_CALL_CAP) {
        console.log(`[weather] cota diária atingida no meio da execução (${dailyCount}/${DAILY_CALL_CAP}) — parando.`);
        break;
      }

      if (callsThisRun > 0) await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CALLS_MS));
      callsThisRun++;

      const { latitude, longitude } = geohashDecode(cell4);
      const result = await fetchRain(latitude, longitude, apiKey);
      if (!result) continue;

      await ref.set({
        rainMm1h: result.rainMm1h,
        condition: result.condition,
        fetchedAt: Timestamp.now(),
      });
      updated++;
    }

    console.log(`[weather] ${updated} células atualizadas, ${skippedFresh} em cache fresco, ${skippedQuota} adiadas por limite de ritmo. Cota hoje: ~${dailyCountBefore + callsThisRun}/${DAILY_CALL_CAP}.`);
  },
);
