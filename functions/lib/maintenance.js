"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserProfileWritten = exports.dailySecurityReport = exports.monitorPaymentAttempts = exports.monitorEventVolume = exports.eventEngagementScheduler = exports.adminRefreshStateCounts = exports.onEntEventWrittenUpdateStateCounts = exports.onRoadEventWrittenUpdateStateCounts = exports.stateEventCountsScheduler = exports.cleanupExpiredEvents = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_2 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const ngeohash_1 = require("ngeohash");
const shared_1 = require("./shared");
const BLACKSPOT_GEOHASH_PRECISION = 6; // mesma precisão usada em contextSignals.ts
// ─── Limpeza diária de eventos expirados ─────────────────────────────────────
exports.cleanupExpiredEvents = (0, scheduler_1.onSchedule)({ schedule: 'every 24 hours', region: 'us-central1', timeZone: 'America/Sao_Paulo' }, async () => {
    const now = firestore_2.Timestamp.now();
    const expiredEnt = await shared_1.db.collection('entertainment_events')
        .where('expiresAt', '<', now)
        .limit(400)
        .get();
    const expiredRoad = await shared_1.db.collection('events')
        .where('expiresAt', '<', now)
        .limit(400)
        .get();
    const expiredRadars = await shared_1.db.collection('radars')
        .where('expiresAt', '<', now)
        .limit(400)
        .get();
    const staleCutoff = firestore_2.Timestamp.fromMillis(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const staleRadars = await shared_1.db.collection('radars')
        .where('lastConfirmedAt', '<', staleCutoff)
        .limit(400)
        .get();
    const toDelete = new Map();
    [...expiredEnt.docs, ...expiredRoad.docs, ...expiredRadars.docs, ...staleRadars.docs]
        .forEach((d) => toDelete.set(d.ref.path, d.ref));
    const batch = shared_1.db.batch();
    toDelete.forEach((ref) => batch.delete(ref));
    // ── Arquiva um registro mínimo ANTES de deletar (alimenta geo_blackspots) ──
    // Só eventos com pelo menos 1 confirmação — evita poluir o histórico com
    // reports nunca corroborados por mais ninguém (provável ruído/erro).
    // event_history não tem TTL — geoBlackspotsScheduler que decide a janela
    // de relevância (90 dias) na hora de agregar.
    for (const d of expiredRoad.docs) {
        const data = d.data();
        if ((data.confirmations ?? 0) < 1)
            continue;
        if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number')
            continue;
        const geohash6 = (0, ngeohash_1.encode)(data.latitude, data.longitude, BLACKSPOT_GEOHASH_PRECISION);
        batch.set(shared_1.db.collection('event_history').doc(d.id), {
            type: 'road',
            category: data.category,
            geohash6,
            confirmations: data.confirmations ?? 0,
            archivedAt: firestore_2.Timestamp.now(),
        });
    }
    for (const d of expiredEnt.docs) {
        const data = d.data();
        const likeCount = Array.isArray(data.likes) ? data.likes.length : 0;
        if (likeCount < 1)
            continue;
        if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number')
            continue;
        const geohash6 = (0, ngeohash_1.encode)(data.latitude, data.longitude, BLACKSPOT_GEOHASH_PRECISION);
        batch.set(shared_1.db.collection('event_history').doc(d.id), {
            type: 'entertainment',
            category: 'entertainment',
            geohash6,
            confirmations: likeCount,
            archivedAt: firestore_2.Timestamp.now(),
        });
    }
    if (toDelete.size > 0) {
        await batch.commit();
    }
    for (const d of expiredEnt.docs) {
        const data = d.data();
        const userId = data.userId;
        if (!userId || userId === 'anonymous')
            continue;
        const viewCount = data.viewCount ?? 0;
        const likeCount = (data.likes ?? []).length;
        const commentCount = data.commentCount ?? 0;
        if (viewCount === 0 && likeCount === 0 && commentCount === 0)
            continue;
        const userSnap = await shared_1.db.collection('users').doc(userId).get();
        const userData = userSnap.data();
        if (!userData || userData.notifPrefs?.eventEngagementUpdates === false)
            continue;
        const fcmTokens = userData.fcmTokens;
        if (!Array.isArray(fcmTokens) || fcmTokens.length === 0)
            continue;
        await (0, messaging_1.getMessaging)().sendEachForMulticast({
            tokens: fcmTokens,
            notification: {
                title: '🏁 Resumo final do seu evento',
                body: `"${data.title}" encerrou com ${viewCount} visualizações, ${likeCount} curtidas e ${commentCount} comentários.`,
            },
            data: { eventType: 'entertainment' },
            android: { priority: 'high', notification: { channelId: 'default' } },
        }).catch((e) => console.error('[FCM] cleanupExpiredEvents recap error:', e));
    }
    console.log(`[cleanup] ${expiredEnt.size} eventos de entretenimento + ` +
        `${expiredRoad.size} road events expirados + ` +
        `${expiredRadars.size} radares expirados + ${staleRadars.size} radares frios removidos.`);
});
// ─── Contagem de eventos ativos por estado ────────────────────────────────────
const BRAZIL_UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];
exports.stateEventCountsScheduler = (0, scheduler_1.onSchedule)({ schedule: 'every 60 minutes', region: 'us-central1', timeZone: 'America/Sao_Paulo' }, async () => {
    const now = firestore_2.Timestamp.now();
    const counts = {};
    await Promise.all(BRAZIL_UFS.map(async (uf) => {
        const [roadSnap, entSnap] = await Promise.all([
            shared_1.db.collection('events')
                .where('stateUF', '==', uf)
                .where('expiresAt', '>', now)
                .count().get(),
            shared_1.db.collection('entertainment_events')
                .where('stateUF', '==', uf)
                .where('expiresAt', '>', now)
                .count().get(),
        ]);
        const total = roadSnap.data().count + entSnap.data().count;
        if (total > 0)
            counts[uf] = total;
    }));
    await shared_1.db.collection('stats').doc('eventCountsByState').set({
        counts,
        updatedAt: now,
    });
    console.log(`[stateEventCountsScheduler] contagens atualizadas para ${Object.keys(counts).length} estados.`);
});
// ─── Atualização em tempo real dos pins de estado ────────────────────────────
async function refreshStateCountForEvent(beforeData, afterData) {
    const ufsToRefresh = new Set();
    if (typeof beforeData?.stateUF === 'string')
        ufsToRefresh.add(beforeData.stateUF);
    if (typeof afterData?.stateUF === 'string')
        ufsToRefresh.add(afterData.stateUF);
    if (ufsToRefresh.size === 0)
        return;
    const now = firestore_2.Timestamp.now();
    const statsRef = shared_1.db.collection('stats').doc('eventCountsByState');
    await Promise.all([...ufsToRefresh].map(async (uf) => {
        const [roadSnap, entSnap] = await Promise.all([
            shared_1.db.collection('events')
                .where('stateUF', '==', uf)
                .where('expiresAt', '>', now)
                .count().get(),
            shared_1.db.collection('entertainment_events')
                .where('stateUF', '==', uf)
                .where('expiresAt', '>', now)
                .count().get(),
        ]);
        const total = roadSnap.data().count + entSnap.data().count;
        await statsRef.update({
            [`counts.${uf}`]: total > 0 ? total : firestore_2.FieldValue.delete(),
            updatedAt: now,
        }).catch(async () => {
            await statsRef.set({ counts: total > 0 ? { [uf]: total } : {}, updatedAt: now }, { merge: true });
        });
    }));
}
exports.onRoadEventWrittenUpdateStateCounts = (0, firestore_1.onDocumentWritten)({ document: 'events/{eventId}', region: 'us-central1' }, async (event) => {
    await refreshStateCountForEvent(event.data?.before?.data(), event.data?.after?.data());
});
exports.onEntEventWrittenUpdateStateCounts = (0, firestore_1.onDocumentWritten)({ document: 'entertainment_events/{eventId}', region: 'us-central1' }, async (event) => {
    await refreshStateCountForEvent(event.data?.before?.data(), event.data?.after?.data());
});
// ─── Endpoint admin: força rebuild do doc stats/eventCountsByState ───────────
exports.adminRefreshStateCounts = (0, https_1.onRequest)({ region: 'us-central1' }, async (req, res) => {
    const token = req.headers['x-admin-token'];
    if (token !== 'alertoo-stats-rebuild-2026') {
        res.status(403).send('Forbidden');
        return;
    }
    const now = firestore_2.Timestamp.now();
    const counts = {};
    await Promise.all(BRAZIL_UFS.map(async (uf) => {
        const [roadSnap, entSnap] = await Promise.all([
            shared_1.db.collection('events')
                .where('stateUF', '==', uf)
                .where('expiresAt', '>', now)
                .count().get(),
            shared_1.db.collection('entertainment_events')
                .where('stateUF', '==', uf)
                .where('expiresAt', '>', now)
                .count().get(),
        ]);
        const total = roadSnap.data().count + entSnap.data().count;
        if (total > 0)
            counts[uf] = total;
    }));
    await shared_1.db.collection('stats').doc('eventCountsByState').set({ counts, updatedAt: now });
    console.log(`[adminRefreshStateCounts] ${Object.keys(counts).length} estados atualizados.`);
    res.json({ ok: true, states: Object.keys(counts).length, counts });
});
// ─── Notificações periódicas de engajamento dos eventos do usuário ──────────
const ENGAGEMENT_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
exports.eventEngagementScheduler = (0, scheduler_1.onSchedule)({ schedule: 'every 6 hours', region: 'us-central1' }, async () => {
    const now = firestore_2.Timestamp.now();
    const nowMs = Date.now();
    const activeSnap = await shared_1.db.collection('entertainment_events')
        .where('expiresAt', '>', now)
        .get();
    if (activeSnap.empty)
        return;
    const eventsByUser = new Map();
    activeSnap.docs.forEach((d) => {
        const data = d.data();
        const userId = data.userId;
        if (!userId || userId === 'anonymous')
            return;
        const snapshot = data.engagementSnapshot ?? {};
        const lastNotifiedAt = snapshot.lastNotifiedAt ?? 0;
        if (nowMs - lastNotifiedAt < ENGAGEMENT_CHECK_INTERVAL_MS)
            return;
        const viewCount = data.viewCount ?? 0;
        const likeCount = (data.likes ?? []).length;
        const commentCount = data.commentCount ?? 0;
        const viewDelta = viewCount - (snapshot.viewCount ?? 0);
        const likeDelta = likeCount - (snapshot.likeCount ?? 0);
        const commentDelta = commentCount - (snapshot.commentCount ?? 0);
        if (viewDelta <= 0 && likeDelta <= 0 && commentDelta <= 0)
            return;
        if (!eventsByUser.has(userId))
            eventsByUser.set(userId, []);
        eventsByUser.get(userId).push(d);
    });
    if (eventsByUser.size === 0)
        return;
    let notified = 0;
    for (const [userId, docs] of eventsByUser) {
        const userSnap = await shared_1.db.collection('users').doc(userId).get();
        const userData = userSnap.data();
        if (!userData)
            continue;
        if (userData.notifPrefs?.eventEngagementUpdates === false)
            continue;
        const fcmTokens = userData.fcmTokens;
        if (!Array.isArray(fcmTokens) || fcmTokens.length === 0)
            continue;
        for (const eventDoc of docs) {
            const data = eventDoc.data();
            const viewCount = data.viewCount ?? 0;
            const likeCount = (data.likes ?? []).length;
            const commentCount = data.commentCount ?? 0;
            const snapshot = data.engagementSnapshot ?? {};
            const viewDelta = viewCount - (snapshot.viewCount ?? 0);
            const likeDelta = likeCount - (snapshot.likeCount ?? 0);
            const commentDelta = commentCount - (snapshot.commentCount ?? 0);
            const parts = [];
            if (viewDelta > 0)
                parts.push(`${viewDelta} ${viewDelta === 1 ? 'visualização' : 'visualizações'}`);
            if (likeDelta > 0)
                parts.push(`${likeDelta} ${likeDelta === 1 ? 'curtida' : 'curtidas'}`);
            if (commentDelta > 0)
                parts.push(`${commentDelta} ${commentDelta === 1 ? 'comentário' : 'comentários'}`);
            await (0, messaging_1.getMessaging)().sendEachForMulticast({
                tokens: fcmTokens,
                notification: {
                    title: '📊 Seu evento está bombando!',
                    body: `"${data.title}" já teve ${parts.join(', ')}.`,
                },
                data: { eventId: eventDoc.id, eventType: 'entertainment' },
                android: { priority: 'high', notification: { channelId: 'default' } },
            }).catch((e) => console.error('[FCM] eventEngagementScheduler error:', e));
            await eventDoc.ref.update({
                engagementSnapshot: { viewCount, likeCount, commentCount, lastNotifiedAt: nowMs },
            }).catch(() => { });
            notified++;
        }
    }
    console.log(`[eventEngagement] ${notified} notificação(ões) de engajamento enviada(s).`);
});
// ─── Monitor de segurança ─────────────────────────────────────────────────────
const ALERT_EVENTS_PER_HOUR = 20;
const ALERT_PAYMENTS_PER_DAY = 10;
const ALERT_APPCHECK_WARNINGS = 5;
async function raiseSecurityAlert(params) {
    const alert = {
        ...params,
        createdAt: firestore_2.FieldValue.serverTimestamp(),
        resolved: false,
    };
    await shared_1.db.collection('security_alerts').add(alert).catch(() => { });
    const logFn = params.severity === 'LOW' ? console.warn : console.error;
    logFn(`[SECURITY][${params.severity}] ${params.type}`, JSON.stringify(params.details));
}
exports.monitorEventVolume = (0, firestore_1.onDocumentCreated)({ document: 'events/{eventId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const userId = data.userId;
    if (!userId || userId === 'anonymous')
        return;
    const oneHourAgo = firestore_2.Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    const recentSnap = await shared_1.db.collection('events')
        .where('userId', '==', userId)
        .where('createdAt', '>', oneHourAgo)
        .count()
        .get();
    const count = recentSnap.data().count;
    if (count > ALERT_EVENTS_PER_HOUR) {
        await raiseSecurityAlert({
            type: 'HIGH_EVENT_VOLUME',
            severity: 'HIGH',
            uid: userId,
            details: { eventsInLastHour: count, threshold: ALERT_EVENTS_PER_HOUR, eventId: event.params.eventId },
        });
    }
});
exports.monitorPaymentAttempts = (0, firestore_1.onDocumentCreated)({ document: 'pending_payments/{paymentId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const userId = data.userId;
    if (!userId)
        return;
    const oneDayAgo = firestore_2.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const attemptsSnap = await shared_1.db.collection('pending_payments')
        .where('userId', '==', userId)
        .where('createdAt', '>', oneDayAgo.toMillis())
        .count()
        .get();
    const count = attemptsSnap.data().count;
    if (count > ALERT_PAYMENTS_PER_DAY) {
        await raiseSecurityAlert({
            type: 'HIGH_PAYMENT_ATTEMPTS',
            severity: 'CRITICAL',
            uid: userId,
            details: { attemptsIn24h: count, threshold: ALERT_PAYMENTS_PER_DAY, method: data.paymentMethod },
        });
    }
});
exports.dailySecurityReport = (0, scheduler_1.onSchedule)({ schedule: '0 8 * * *', region: 'us-central1', timeZone: 'America/Sao_Paulo' }, async () => {
    const yesterday = firestore_2.Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const alertsSnap = await shared_1.db.collection('security_alerts')
        .where('resolved', '==', false)
        .where('createdAt', '>', yesterday)
        .get();
    const byType = {};
    const bySeverity = {};
    alertsSnap.docs.forEach((doc) => {
        const d = doc.data();
        byType[d.type] = (byType[d.type] ?? 0) + 1;
        bySeverity[d.severity] = (bySeverity[d.severity] ?? 0) + 1;
    });
    const total = alertsSnap.size;
    const hasCritical = (bySeverity['CRITICAL'] ?? 0) > 0;
    if (hasCritical || total > 0) {
        console.error('[SECURITY][DAILY_REPORT] Alertas não resolvidos nas últimas 24h', JSON.stringify({
            total,
            byType,
            bySeverity,
            timestamp: new Date().toISOString(),
        }));
    }
    else {
        console.log('[SECURITY][DAILY_REPORT] Nenhum alerta de segurança nas últimas 24h — OK');
    }
    const appCheckSnap = await shared_1.db.collection('security_alerts')
        .where('type', '==', 'HIGH_APPCHECK_WARNINGS')
        .where('resolved', '==', false)
        .count()
        .get();
    if (appCheckSnap.data().count >= ALERT_APPCHECK_WARNINGS) {
        console.error('[SECURITY][APP_CHECK] Muitos warnings de App Check — considere ativar enforcement', {
            count: appCheckSnap.data().count,
        });
    }
});
// ─── Espelho público do ranking ───────────────────────────────────────────────
exports.onUserProfileWritten = (0, firestore_1.onDocumentWritten)({ document: 'users/{userId}', region: 'us-central1' }, async (event) => {
    const userId = event.params.userId;
    const after = event.data?.after?.data();
    if (!after) {
        await shared_1.db.collection('leaderboard_public').doc(userId).delete().catch(() => { });
        return;
    }
    const before = event.data?.before?.data();
    const fields = ['displayName', 'photoURL', 'points'];
    const changed = !before || fields.some((f) => before[f] !== after[f]);
    if (!changed)
        return;
    await shared_1.db.collection('leaderboard_public').doc(userId).set({
        displayName: after.displayName ?? 'Usuário',
        photoURL: after.photoURL ?? null,
        points: after.points ?? 0,
    }).catch(() => { });
});
//# sourceMappingURL=maintenance.js.map