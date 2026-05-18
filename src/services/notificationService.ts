import { haversineDistance } from '../utils/geo';

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
      handleNotification: async () => ({
        // Android 13+ / iOS 17+: banner e list substituem shouldShowAlert
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerSet = true;
  } catch (_) {}
}

// Solicita permissão de notificações
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const Notifications = getNotifications();
    if (!Notifications) return false;
    ensureHandler();
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (_) {
    return false;
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
  eventLat: number;
  eventLon: number;
  userLat: number;
  userLon: number;
}) {
  const dist = haversineDistance(params.userLat, params.userLon, params.eventLat, params.eventLon);
  if (dist > NOTIFY_RADIUS_KM) return;

  const distStr = dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`;
  const typeLabel = params.eventType === 'road' ? '🚨 Alerta de Estrada' : '🎉 Evento';

  await sendLocalNotification(
    `${params.eventEmoji} ${params.eventTitle}`,
    `${typeLabel} a ${distStr} de você`
  );
}
