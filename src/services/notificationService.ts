import { AppState } from 'react-native';
import { haversineDistance } from '../utils/geo';
import { t } from '../utils/i18n';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Raio para notificar (km)
export const NOTIFY_RADIUS_KM = 5;

// Carrega expo-notifications de forma segura (falha silenciosa em emuladores sem suporte)
function getNotifications() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch (_) {
    return null;
  }
}

let handlerSet = false;

function ensureHandler() {
  if (handlerSet) return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        // #20 — suppress OS banner when app is active (foreground); in-app toast handles it
        const inForeground = AppState.currentState === 'active';
        return {
          shouldShowBanner: !inForeground,
          shouldShowList: true,
          shouldPlaySound: !inForeground,
          shouldSetBadge: false,
        };
      },
    });
    handlerSet = true;
  } catch (_) {}
}

// Solicita permissão de notificações e registra token FCM (#1)
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const Notifications = getNotifications();
    if (!Notifications) return false;
    ensureHandler();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') {
      registerFcmToken().catch(() => {});
      return true;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      registerFcmToken().catch(() => {});
      return true;
    }
    return false;
  } catch (_) {
    return false;
  }
}

/**
 * Obtém o token FCM do dispositivo e salva no Firestore via Cloud Function.
 * Falha silenciosamente — não é crítica para o funcionamento do app.
 */
export async function registerFcmToken(): Promise<void> {
  try {
    const Notifications = getNotifications();
    if (!Notifications) return;

    // getExpoPushTokenAsync retorna token Expo; getDevicePushTokenAsync retorna FCM puro
    const tokenData = await Notifications.getDevicePushTokenAsync().catch(() => null);
    if (!tokenData?.data) return;

    // Usa imports do topo — getFunctions e httpsCallable já importados acima
    const { app } = await import('./firebase');
    const functions = getFunctions(app, 'us-central1');
    const registerToken = httpsCallable(functions, 'registerFcmToken');
    await registerToken({ token: tokenData.data });
  } catch (_) {
    // Falha silenciosa — token FCM não é crítico
  }
}

// Envia notificação local imediata
export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
  try {
    const Notifications = getNotifications();
    if (!Notifications) return;
    ensureHandler();
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {}, sound: true },
      trigger: null,
    });
  } catch (_) {}
}

// Verifica se evento está dentro do raio e notifica
export async function notifyIfNearby(params: {
  eventTitle: string;
  eventEmoji: string;
  eventType: 'road' | 'entertainment';
  eventId?: string;
  eventLat: number;
  eventLon: number;
  userLat: number;
  userLon: number;
}) {
  // #38 — guard against NaN/Infinity coordinates (bad GPS or missing data)
  if (!isFinite(params.userLat) || !isFinite(params.userLon) ||
      !isFinite(params.eventLat) || !isFinite(params.eventLon)) return;
  const dist = haversineDistance(params.userLat, params.userLon, params.eventLat, params.eventLon);
  if (dist > NOTIFY_RADIUS_KM) return;

  const distStr = dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`;
  const typeLabel = params.eventType === 'road' ? t('notification_road') : t('notification_ent');

  // #37 — include eventId + eventType in notification data so a tap can deep-link to the event
  const data: Record<string, any> = { eventType: params.eventType };
  if (params.eventId) data.eventId = params.eventId;

  await sendLocalNotification(
    `${params.eventEmoji} ${params.eventTitle}`,
    `${typeLabel} · ${distStr}`,
    data
  );
}
