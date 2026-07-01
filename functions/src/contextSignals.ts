/**
 * Context Signal Engine — sinal de corroboração multi-usuário.
 *
 * Cliente chama `reportContextSignal` quando o hook useTrafficSpeedDetection
 * (ou o futuro useAccelerometerBraking) detecta "parado"/"frenagem brusca".
 * O servidor agrega por célula de geohash6 (~0.6km) em context_signals/{cell},
 * deduplicando por uid — isso é o que alimenta o bônus de corroboração em
 * src/utils/contextScoring.ts (stoppedUsers >= 3 → +25 em todas as categorias).
 *
 * Por que isso é uma Cloud Function e não escrita direta do cliente:
 * um cliente malicioso poderia inflar `stoppedUsers` escrevendo direto no
 * Firestore. Aqui o servidor valida 1 entrada por uid e expira entradas
 * antigas, então o número é confiável.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { encode as geohashEncode } from 'ngeohash';
import { db, checkAppToken, assertAuth } from './shared';

const GEOHASH_PRECISION = 6; // ~0.6km de lado — célula fina o bastante para "mesmo ponto de parada"
const ENTRY_TTL_MS = 10 * 60 * 1000; // 10 minutos — entrada de um usuário parado "esfria" depois disso
const CELL_TTL_MS = 30 * 60 * 1000; // células sem nenhuma entrada viva por 30min são removidas

export type ContextSignalKind = 'stopped' | 'hardBrake';

interface ReportContextSignalData {
  latitude: number;
  longitude: number;
  kind: ContextSignalKind;
}

export const reportContextSignal = onCall(
  { region: 'us-central1' },
  async (request) => {
    checkAppToken(request, 'reportContextSignal');
    const uid = request.auth?.uid;
    assertAuth(uid);

    const { latitude, longitude, kind } = (request.data ?? {}) as ReportContextSignalData;
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !isFinite(latitude) || !isFinite(longitude)) {
      throw new HttpsError('invalid-argument', 'Coordenadas invalidas.');
    }
    if (kind !== 'stopped' && kind !== 'hardBrake') {
      throw new HttpsError('invalid-argument', 'kind invalido.');
    }
    // Margem dos limites do Brasil — mesma validação usada nas regras do Firestore p/ eventos
    if (latitude < -35 || latitude > 6 || longitude < -75 || longitude > -28) {
      throw new HttpsError('invalid-argument', 'Coordenadas fora do Brasil.');
    }

    const cell = geohashEncode(latitude, longitude, GEOHASH_PRECISION);
    const ref = db.collection('context_signals').doc(cell);
    const field = kind === 'stopped' ? 'stoppedEntries' : 'hardBrakeEntries';

    await ref.set({
      [field]: { [uid as string]: Timestamp.now() },
      lastUpdatedAt: Timestamp.now(),
      geohash6: cell,
    }, { merge: true });

    return { ok: true, cell };
  },
);

// ─── Limpeza periódica — expira entradas antigas e remove células mortas ────
export const contextSignalsCleanupScheduler = onSchedule(
  { schedule: 'every 5 minutes', region: 'us-central1', timeZone: 'America/Sao_Paulo' },
  async () => {
    const snap = await db.collection('context_signals')
      .where('lastUpdatedAt', '<', Timestamp.fromMillis(Date.now() - ENTRY_TTL_MS))
      .limit(500)
      .get();

    if (snap.empty) return;

    const now = Date.now();
    const batch = db.batch();
    let updated = 0;
    let deleted = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const ageMs = now - (data.lastUpdatedAt as Timestamp).toMillis();

      if (ageMs > CELL_TTL_MS) {
        batch.delete(doc.ref);
        deleted++;
        continue;
      }

      // Remove entradas (uid -> timestamp) mais velhas que ENTRY_TTL_MS de cada mapa
      const cleanMap = (map: Record<string, Timestamp> | undefined) => {
        if (!map) return undefined;
        const fresh: Record<string, Timestamp> = {};
        for (const [k, ts] of Object.entries(map)) {
          if (now - ts.toMillis() <= ENTRY_TTL_MS) fresh[k] = ts;
        }
        return fresh;
      };

      batch.update(doc.ref, {
        stoppedEntries: cleanMap(data.stoppedEntries) ?? {},
        hardBrakeEntries: cleanMap(data.hardBrakeEntries) ?? {},
      });
      updated++;
    }

    await batch.commit();
    console.log(`[contextSignalsCleanup] ${updated} células limpas, ${deleted} removidas.`);
  },
);
