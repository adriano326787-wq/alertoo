/**
 * In-app Review — solicita avaliação na Play Store / App Store (#6).
 *
 * Regras de disparo:
 *  - Usuário criou 3+ eventos (road ou entretenimento)
 *  - Nunca foi solicitado antes nesta instalação (AsyncStorage flag)
 *  - Mínimo 3 dias desde a instalação
 *
 * Resiliência: se expo-store-review não estiver disponível, vira no-op.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEW_ASKED_KEY = '@alertoo:review_asked';
const EVENTS_CREATED_KEY = '@alertoo:events_created_count';
const INSTALL_DATE_KEY = '@alertoo:install_date';
const MIN_EVENTS = 3;
const MIN_DAYS = 3;

/** Incrementa contador de eventos criados e dispara review se elegível */
export async function trackEventCreated(): Promise<void> {
  try {
    // Registra data de instalação na primeira chamada
    const installDate = await AsyncStorage.getItem(INSTALL_DATE_KEY);
    if (!installDate) {
      await AsyncStorage.setItem(INSTALL_DATE_KEY, String(Date.now()));
    }

    // Incrementa contador
    const raw = await AsyncStorage.getItem(EVENTS_CREATED_KEY);
    const count = parseInt(raw ?? '0', 10) + 1;
    await AsyncStorage.setItem(EVENTS_CREATED_KEY, String(count));

    if (count < MIN_EVENTS) return;

    // Verifica se já foi pedido antes
    const asked = await AsyncStorage.getItem(REVIEW_ASKED_KEY);
    if (asked) return;

    // Verifica mínimo de dias desde instalação
    const installedAt = parseInt(installDate ?? String(Date.now()), 10);
    const daysSince = (Date.now() - installedAt) / (1000 * 60 * 60 * 24);
    if (daysSince < MIN_DAYS) return;

    await requestReview();
  } catch (_) {}
}

async function requestReview(): Promise<void> {
  try {
    // Dynamic import — não quebra se o módulo não existir
    // @ts-ignore — módulo opcional; pode não estar instalado
    const StoreReview = await import('expo-store-review').catch(() => null);
    if (!StoreReview) return;

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    await StoreReview.requestReview();
    await AsyncStorage.setItem(REVIEW_ASKED_KEY, '1');
  } catch (_) {}
}
