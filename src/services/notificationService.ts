import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { haversineDistance } from '../utils/geo';

// Configuração do handler — exibe notificação mesmo com app em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Raio para notificar (km)
export const NOTIFY_RADIUS_KM = 5;

// Solicita permissão de notificações
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false; // não funciona em emulador sem configuração extra

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Envia notificação local imediata
export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {}, sound: true },
    trigger: null, // imediata
  });
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
