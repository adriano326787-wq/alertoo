/**
 * Orquestra o Context Signal Engine no cliente:
 *   1. Reporta sinais (parado/frenagem) para a Cloud Function reportContextSignal
 *      (alimenta a corroboração multi-usuário pros OUTROS usuários na mesma célula)
 *   2. Lê os caches já calculados (context_signals, weather_cache, geo_blackspots)
 *   3. Monta o objeto ContextSignals e chama contextScoring.ts
 *
 * Tudo client-side a partir daqui é best-effort: se alguma leitura falhar
 * (rede, doc inexistente), os sinais correspondentes ficam no valor neutro
 * e o scoring degrada graciosamente em vez de travar o pop-up.
 */
import { httpsCallable, getFunctions } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { encode as geohashEncode } from 'ngeohash';
import { db } from './firebase';
import { captureError } from './sentry';
import { isRushHour, isNightlifeWindow, isPayday } from '../utils/rushHour';
import { isHoliday, isHolidayEve } from '../utils/brazilCalendar';
import { ContextSignals, ScoredCategory } from '../utils/contextScoring';

const GEOHASH6_PRECISION = 6;
const GEOHASH4_PRECISION = 4;
const functions = getFunctions(undefined, 'us-central1');

// Espelha o tipo de functions/src/contextSignals.ts — não importamos de lá
// porque é um projeto TS separado (Firebase Admin), não pode ser bundlado
// no app cliente (Metro tentaria empacotar o SDK Admin inteiro).
export type ContextSignalKind = 'stopped' | 'hardBrake';

/** Reporta um sinal (fire-and-forget) — não bloqueia a UI, falha silenciosamente. */
export function reportContextSignal(kind: ContextSignalKind, latitude: number, longitude: number): void {
  try {
    const fn = httpsCallable(functions, 'reportContextSignal');
    fn({ latitude, longitude, kind }).catch((e) => captureError(e, { where: 'contextSignalService.reportContextSignal' }));
  } catch (e) {
    captureError(e, { where: 'contextSignalService.reportContextSignal.sync' });
  }
}

interface PartialSignals {
  speedKmh: number;
  stoppedSeconds: number;
  hardBrake: boolean;
  nearEntertainmentVenue?: boolean;
}

/** Monta o objeto completo de sinais pra um ponto, combinando dado local (já calculado pelo chamador) com os caches do Firestore + calendário. */
export async function buildContextSignals(
  latitude: number,
  longitude: number,
  partial: PartialSignals,
): Promise<ContextSignals> {
  const cell6 = geohashEncode(latitude, longitude, GEOHASH6_PRECISION);
  const cell4 = geohashEncode(latitude, longitude, GEOHASH4_PRECISION);
  const now = new Date();

  let stoppedUsers = 0;
  let rainMm1h: number | null = null;
  let blackspotCategory: Partial<Record<ScoredCategory, number>> | null = null;

  try {
    const signalSnap = await getDoc(doc(db, 'context_signals', cell6));
    if (signalSnap.exists()) {
      const data = signalSnap.data();
      stoppedUsers = Object.keys(data.stoppedEntries ?? {}).length;
    }
  } catch (e) {
    captureError(e, { where: 'contextSignalService.buildContextSignals.context_signals' });
  }

  try {
    const weatherSnap = await getDoc(doc(db, 'weather_cache', cell4));
    if (weatherSnap.exists()) {
      rainMm1h = weatherSnap.data().rainMm1h ?? null;
    }
  } catch (e) {
    captureError(e, { where: 'contextSignalService.buildContextSignals.weather_cache' });
  }

  try {
    const blackspotSnap = await getDoc(doc(db, 'geo_blackspots', cell6));
    if (blackspotSnap.exists()) {
      blackspotCategory = blackspotSnap.data().category ?? null;
    }
  } catch (e) {
    captureError(e, { where: 'contextSignalService.buildContextSignals.geo_blackspots' });
  }

  return {
    stoppedUsers,
    speedKmh: partial.speedKmh,
    stoppedSeconds: partial.stoppedSeconds,
    hardBrake: partial.hardBrake,
    rainMm1h,
    isRushHour: isRushHour(now),
    isNightlifeWindow: isNightlifeWindow(now),
    isHoliday: isHoliday(now),
    isHolidayEve: isHolidayEve(now),
    isPayday: isPayday(now),
    // TODO: integrar Google Places (ou base própria de venues) — por ora,
    // sempre false; quem chamar pode passar um valor melhor quando existir.
    nearEntertainmentVenue: partial.nearEntertainmentVenue ?? false,
    blackspotCategory,
  };
}
