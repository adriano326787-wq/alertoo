import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import * as geohash from 'ngeohash';
import {
  db,
  RESEND_API_KEY,
  MAX_FCM_TOKEN_LEN,
  VERIFICATION_EMAIL_COOLDOWN_MS,
  readSecret,
  assertAuth,
  checkAppToken,
} from './shared';

// ─── E-mail de verificacao via Resend ────────────────────────────────────────
export const sendVerificationEmail = onCall(
  { secrets: [RESEND_API_KEY], region: 'us-central1' },
  async (request) => {
    checkAppToken(request, 'sendVerificationEmail');
    const uid = request.auth?.uid;
    assertAuth(uid);

    const userRecord = await getAuth().getUser(uid);
    const email = userRecord.email;
    if (!email) throw new HttpsError('failed-precondition', 'Usuario sem e-mail cadastrado.');
    if (userRecord.emailVerified) return { sent: false, reason: 'already_verified' };

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const lastSentAt = userSnap.data()?.lastVerificationEmailAt as number | undefined;
    if (lastSentAt && Date.now() - lastSentAt < VERIFICATION_EMAIL_COOLDOWN_MS) {
      throw new HttpsError('resource-exhausted', 'Aguarde antes de reenviar o e-mail.');
    }

    const link = await getAuth().generateEmailVerificationLink(email, {
      url: 'https://alertoo.com.br/',
    });

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${readSecret(RESEND_API_KEY)}`,
      },
      body: JSON.stringify({
        from: 'Alertoo <noreply@alertoo.com.br>',
        to: [email],
        subject: 'Confirme seu e-mail - Alertoo',
        html: buildVerificationEmailHtml(userRecord.displayName ?? '', link),
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Resend: falha ao enviar e-mail de verificacao', resp.status, txt);
      throw new HttpsError('internal', 'Falha ao enviar e-mail de verificacao.');
    }

    await userRef.set({ lastVerificationEmailAt: Date.now() }, { merge: true });

    return { sent: true };
  },
);

function buildVerificationEmailHtml(displayName: string, link: string): string {
  const greeting = displayName ? `Ola, ${displayName}!` : 'Ola!';
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background:#fff;">
    <div style="text-align:center; margin-bottom: 24px;">
      <span style="display:inline-block; width:56px; height:56px; line-height:56px; border-radius:50%; background:#FFF0E8; font-size:28px;">&#128276;</span>
      <h1 style="font-size:22px; font-weight:800; color:#1a1a1a; margin: 12px 0 0;">Alertoo</h1>
    </div>
    <h2 style="font-size:20px; color:#1a1a1a;">${greeting}</h2>
    <p style="font-size:15px; color:#475569; line-height:1.6;">
      Confirme seu e-mail para ativar sua conta e comecar a receber alertas em tempo real da sua regiao.
    </p>
    <div style="text-align:center; margin: 32px 0;">
      <a href="${link}" style="background:#FF5722; color:#fff; text-decoration:none; font-weight:700; font-size:16px; padding:14px 32px; border-radius:12px; display:inline-block;">
        Confirmar e-mail
      </a>
    </div>
    <p style="font-size:12px; color:#94A3B8; line-height:1.6;">
      Se voce nao criou uma conta no Alertoo, pode ignorar este e-mail.<br>
      Se o botao nao funcionar, copie e cole este link no navegador:<br>
      <a href="${link}" style="color:#FF5722; word-break:break-all;">${link}</a>
    </p>
  </div>`;
}

// ─── Registro de token FCM ────────────────────────────────────────────────────
export const registerFcmToken = onCall(
  { region: 'us-central1' },
  async (request) => {
    checkAppToken(request, 'registerFcmToken');
    const uid = request.auth?.uid;
    assertAuth(uid);

    const token = request.data?.token as string | undefined;
    if (!token || typeof token !== 'string') {
      throw new HttpsError('invalid-argument', 'Token invalido.');
    }
    if (token.length > MAX_FCM_TOKEN_LEN) {
      throw new HttpsError('invalid-argument', 'Token FCM com tamanho invalido.');
    }
    if (!/^[a-zA-Z0-9\-_:]+$/.test(token)) {
      throw new HttpsError('invalid-argument', 'Token FCM com caracteres invalidos.');
    }

    await db.collection('users').doc(uid).update({
      fcmTokens: FieldValue.arrayUnion(token),
      fcmUpdatedAt: FieldValue.serverTimestamp(),
    }).catch(async () => {
      await db.collection('users').doc(uid).set({
        fcmTokens: [token],
        fcmUpdatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return { ok: true };
  },
);

// ─── Envio de notificação FCM para usuários de um estado ─────────────────────
async function notifyStateUsers(params: {
  stateUF: string;
  title: string;
  body: string;
  data: Record<string, string>;
  excludeUid?: string;
}): Promise<void> {
  try {
    const { stateUF, title, body, data, excludeUid } = params;

    const usersSnap = await db.collection('users')
      .where('filterStateUF', '==', stateUF)
      .limit(100)
      .get();

    const tokens: string[] = [];
    usersSnap.docs.forEach((d) => {
      if (d.id === excludeUid) return;
      const fcmTokens = d.data().fcmTokens as string[] | undefined;
      if (Array.isArray(fcmTokens)) tokens.push(...fcmTokens);
    });

    if (tokens.length === 0) return;

    const BATCH = 500;
    for (let i = 0; i < tokens.length; i += BATCH) {
      const chunk = tokens.slice(i, i + BATCH);
      await getMessaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data,
        android: { priority: 'high', notification: { channelId: 'default' } },
      }).catch((e) => console.error('[FCM] sendEachForMulticast error:', e));
    }
  } catch (e) {
    console.error('[FCM] notifyStateUsers error:', e);
  }
}

// ─── Notificação de "Lei Seca por perto" (raio de ~5km via geohash) ──────────
const NEARBY_RADIUS_KM = 5;
const GEOHASH_PRECISION = 5;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function notifyNearbyDrunkcheckUsers(params: {
  lat: number;
  lon: number;
  title: string;
  body: string;
  data: Record<string, string>;
  excludeUid?: string;
}): Promise<void> {
  try {
    const { lat, lon, title, body, data, excludeUid } = params;

    const centerCell = geohash.encode(lat, lon, GEOHASH_PRECISION);
    const neighborCells = Object.values(geohash.neighbors(centerCell)) as string[];
    const cells = [centerCell, ...neighborCells];

    const tokens: string[] = [];
    const seenUids = new Set<string>();

    for (const cell of cells) {
      const snap = await db.collection('users')
        .where('geohash5', '==', cell)
        .limit(200)
        .get();

      for (const d of snap.docs) {
        if (d.id === excludeUid || seenUids.has(d.id)) continue;
        seenUids.add(d.id);

        const u = d.data();
        if (u.notifPrefs?.nearbyDrunkcheckAlerts === false) continue;

        const uLat = u.lastLat as number | undefined;
        const uLon = u.lastLon as number | undefined;
        if (typeof uLat !== 'number' || typeof uLon !== 'number') continue;
        if (haversineKm(lat, lon, uLat, uLon) > NEARBY_RADIUS_KM) continue;

        const fcmTokens = u.fcmTokens as string[] | undefined;
        if (Array.isArray(fcmTokens)) tokens.push(...fcmTokens);
      }
    }

    if (tokens.length === 0) return;

    const BATCH = 500;
    for (let i = 0; i < tokens.length; i += BATCH) {
      const chunk = tokens.slice(i, i + BATCH);
      await getMessaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data,
        android: { priority: 'high', notification: { channelId: 'alerts' } },
      }).catch((e) => console.error('[FCM] sendEachForMulticast error:', e));
    }
  } catch (e) {
    console.error('[FCM] notifyNearbyDrunkcheckUsers error:', e);
  }
}

// ─── Notifica usuários ao criar road event ───────────────────────────────────
export const notifyOnRoadEvent = onDocumentCreated(
  { document: 'events/{eventId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const stateUF = data.stateUF as string | undefined;

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
  },
);

// ─── Lembrete diário de blitz/lei seca ──────────────────────────────────────
function getSaoPauloParts(): { date: string; hm: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hm: `${get('hour')}:${get('minute')}`,
  };
}

function randomBlitzTargetTime(): string {
  const totalMinutes = Math.floor(Math.random() * 120);
  const hour = 20 + Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export const blitzReminderScheduler = onSchedule(
  { schedule: '*/15 20-21 * * *', region: 'us-central1', timeZone: 'America/Sao_Paulo' },
  async () => {
    const { date: today, hm: now } = getSaoPauloParts();
    const campaignRef = db.collection('notification_campaigns').doc('blitz_reminder');
    const campaignSnap = await campaignRef.get();
    const campaign = campaignSnap.data() ?? {};

    let targetTime: string = campaign.targetTime;
    if (campaign.scheduledDate !== today) {
      targetTime = randomBlitzTargetTime();
      await campaignRef.set({ scheduledDate: today, targetTime, sentDate: null }, { merge: true });
      console.log(`[blitzReminder] novo horário-alvo sorteado para ${today}: ${targetTime}`);
    }

    if (campaign.sentDate === today || now < targetTime) return;

    const tokens: string[] = [];
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (;;) {
      let q = db.collection('users')
        .orderBy('__name__')
        .limit(500);
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.notifPrefs?.engagementReminders === false) return;
        const fcmTokens = data.fcmTokens as string[] | undefined;
        if (Array.isArray(fcmTokens)) tokens.push(...fcmTokens);
      });
      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < 500) break;
    }

    if (tokens.length > 0) {
      const BATCH = 500;
      for (let i = 0; i < tokens.length; i += BATCH) {
        const chunk = tokens.slice(i, i + BATCH);
        await getMessaging().sendEachForMulticast({
          tokens: chunk,
          notification: {
            title: '🚔 Viu alguma blitz hoje?',
            body: 'Ajude outros motoristas — reporte blitz ou lei seca na sua região.',
          },
          data: { action: 'open_add_road_event', category: 'drunkcheck' },
          android: { priority: 'high', notification: { channelId: 'default' } },
        }).catch((e) => console.error('[FCM] blitzReminder sendEachForMulticast error:', e));
      }
    }

    await campaignRef.set({ sentDate: today }, { merge: true });
    console.log(`[blitzReminder] broadcast enviado para ${tokens.length} token(s) em ${today} ${now}.`);
  },
);

// ─── Lembrete de streak — avisa quem tem streak ativo mas não usou hoje ──────
// Roda à noite (21h SP); query direta por lastActiveDate == ontem é bem mais
// barata que paginar todos os usuários (diferente do blitzReminder, que
// precisa avisar todo mundo e por isso pagina a coleção inteira).
export const streakReminderScheduler = onSchedule(
  { schedule: '0 21 * * *', region: 'us-central1', timeZone: 'America/Sao_Paulo' },
  async () => {
    const { date: today } = getSaoPauloParts();
    const yesterday = addDaysToDateKey(today, -1);

    const snap = await db.collection('users')
      .where('lastActiveDate', '==', yesterday)
      .where('currentStreak', '>=', 2) // streak de 1 dia ainda não é "perder algo" — não vale alarme
      .limit(2000)
      .get();

    if (snap.empty) {
      console.log('[streakReminder] nenhum usuário com streak em risco hoje.');
      return;
    }

    let sent = 0;
    const BATCH = 500;
    const docs = snap.docs.filter((d) => d.data().notifPrefs?.engagementReminders !== false);

    for (let i = 0; i < docs.length; i += BATCH) {
      const chunk = docs.slice(i, i + BATCH);
      const tokens = chunk.flatMap((d) => (d.data().fcmTokens as string[] | undefined) ?? []);
      if (tokens.length === 0) continue;

      // Mensagem varia pelo streak médio do lote seria mais preciso por usuário,
      // mas FCM multicast manda o mesmo corpo pra todos — generaliza pra "seu streak".
      await getMessaging().sendEachForMulticast({
        tokens,
        notification: {
          title: '🔥 Seu streak quebra à meia-noite!',
          body: 'Faça qualquer report ou confirmação hoje pra manter sua sequência de dias ativos.',
        },
        data: { action: 'open_map' },
        android: { priority: 'high', notification: { channelId: 'default' } },
      }).catch((e) => console.error('[FCM] streakReminder sendEachForMulticast error:', e));
      sent += tokens.length;
    }

    console.log(`[streakReminder] ${docs.length} usuário(s) em risco, ${sent} token(s) notificados.`);
  },
);

/** Soma (ou subtrai) dias de uma chave 'YYYY-MM-DD', retornando outra chave no mesmo formato. */
function addDaysToDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// ─── Rate limiting server-side: road events ──────────────────────────────────
export const onRoadEventCreated = onDocumentCreated(
  { document: 'events/{eventId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const userId = data.userId as string | undefined;
    if (!userId || userId === 'anonymous') return;

    await db.collection('users').doc(userId).update({
      lastRoadEventAt: FieldValue.serverTimestamp(),
    }).catch(() => {});
  },
);

// ─── Rate limiting server-side: entertainment events ─────────────────────────
export const onEntertainmentEventCreated = onDocumentCreated(
  { document: 'entertainment_events/{eventId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const userId = data.userId as string | undefined;
    if (!userId || userId === 'anonymous') return;

    await db.collection('users').doc(userId).update({
      lastEntEventAt: FieldValue.serverTimestamp(),
    }).catch(() => {});
  },
);

// ─── Notifica o criador do evento ao receber um novo comentário ──────────────
export const onEntertainmentCommentCreated = onDocumentCreated(
  { document: 'entertainment_events/{eventId}/comments/{commentId}', region: 'us-central1' },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const { eventId } = event.params;

    const commenterUid = data.userId as string | undefined;
    if (commenterUid && commenterUid !== 'anonymous') {
      db.collection('users').doc(commenterUid).update({
        lastCommentAt: FieldValue.serverTimestamp(),
      }).catch(() => {});
    }

    const eventSnap = await db.collection('entertainment_events').doc(eventId).get();
    const eventData = eventSnap.data();
    if (!eventData) return;

    const ownerId = eventData.userId as string | undefined;
    const commenterId = data.userId as string | undefined;
    if (!ownerId || ownerId === 'anonymous' || ownerId === commenterId) return;

    const ownerSnap = await db.collection('users').doc(ownerId).get();
    const ownerData = ownerSnap.data();
    if (!ownerData) return;
    if (ownerData.notifPrefs?.eventEngagementUpdates === false) return;
    const fcmTokens = ownerData.fcmTokens as string[] | undefined;
    if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) return;

    await getMessaging().sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title: '💬 Novo comentário no seu evento',
        body: `${data.displayName ?? 'Alguém'} comentou em "${eventData.title}".`,
      },
      data: { eventId, eventType: 'entertainment' },
      android: { priority: 'high', notification: { channelId: 'default' } },
    }).catch((e) => console.error('[FCM] onEntertainmentCommentCreated error:', e));
  },
);

// ─── Loop de feedback: avisa o autor quando alguém confirma o report dele ───
// Hoje o autor ganha +5 pontos (POINTS.CONFIRMATION_RECEIVED, awardPoints
// chamado por quem confirma em eventsStore.ts/radarsStore.ts) mas nunca fica
// sabendo em tempo real — só descobre se for checar o perfil. Isso fecha
// esse loop com uma notificação no momento da confirmação.

const ROAD_CATEGORY_LABELS: Record<string, string> = {
  drunkcheck: 'Lei Seca',
  policeblitz: 'blitz',
  accident: 'acidente',
  roadwork: 'obras',
  flood: 'alagamento',
  closure: 'interdição',
  traffic: 'congestionamento',
  hazard: 'perigo na via',
  radar: 'radar',
};

export const onRoadEventConfirmed = onDocumentWritten(
  { document: 'events/{eventId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return; // criação ou deleção, não é uma confirmação

    const prevConfirmations = before.confirmations ?? 0;
    const newConfirmations = after.confirmations ?? 0;
    if (newConfirmations <= prevConfirmations) return; // só nos interessa quando AUMENTOU

    const ownerId = after.userId as string | undefined;
    if (!ownerId || ownerId === 'anonymous') return;

    const ownerSnap = await db.collection('users').doc(ownerId).get();
    const ownerData = ownerSnap.data();
    if (!ownerData) return;
    if (ownerData.notifPrefs?.eventEngagementUpdates === false) return;
    const fcmTokens = ownerData.fcmTokens as string[] | undefined;
    if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) return;

    const categoryLabel = ROAD_CATEGORY_LABELS[after.category as string] ?? 'alerta';

    await getMessaging().sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title: '✅ Alguém confirmou seu alerta',
        body: newConfirmations === 1
          ? `Seu report de ${categoryLabel} acabou de ser confirmado por outro motorista.`
          : `Seu report de ${categoryLabel} já foi confirmado ${newConfirmations} vezes — você está ajudando muita gente!`,
      },
      data: { eventId: event.params.eventId, eventType: 'road' },
      android: { priority: 'high', notification: { channelId: 'default' } },
    }).catch((e) => console.error('[FCM] onRoadEventConfirmed error:', e));
  },
);

export const onRadarConfirmed = onDocumentWritten(
  { document: 'radars/{radarId}', region: 'us-central1' },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const prevConfirmations = before.confirmations ?? 0;
    const newConfirmations = after.confirmations ?? 0;
    if (newConfirmations <= prevConfirmations) return;

    const ownerId = after.createdBy as string | undefined;
    if (!ownerId || ownerId === 'anonymous') return;

    const ownerSnap = await db.collection('users').doc(ownerId).get();
    const ownerData = ownerSnap.data();
    if (!ownerData) return;
    if (ownerData.notifPrefs?.eventEngagementUpdates === false) return;
    const fcmTokens = ownerData.fcmTokens as string[] | undefined;
    if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) return;

    await getMessaging().sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title: '✅ Alguém confirmou seu radar',
        body: newConfirmations === 1
          ? 'Outro motorista confirmou que seu radar reportado ainda está lá.'
          : `Seu radar já foi confirmado ${newConfirmations} vezes — você está ajudando muita gente!`,
      },
      data: { radarId: event.params.radarId, eventType: 'radar' },
      android: { priority: 'high', notification: { channelId: 'default' } },
    }).catch((e) => console.error('[FCM] onRadarConfirmed error:', e));
  },
);
