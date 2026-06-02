/**
 * useInterstitialAd — carrega e exibe interstitial após criar eventos.
 *
 * Uso:
 *   const { showAfterEvent } = useInterstitialAd();
 *   // após criar evento:
 *   showAfterEvent();
 *
 * Regras de proteção de UX:
 *   - Cooldown de 10 min entre exibições
 *   - Não exibe se o usuário tem promoção ativa (isPromoted=true)
 *   - Carrega o próximo anúncio automaticamente após fechar
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  InterstitialAd,
  AdEventType,
  AD_UNITS,
  canShowInterstitial,
  markInterstitialShown,
} from '../services/adsService';

export function useInterstitialAd(options?: { isPromoted?: boolean }) {
  const adRef = useRef<any>(null);
  const loadedRef = useRef(false);
  const subsRef = useRef<(() => void)[]>([]);

  const loadAd = useCallback(() => {
    // Limpa listeners anteriores
    subsRef.current.forEach((unsub) => unsub());
    subsRef.current = [];

    try {
      const ad = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL_AFTER_EVENT, {
        requestNonPersonalizedAdsOnly: false,
      });
      adRef.current = ad;
      loadedRef.current = false;

      const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        loadedRef.current = true;
      });

      const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        loadedRef.current = false;
        // Pré-carrega o próximo
        setTimeout(loadAd, 500);
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        loadedRef.current = false;
      });

      subsRef.current = [unsubLoaded, unsubClosed, unsubError];
      ad.load();
    } catch {
      // SDK não disponível
    }
  }, []);

  useEffect(() => {
    loadAd();
    return () => {
      subsRef.current.forEach((unsub) => unsub());
    };
  }, [loadAd]);

  /**
   * Exibe o interstitial respeitando cooldown e status de promoção.
   * Chame após criar um evento.
   */
  const showAfterEvent = useCallback(async () => {
    if (options?.isPromoted) return; // usuários com promoção ativa não veem
    if (!loadedRef.current || !adRef.current) return;

    const allowed = await canShowInterstitial();
    if (!allowed) return;

    try {
      await markInterstitialShown();
      adRef.current.show();
    } catch {
      // SDK não disponível
    }
  }, [options?.isPromoted]);

  return { showAfterEvent };
}
