/**
 * Hook que detecta automaticamente o estado/país do usuário via GPS.
 *
 * Estratégia:
 *   1. Restaura o último estado salvo no AsyncStorage imediatamente
 *      → filtro funciona sem esperar o GPS
 *   2. Detecta silenciosamente via GPS em background
 *      → atualiza caso o usuário esteja em outro estado
 *   3. Se GPS negado ou falhou sem cache, `locationDenied = true`
 *      → telas mostram todos os eventos sem filtro
 */

import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveStateUF } from '../utils/brazilGeo';
import { useAppStore } from '../store/appStore';

const STATE_STORAGE_KEY = '@alertoo_stateUF';
const COUNTRY_STORAGE_KEY = '@alertoo_countryCode';

export function useUserLocation() {
  const userStateUF        = useAppStore((s) => s.userStateUF);
  const setUserCountryCode = useAppStore((s) => s.setUserCountryCode);
  const setUserStateUF     = useAppStore((s) => s.setUserStateUF);

  // Começa como "detectando" só se não há estado no store ainda
  const [detecting, setDetecting]           = useState(!userStateUF);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      // ── 1. Restaurar do cache (instantâneo) ──────────────────────────────────
      if (!userStateUF) {
        try {
          const cachedState   = await AsyncStorage.getItem(STATE_STORAGE_KEY);
          const cachedCountry = await AsyncStorage.getItem(COUNTRY_STORAGE_KEY);
          if (cachedState && !cancelled) {
            setUserStateUF(cachedState);
            if (cachedCountry) setUserCountryCode(cachedCountry);
            setDetecting(false);
            // Continua abaixo para atualizar via GPS em background (silencioso)
          }
        } catch (_) {}
      }

      // ── 2. Detectar via GPS (pode atualizar o cache) ─────────────────────────
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            // Só marca como negado se também não tem cache
            const hasCache = await AsyncStorage.getItem(STATE_STORAGE_KEY);
            if (!hasCache) setLocationDenied(true);
          }
          return;
        }

        // Tenta posição em cache (mais rápido), senão GPS atual
        let loc: Location.LocationObject | null = null;
        try {
          loc = await Location.getLastKnownPositionAsync({ maxAge: 120_000 });
        } catch (_) {}
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }

        if (cancelled || !loc) return;

        const [place] = await Location.reverseGeocodeAsync({
          latitude:  loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (cancelled) return;

        const stateUF     = resolveStateUF(place?.region) ?? null;
        const countryCode = place?.isoCountryCode ?? null;

        if (countryCode) {
          setUserCountryCode(countryCode);
          await AsyncStorage.setItem(COUNTRY_STORAGE_KEY, countryCode).catch(() => {});
        }
        if (stateUF) {
          setUserStateUF(stateUF);
          await AsyncStorage.setItem(STATE_STORAGE_KEY, stateUF).catch(() => {});
        } else {
          // #8 — lê do store (não do closure) para pegar o valor mais recente
          const currentStateUF = useAppStore.getState().userStateUF;
          if (!currentStateUF) {
            // GPS não retornou estado e não tem cache → mostra tudo
            if (!cancelled) setLocationDenied(true);
          }
        }

      } catch (_) {
        // GPS indisponível — se não tem cache, libera sem filtro
        if (!cancelled) {
          const hasCache = await AsyncStorage.getItem(STATE_STORAGE_KEY).catch(() => null);
          // #8 — lê do store (não do closure) para pegar o valor mais recente
          const currentStateUF = useAppStore.getState().userStateUF;
          if (!hasCache && !currentStateUF) setLocationDenied(true);
        }
      } finally {
        if (!cancelled) setDetecting(false);
      }
    }

    detect();
    return () => { cancelled = true; };
  }, []); // roda uma única vez por montagem

  return { detecting, locationDenied };
}
