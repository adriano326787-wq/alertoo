"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRadarConfirmed = exports.onRoadEventConfirmed = exports.onEntertainmentCommentCreated = exports.onEntertainmentEventCreated = exports.onRoadEventCreated = exports.streakReminderScheduler = exports.blitzReminderScheduler = exports.notifyOnRoadEvent = exports.registerFcmToken = exports.sendVerificationEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_2 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const messaging_1 = require("firebase-admin/messaging");
const geohash = __importStar(require("ngeohash"));
const shared_1 = require("./shared");
const i18nNotifications_1 = require("./utils/i18nNotifications");
// ─── E-mail de verificacao via Resend ────────────────────────────────────────
exports.sendVerificationEmail = (0, https_1.onCall)({ secrets: [shared_1.RESEND_API_KEY], region: 'us-central1' }, async (request) => {
    (0, shared_1.checkAppToken)(request, 'sendVerificationEmail');
    const uid = request.auth?.uid;
    (0, shared_1.assertAuth)(uid);
    const userRecord = await (0, auth_1.getAuth)().getUser(uid);
    const email = userRecord.email;
    if (!email)
        throw new https_1.HttpsError('failed-precondition', 'Usuario sem e-mail cadastrado.');
    if (userRecord.emailVerified)
        return { sent: false, reason: 'already_verified' };
    const userRef = shared_1.db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data();
    const lastSentAt = userData?.lastVerificationEmailAt;
    if (lastSentAt && Date.now() - lastSentAt < shared_1.VERIFICATION_EMAIL_COOLDOWN_MS) {
        throw new https_1.HttpsError('resource-exhausted', 'Aguarde antes de reenviar o e-mail.');
    }
    const lang = (0, i18nNotifications_1.resolveLangForCountry)(userData?.countryCode);
    const strings = (0, i18nNotifications_1.verificationEmailStrings)(lang, userRecord.displayName ?? '');
    const link = await (0, auth_1.getAuth)().generateEmailVerificationLink(email, {
        url: 'https://alertoo.com.br/',
    });
    const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(0, shared_1.readSecret)(shared_1.RESEND_API_KEY)}`,
        },
        body: JSON.stringify({
            from: 'Alertoo <noreply@alertoo.com.br>',
            to: [email],
            subject: strings.subject,
            html: buildVerificationEmailHtml(strings, link),
        }),
    });
    if (!resp.ok) {
        const txt = await resp.text();
        console.error('Resend: falha ao enviar e-mail de verificacao', resp.status, txt);
        throw new https_1.HttpsError('internal', 'Falha ao enviar e-mail de verificacao.');
    }
    await userRef.set({ lastVerificationEmailAt: Date.now() }, { merge: true });
    return { sent: true };
});
function buildVerificationEmailHtml(strings, link) {
    return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background:#fff;">
    <div style="text-align:center; margin-bottom: 24px;">
      <span style="display:inline-block; width:56px; height:56px; line-height:56px; border-radius:50%; background:#FFF0E8; font-size:28px;">&#128276;</span>
      <h1 style="font-size:22px; font-weight:800; color:#1a1a1a; margin: 12px 0 0;">Alertoo</h1>
    </div>
    <h2 style="font-size:20px; color:#1a1a1a;">${strings.greeting}</h2>
    <p style="font-size:15px; color:#475569; line-height:1.6;">
      ${strings.body}
    </p>
    <div style="text-align:center; margin: 32px 0;">
      <a href="${link}" style="background:#FF5722; color:#fff; text-decoration:none; font-weight:700; font-size:16px; padding:14px 32px; border-radius:12px; display:inline-block;">
        ${strings.button}
      </a>
    </div>
    <p style="font-size:12px; color:#94A3B8; line-height:1.6;">
      ${strings.footerIgnore}<br>
      ${strings.footerCopyLink}<br>
      <a href="${link}" style="color:#FF5722; word-break:break-all;">${link}</a>
    </p>
  </div>`;
}
// ─── Registro de token FCM ────────────────────────────────────────────────────
exports.registerFcmToken = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    (0, shared_1.checkAppToken)(request, 'registerFcmToken');
    const uid = request.auth?.uid;
    (0, shared_1.assertAuth)(uid);
    const token = request.data?.token;
    if (!token || typeof token !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Token invalido.');
    }
    if (token.length > shared_1.MAX_FCM_TOKEN_LEN) {
        throw new https_1.HttpsError('invalid-argument', 'Token FCM com tamanho invalido.');
    }
    if (!/^[a-zA-Z0-9\-_:]+$/.test(token)) {
        throw new https_1.HttpsError('invalid-argument', 'Token FCM com caracteres invalidos.');
    }
    await shared_1.db.collection('users').doc(uid).update({
        fcmTokens: firestore_2.FieldValue.arrayUnion(token),
        fcmUpdatedAt: firestore_2.FieldValue.serverTimestamp(),
    }).catch(async () => {
        await shared_1.db.collection('users').doc(uid).set({
            fcmTokens: [token],
            fcmUpdatedAt: firestore_2.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return { ok: true };
});
// ─── Envio de notificação FCM para usuários de um estado ─────────────────────
async function notifyStateUsers(params) {
    try {
        const { stateUF, title, body, data, excludeUid } = params;
        const usersSnap = await shared_1.db.collection('users')
            .where('filterStateUF', '==', stateUF)
            .limit(100)
            .get();
        const tokens = [];
        usersSnap.docs.forEach((d) => {
            if (d.id === excludeUid)
                return;
            const fcmTokens = d.data().fcmTokens;
            if (Array.isArray(fcmTokens))
                tokens.push(...fcmTokens);
        });
        if (tokens.length === 0)
            return;
        const BATCH = 500;
        for (let i = 0; i < tokens.length; i += BATCH) {
            const chunk = tokens.slice(i, i + BATCH);
            await (0, messaging_1.getMessaging)().sendEachForMulticast({
                tokens: chunk,
                notification: { title, body },
                data,
                android: { priority: 'high', notification: { channelId: 'default' } },
            }).catch((e) => console.error('[FCM] sendEachForMulticast error:', e));
        }
    }
    catch (e) {
        console.error('[FCM] notifyStateUsers error:', e);
    }
}
// ─── Notificação de "Lei Seca por perto" (raio de ~5km via geohash) ──────────
const NEARBY_RADIUS_KM = 5;
const GEOHASH_PRECISION = 5;
function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
async function notifyNearbyDrunkcheckUsers(params) {
    try {
        const { lat, lon, title, body, data, excludeUid } = params;
        const centerCell = geohash.encode(lat, lon, GEOHASH_PRECISION);
        const neighborCells = Object.values(geohash.neighbors(centerCell));
        const cells = [centerCell, ...neighborCells];
        const tokens = [];
        const seenUids = new Set();
        for (const cell of cells) {
            const snap = await shared_1.db.collection('users')
                .where('geohash5', '==', cell)
                .limit(200)
                .get();
            for (const d of snap.docs) {
                if (d.id === excludeUid || seenUids.has(d.id))
                    continue;
                seenUids.add(d.id);
                const u = d.data();
                if (u.notifPrefs?.nearbyDrunkcheckAlerts === false)
                    continue;
                const uLat = u.lastLat;
                const uLon = u.lastLon;
                if (typeof uLat !== 'number' || typeof uLon !== 'number')
                    continue;
                if (haversineKm(lat, lon, uLat, uLon) > NEARBY_RADIUS_KM)
                    continue;
                const fcmTokens = u.fcmTokens;
                if (Array.isArray(fcmTokens))
                    tokens.push(...fcmTokens);
            }
        }
        if (tokens.length === 0)
            return;
        const BATCH = 500;
        for (let i = 0; i < tokens.length; i += BATCH) {
            const chunk = tokens.slice(i, i + BATCH);
            await (0, messaging_1.getMessaging)().sendEachForMulticast({
                tokens: chunk,
                notification: { title, body },
                data,
                android: { priority: 'high', notification: { channelId: 'alerts' } },
            }).catch((e) => console.error('[FCM] sendEachForMulticast error:', e));
        }
    }
    catch (e) {
        console.error('[FCM] notifyNearbyDrunkcheckUsers error:', e);
    }
}
// ─── Notifica usuários ao criar road event ───────────────────────────────────
exports.notifyOnRoadEvent = (0, firestore_1.onDocumentCreated)({ document: 'events/{eventId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const stateUF = data.stateUF;
    if (stateUF) {
        await notifyStateUsers({
            stateUF,
            title: `${data.category === 'accident' ? '🚨' : '🚦'} ${data.title ?? 'Novo alerta'}`,
            body: data.cityName ? `${data.cityName} · ${stateUF}` : stateUF,
            data: { eventId: event.params.eventId, eventType: 'road' },
            excludeUid: data.userId,
        });
    }
    if (data.category === 'drunkcheck'
        && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        await notifyNearbyDrunkcheckUsers({
            lat: data.latitude,
            lon: data.longitude,
            title: '🍺 Lei Seca reportada por perto',
            body: data.neighborhood
                ? `${data.neighborhood}${data.cityName ? ' · ' + data.cityName : ''}`
                : (data.cityName ?? 'Próximo a você'),
            data: { eventId: event.params.eventId, eventType: 'road' },
            excludeUid: data.userId,
        });
    }
});
// ─── Lembrete diário de blitz/lei seca ──────────────────────────────────────
function getSaoPauloParts() {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
    return {
        date: `${get('year')}-${get('month')}-${get('day')}`,
        hm: `${get('hour')}:${get('minute')}`,
    };
}
function randomBlitzTargetTime() {
    const totalMinutes = Math.floor(Math.random() * 120);
    const hour = 20 + Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
/**
 * Envia notificação em massa respeitando o idioma de cada usuário — um
 * multicast do FCM manda o MESMO título/corpo pra todos os tokens, então
 * pra localizar é preciso agrupar por idioma primeiro e mandar N multicasts
 * (um por idioma presente no lote), em vez de 1 multicast global em português.
 */
async function sendMulticastPerLang(tokensByLang, getNotification, data, channelId, logLabel) {
    let sent = 0;
    const BATCH = 500;
    for (const [lang, tokens] of Object.entries(tokensByLang)) {
        if (!tokens || tokens.length === 0)
            continue;
        const notification = getNotification(lang);
        for (let i = 0; i < tokens.length; i += BATCH) {
            const chunk = tokens.slice(i, i + BATCH);
            await (0, messaging_1.getMessaging)().sendEachForMulticast({
                tokens: chunk,
                notification,
                data,
                android: { priority: 'high', notification: { channelId } },
            }).catch((e) => console.error(`[FCM] ${logLabel} sendEachForMulticast error:`, e));
            sent += chunk.length;
        }
    }
    return sent;
}
exports.blitzReminderScheduler = (0, scheduler_1.onSchedule)({ schedule: '*/15 20-21 * * *', region: 'us-central1', timeZone: 'America/Sao_Paulo' }, async () => {
    const { date: today, hm: now } = getSaoPauloParts();
    const campaignRef = shared_1.db.collection('notification_campaigns').doc('blitz_reminder');
    const campaignSnap = await campaignRef.get();
    const campaign = campaignSnap.data() ?? {};
    let targetTime = campaign.targetTime;
    if (campaign.scheduledDate !== today) {
        targetTime = randomBlitzTargetTime();
        await campaignRef.set({ scheduledDate: today, targetTime, sentDate: null }, { merge: true });
        console.log(`[blitzReminder] novo horário-alvo sorteado para ${today}: ${targetTime}`);
    }
    if (campaign.sentDate === today || now < targetTime)
        return;
    const tokensByLang = {};
    let totalTokens = 0;
    let lastDoc;
    for (;;) {
        let q = shared_1.db.collection('users')
            .orderBy('__name__')
            .limit(500);
        if (lastDoc)
            q = q.startAfter(lastDoc);
        const snap = await q.get();
        if (snap.empty)
            break;
        snap.docs.forEach((d) => {
            const data = d.data();
            if (data.notifPrefs?.engagementReminders === false)
                return;
            const fcmTokens = data.fcmTokens;
            if (!Array.isArray(fcmTokens) || fcmTokens.length === 0)
                return;
            const lang = (0, i18nNotifications_1.resolveLangForCountry)(data.countryCode);
            (tokensByLang[lang] ?? (tokensByLang[lang] = [])).push(...fcmTokens);
            totalTokens += fcmTokens.length;
        });
        lastDoc = snap.docs[snap.docs.length - 1];
        if (snap.size < 500)
            break;
    }
    await sendMulticastPerLang(tokensByLang, (lang) => i18nNotifications_1.NOTIF_STATIC.blitzReminder[lang], { action: 'open_add_road_event', category: 'drunkcheck' }, 'default', 'blitzReminder');
    await campaignRef.set({ sentDate: today }, { merge: true });
    console.log(`[blitzReminder] broadcast enviado para ${totalTokens} token(s) em ${today} ${now}.`);
});
// ─── Lembrete de streak — avisa quem tem streak ativo mas não usou hoje ──────
// Roda à noite (21h SP); query direta por lastActiveDate == ontem é bem mais
// barata que paginar todos os usuários (diferente do blitzReminder, que
// precisa avisar todo mundo e por isso pagina a coleção inteira).
exports.streakReminderScheduler = (0, scheduler_1.onSchedule)({ schedule: '0 21 * * *', region: 'us-central1', timeZone: 'America/Sao_Paulo' }, async () => {
    const { date: today } = getSaoPauloParts();
    const yesterday = addDaysToDateKey(today, -1);
    const snap = await shared_1.db.collection('users')
        .where('lastActiveDate', '==', yesterday)
        .where('currentStreak', '>=', 2) // streak de 1 dia ainda não é "perder algo" — não vale alarme
        .limit(2000)
        .get();
    if (snap.empty) {
        console.log('[streakReminder] nenhum usuário com streak em risco hoje.');
        return;
    }
    const docs = snap.docs.filter((d) => d.data().notifPrefs?.engagementReminders !== false);
    const tokensByLang = {};
    docs.forEach((d) => {
        const data = d.data();
        const fcmTokens = data.fcmTokens;
        if (!Array.isArray(fcmTokens) || fcmTokens.length === 0)
            return;
        const lang = (0, i18nNotifications_1.resolveLangForCountry)(data.countryCode);
        (tokensByLang[lang] ?? (tokensByLang[lang] = [])).push(...fcmTokens);
    });
    const sent = await sendMulticastPerLang(tokensByLang, (lang) => i18nNotifications_1.NOTIF_STATIC.streakReminder[lang], { action: 'open_map' }, 'default', 'streakReminder');
    console.log(`[streakReminder] ${docs.length} usuário(s) em risco, ${sent} token(s) notificados.`);
});
/** Soma (ou subtrai) dias de uma chave 'YYYY-MM-DD', retornando outra chave no mesmo formato. */
function addDaysToDateKey(key, days) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}
// ─── Rate limiting server-side: road events ──────────────────────────────────
exports.onRoadEventCreated = (0, firestore_1.onDocumentCreated)({ document: 'events/{eventId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const userId = data.userId;
    if (!userId || userId === 'anonymous')
        return;
    await shared_1.db.collection('users').doc(userId).update({
        lastRoadEventAt: firestore_2.FieldValue.serverTimestamp(),
    }).catch(() => { });
});
// ─── Rate limiting server-side: entertainment events ─────────────────────────
exports.onEntertainmentEventCreated = (0, firestore_1.onDocumentCreated)({ document: 'entertainment_events/{eventId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const userId = data.userId;
    if (!userId || userId === 'anonymous')
        return;
    await shared_1.db.collection('users').doc(userId).update({
        lastEntEventAt: firestore_2.FieldValue.serverTimestamp(),
    }).catch(() => { });
});
// ─── Notifica o criador do evento ao receber um novo comentário ──────────────
exports.onEntertainmentCommentCreated = (0, firestore_1.onDocumentCreated)({ document: 'entertainment_events/{eventId}/comments/{commentId}', region: 'us-central1' }, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const { eventId } = event.params;
    const commenterUid = data.userId;
    if (commenterUid && commenterUid !== 'anonymous') {
        shared_1.db.collection('users').doc(commenterUid).update({
            lastCommentAt: firestore_2.FieldValue.serverTimestamp(),
        }).catch(() => { });
    }
    const eventSnap = await shared_1.db.collection('entertainment_events').doc(eventId).get();
    const eventData = eventSnap.data();
    if (!eventData)
        return;
    const ownerId = eventData.userId;
    const commenterId = data.userId;
    if (!ownerId || ownerId === 'anonymous' || ownerId === commenterId)
        return;
    const ownerSnap = await shared_1.db.collection('users').doc(ownerId).get();
    const ownerData = ownerSnap.data();
    if (!ownerData)
        return;
    if (ownerData.notifPrefs?.eventEngagementUpdates === false)
        return;
    const fcmTokens = ownerData.fcmTokens;
    if (!Array.isArray(fcmTokens) || fcmTokens.length === 0)
        return;
    const lang = (0, i18nNotifications_1.resolveLangForCountry)(ownerData.countryCode);
    await (0, messaging_1.getMessaging)().sendEachForMulticast({
        tokens: fcmTokens,
        notification: {
            title: (0, i18nNotifications_1.entertainmentCommentTitle)(lang),
            body: (0, i18nNotifications_1.entertainmentCommentBody)(lang, data.displayName, eventData.title),
        },
        data: { eventId, eventType: 'entertainment' },
        android: { priority: 'high', notification: { channelId: 'default' } },
    }).catch((e) => console.error('[FCM] onEntertainmentCommentCreated error:', e));
});
// ─── Loop de feedback: avisa o autor quando alguém confirma o report dele ───
// Hoje o autor ganha +5 pontos (POINTS.CONFIRMATION_RECEIVED, awardPoints
// chamado por quem confirma em eventsStore.ts/radarsStore.ts) mas nunca fica
// sabendo em tempo real — só descobre se for checar o perfil. Isso fecha
// esse loop com uma notificação no momento da confirmação.
exports.onRoadEventConfirmed = (0, firestore_1.onDocumentWritten)({ document: 'events/{eventId}', region: 'us-central1' }, async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after)
        return; // criação ou deleção, não é uma confirmação
    const prevConfirmations = before.confirmations ?? 0;
    const newConfirmations = after.confirmations ?? 0;
    if (newConfirmations <= prevConfirmations)
        return; // só nos interessa quando AUMENTOU
    const ownerId = after.userId;
    if (!ownerId || ownerId === 'anonymous')
        return;
    const ownerSnap = await shared_1.db.collection('users').doc(ownerId).get();
    const ownerData = ownerSnap.data();
    if (!ownerData)
        return;
    if (ownerData.notifPrefs?.eventEngagementUpdates === false)
        return;
    const fcmTokens = ownerData.fcmTokens;
    if (!Array.isArray(fcmTokens) || fcmTokens.length === 0)
        return;
    const lang = (0, i18nNotifications_1.resolveLangForCountry)(ownerData.countryCode);
    const catLabel = (0, i18nNotifications_1.categoryLabel)(lang, after.category);
    await (0, messaging_1.getMessaging)().sendEachForMulticast({
        tokens: fcmTokens,
        notification: {
            title: (0, i18nNotifications_1.roadEventConfirmedTitle)(lang),
            body: (0, i18nNotifications_1.roadEventConfirmedBody)(lang, catLabel, newConfirmations),
        },
        data: { eventId: event.params.eventId, eventType: 'road' },
        android: { priority: 'high', notification: { channelId: 'default' } },
    }).catch((e) => console.error('[FCM] onRoadEventConfirmed error:', e));
});
exports.onRadarConfirmed = (0, firestore_1.onDocumentWritten)({ document: 'radars/{radarId}', region: 'us-central1' }, async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after)
        return;
    const prevConfirmations = before.confirmations ?? 0;
    const newConfirmations = after.confirmations ?? 0;
    if (newConfirmations <= prevConfirmations)
        return;
    const ownerId = after.createdBy;
    if (!ownerId || ownerId === 'anonymous')
        return;
    const ownerSnap = await shared_1.db.collection('users').doc(ownerId).get();
    const ownerData = ownerSnap.data();
    if (!ownerData)
        return;
    if (ownerData.notifPrefs?.eventEngagementUpdates === false)
        return;
    const fcmTokens = ownerData.fcmTokens;
    if (!Array.isArray(fcmTokens) || fcmTokens.length === 0)
        return;
    const lang = (0, i18nNotifications_1.resolveLangForCountry)(ownerData.countryCode);
    await (0, messaging_1.getMessaging)().sendEachForMulticast({
        tokens: fcmTokens,
        notification: {
            title: (0, i18nNotifications_1.radarConfirmedTitle)(lang),
            body: (0, i18nNotifications_1.radarConfirmedBody)(lang, newConfirmations),
        },
        data: { radarId: event.params.radarId, eventType: 'radar' },
        android: { priority: 'high', notification: { channelId: 'default' } },
    }).catch((e) => console.error('[FCM] onRadarConfirmed error:', e));
});
//# sourceMappingURL=notifications.js.map