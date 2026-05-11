/**
 * Hook que detecta automaticamente o estado/país do usuário via GPS.
 * - Se `userStateUF` já está no appStore, não faz nada (detecção única por sessão).
 * - Enquanto detecta, `detecting` é true — telas usam isso para exibir loading.
 * - Se a permissão for negada ou o GPS falhar, `locationDenied` fica true
 *   e as telas exibem todos os eventos (sem filtro forçado).
 */

import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { resolveStateUF } from '../utils/brazilGeo';
import { useAppStore } from '../store/appStore';

export function useUserLocation() {
  const userStateUF     = useAppStore((s) => s.userStateUF);
  const setUserCountryCode = useAppStore((s) => s.setUserCountryCode);
  const setUserStateUF  = useAppStore((s) => s.setUserStateUF);

  const [detecting, setDetecting]       = useState(!userStateUF);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    // Estado já conhecido — nada a fazer
    if (userStateUF) {
      setDetecting(false);
      return;
    }

    let cancelled = false;

    async function detect() {
      setDetecting(true);
      let gotState = false;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setLocationDenied(true);
          return;
        }

        // Tenta cache primeiro (mais rápido)
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
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (cancelled) return;

        const stateUF     = resolveStateUF(place?.region) ?? null;
        const countryCode = place?.isoCountryCode ?? null;

        if (countryCode) setUserCountryCode(countryCode);
        if (stateUF) {
          setUserStateUF(stateUF);
          gotState = true;
        }

      } catch (_) {
        // GPS indisponível — não bloquear o usuário
      } finally {
        if (!cancelled) {
          setDetecting(false);
          // Se a detecção terminou mas não conseguiu um estado (GPS sem região,
          // reverseGeocode incompleto, etc.), trata como "sem restrição"
          if (!gotState) setLocationDenied(true);
        }
      }
    }

    detect();
    return () => { cancelled = true; };
  }, []); // roda uma única vez por montagem

  return { detecting, locationDenied };
}
