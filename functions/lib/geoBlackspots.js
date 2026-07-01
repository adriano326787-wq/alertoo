"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geoBlackspotsScheduler = void 0;
/**
 * geoBlackspots.ts — agrega o histórico de eventos confirmados (event_history,
 * arquivado por cleanupExpiredEvents em maintenance.ts antes de deletar o
 * evento expirado) em contagens por célula geográfica + categoria.
 *
 * Alimenta geo_blackspots/{geohash6}.category, lido por contextScoring.ts
 * (bônus de "ponto recorrente" — ex: cruzamento que sempre tem acidente).
 */
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("./shared");
const LOOKBACK_DAYS = 90;
const BATCH_SIZE = 500;
exports.geoBlackspotsScheduler = (0, scheduler_1.onSchedule)({ schedule: 'every 24 hours', region: 'us-central1', timeZone: 'America/Sao_Paulo' }, async () => {
    const cutoff = firestore_1.Timestamp.fromMillis(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    // Limpa histórico antigo (fora da janela de relevância) para não crescer indefinidamente
    const oldSnap = await shared_1.db.collection('event_history')
        .where('archivedAt', '<', cutoff)
        .limit(BATCH_SIZE)
        .get();
    if (!oldSnap.empty) {
        const delBatch = shared_1.db.batch();
        oldSnap.docs.forEach((d) => delBatch.delete(d.ref));
        await delBatch.commit();
    }
    // Agrega o que sobrou (dentro da janela) por geohash6 + categoria
    const snap = await shared_1.db.collection('event_history')
        .where('archivedAt', '>=', cutoff)
        .get();
    const counts = new Map(); // geohash6 -> { category: count }
    for (const doc of snap.docs) {
        const { geohash6, category } = doc.data();
        if (!geohash6 || !category)
            continue;
        const cellCounts = counts.get(geohash6) ?? {};
        cellCounts[category] = (cellCounts[category] ?? 0) + 1;
        counts.set(geohash6, cellCounts);
    }
    // Grava em lotes de 500 (limite de batch do Firestore)
    const entries = Array.from(counts.entries());
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const chunk = entries.slice(i, i + BATCH_SIZE);
        const batch = shared_1.db.batch();
        for (const [geohash6, category] of chunk) {
            batch.set(shared_1.db.collection('geo_blackspots').doc(geohash6), {
                category,
                lastComputedAt: firestore_1.Timestamp.now(),
            });
        }
        await batch.commit();
    }
    console.log(`[geoBlackspots] ${entries.length} células agregadas, ${oldSnap.size} registros antigos removidos.`);
});
//# sourceMappingURL=geoBlackspots.js.map