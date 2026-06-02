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
  /** Exibe o anúncio; chama onRewarded apenas se assistido até o fim */
  show: (onRewarded: () => void) => Promise<void>;
}

export function useRewardedAd(): UseRewardedAdResult {
  const adRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const subsRef = useRef<(() => void)[]>([]);

  // Verifica cooldown ao montar
  useEffect(() => {
    canShowRewarded().then((ok) => setCooldownActive(!ok));
  }, []);

  const loadAd = useCallback(async () => {
    subsRef.current.forEach((unsub) => unsub());
    subsRef.current = [];
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
        setReady(true);
      });

      const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
        setReady(false);
        // Tenta recarregar após 15s em caso de erro (reduzido de 30s)
        setTimeout(loadAd, 15_000);
      });

      subsRef.current = [unsubLoaded, unsubError];
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

  return { ready, cooldownActive, show };
}
