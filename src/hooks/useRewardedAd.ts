/**
 * useRewardedAd — exibe vídeo recompensado e chama onRewarded ao terminar.
 *
 * Uso:
 *   const { show, ready, cooldownActive } = useRewardedAd();
 *   // botão "Assistir anúncio":
 *   <Button disabled={!ready || cooldownActive} onPress={() => show(onRewarded)} />
 *
 * Regras:
 *   - Cooldown de 60 min entre exibições
 *   - `ready` = anúncio carregado e pronto para exibir
 *   - `cooldownActive` = cooldown ainda ativo (mostra timer ao usuário)
 *   - onRewarded é chamado SOMENTE se o usuário assistiu até o fim
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  AD_UNITS,
  canShowRewarded,
  markRewardedShown,
  initializeAds,
} from '../services/adsService';

interface UseRewardedAdResult {
  /** Anúncio carregado e pronto para exibir */
  ready: boolean;
  /** Cooldown de 60 min ainda ativo */
  cooldownActive: boolean;
  /** Anúncio não disponível (timeout ou erro — sem inventário no momento) */
  unavailable: boolean;
  /** Exibe o anúncio; chama onRewarded apenas se assistido até o fim */
  show: (onRewarded: () => void) => Promise<void>;
}

export function useRewardedAd(): UseRewardedAdResult {
  const adRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const subsRef = useRef<(() => void)[]>([]);

  // Verifica cooldown ao montar
  useEffect(() => {
    canShowRewarded().then((ok) => setCooldownActive(!ok));
  }, []);

  // Timeout: se o anúncio não carregar em 20s, marca como indisponível
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAd = useCallback(async () => {
    subsRef.current.forEach((unsub) => unsub());
    subsRef.current = [];
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setReady(false);

    // Garante que o SDK já foi inicializado antes de criar o ad request
    try {
      await initializeAds();
    } catch {
      return;
    }

    try {
      const ad = RewardedAd.createForAdRequest(AD_UNITS.REWARDED_EARN_CREDIT, {
        requestNonPersonalizedAdsOnly: false,
      });
      adRef.current = ad;

      const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED ?? AdEventType.LOADED, () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setReady(true);
        setUnavailable(false);
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setReady(false);
        setUnavailable(true);
        // Tenta recarregar após 60s em caso de erro
        setTimeout(loadAd, 60_000);
      });

      subsRef.current = [unsubLoaded, unsubError];
      ad.load();

      // Timeout de 20s — se não carregar, marca como indisponível
      timeoutRef.current = setTimeout(() => {
        setReady(false);
        setUnavailable(true);
      }, 20_000);

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

  const show = useCallback(async (onRewarded: () => void) => {
    const allowed = await canShowRewarded();
    if (!allowed) {
      setCooldownActive(true);
      return;
    }

    if (!adRef.current) return;

    return new Promise<void>((resolve) => {
      let rewarded = false;

      // Limpa listeners anteriores de exibição
      const prevSubs = [...subsRef.current];

      const unsubEarned = adRef.current.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => { rewarded = true; },
      );

      const unsubClosed = adRef.current.addAdEventListener(
        RewardedAdEventType.CLOSED ?? AdEventType.CLOSED,
        async () => {
          unsubEarned();
          unsubClosed();

          setReady(false);
          await markRewardedShown();
          setCooldownActive(true);

          if (rewarded) {
            onRewarded(); // chamado apenas se assistiu até o fim
          }

          // Recarrega para próxima exibição (após cooldown)
          setTimeout(loadAd, 1_000);
          resolve();
        },
      );

      try {
        adRef.current.show();
      } catch {
        unsubEarned();
        unsubClosed();
        resolve();
      }
    });
  }, [loadAd]);

  return { ready, cooldownActive, unavailable, show };
}
