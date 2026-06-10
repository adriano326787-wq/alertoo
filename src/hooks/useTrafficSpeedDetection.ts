/**
 * useTrafficSpeedDetection
 *
 * Monitora a velocidade GPS do usuário e detecta padrões de trânsito:
 *   - SLOW  : speed 0.5–15 km/h por >30 s  → trânsito lento / congestionamento
 *   - STOPPED: speed < 0.5 km/h por >60 s  → parado (possível acidente / interdição)
 *
 * Usa apenas o GPS do dispositivo — sem chamadas extras de API.
 * Inclui cooldown de 5 min entre alertas para não ser intrusivo.
 * Não dispara se o usuário está próximo de um evento já cadastrado (evita duplicatas).
 * Só dispara se o usuário esteve em velocidade de veículo recentemente — evita
 * prompts para pedestres parados/andando devagar (ex: caminhando, em um bar).
 */

import { useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { RoadEvent } from '../types';
import { haversineDistance } from '../utils/geo';

export type TrafficAlertKind = 'slow' | 'stopped';

export interface TrafficAlert {
  kind: TrafficAlertKind;
  latitude: number;
  longitude: number;
}

interface Options {
  /** Eventos ativos — evita prompt duplicado quando já há evento próximo */
  nearbyEvents: RoadEvent[];
  /** Distância mínima em km para considerar evento "próximo" (padrão: 0.3) */
  nearbyRadiusKm?: number;
  /** Callback chamado quando um padrão de trânsito é detectado */
  onAlert: (alert: TrafficAlert) => void;
  /** Parar monitoramento (ex: quando há modal aberto) */
  paused?: boolean;
}

const SLOW_THRESHOLD_KMH   = 15;   // abaixo disso = "lento"
const STOPPED_THRESHOLD_KMH = 0.5; // abaixo disso = "parado"
const SLOW_DURATION_MS     = 30_000; // 30 s lento → prompt
const STOPPED_DURATION_MS  = 60_000; // 60 s parado → prompt
const COOLDOWN_MS          = 5 * 60_000; // 5 min entre prompts
const NEARBY_RADIUS_KM     = 0.3;
const SAMPLE_INTERVAL_MS   = 3_000;

// Velocidade mínima que caracteriza deslocamento de veículo (acima de
// caminhada/corrida). Usado para distinguir "carro parado no trânsito" de
// "pessoa parada/andando a pé".
const VEHICLE_SPEED_THRESHOLD_KMH = 25;
// Janela de tempo em que uma velocidade de veículo recente ainda "conta"
// para considerar o usuário em um veículo, mesmo já parado/lento.
const VEHICLE_CONTEXT_WINDOW_MS = 3 * 60_000;

export function useTrafficSpeedDetection({
  nearbyEvents,
  nearbyRadiusKm = NEARBY_RADIUS_KM,
  onAlert,
  paused = false,
}: Options) {
  const watcherRef       = useRef<Location.LocationSubscription | null>(null);
  const slowSinceRef     = useRef<number | null>(null);    // timestamp em que começou a ficar lento
  const stoppedSinceRef  = useRef<number | null>(null);   // timestamp em que parou
  const lastAlertRef     = useRef<number>(0);             // timestamp do último alerta
  const lastPosRef       = useRef<{ lat: number; lon: number } | null>(null);
  const lastVehicleSpeedAtRef = useRef<number | null>(null); // último instante com velocidade de veículo
  const onAlertRef       = useRef(onAlert);
  const nearbyEventsRef  = useRef(nearbyEvents);

  // Mantém refs atualizados sem re-assinar o watcher
  useEffect(() => { onAlertRef.current = onAlert; }, [onAlert]);
  useEffect(() => { nearbyEventsRef.current = nearbyEvents; }, [nearbyEvents]);

  const hasNearbyEvent = useCallback((lat: number, lon: number): boolean => {
    return nearbyEventsRef.current.some((ev) =>
      haversineDistance(lat, lon, ev.latitude, ev.longitude) < nearbyRadiusKm,
    );
  }, [nearbyRadiusKm]);

  const handleLocation = useCallback((loc: Location.LocationObject) => {
    const { latitude, longitude, speed } = loc.coords;
    lastPosRef.current = { lat: latitude, lon: longitude };

    const speedKmh = speed != null && speed >= 0 ? speed * 3.6 : null;
    if (speedKmh === null) return; // GPS sem velocidade (ex: dispositivo parado em área sem sinal)

    const now = Date.now();
    const cooldownOk = now - lastAlertRef.current > COOLDOWN_MS;

    // Marca quando o usuário esteve em velocidade de veículo pela última vez
    if (speedKmh >= VEHICLE_SPEED_THRESHOLD_KMH) {
      lastVehicleSpeedAtRef.current = now;
    }
    const inVehicleContext =
      lastVehicleSpeedAtRef.current !== null &&
      now - lastVehicleSpeedAtRef.current <= VEHICLE_CONTEXT_WINDOW_MS;

    // ── PARADO ────────────────────────────────────────────────────────────────
    if (speedKmh < STOPPED_THRESHOLD_KMH) {
      slowSinceRef.current = null; // não é lento — está parado
      if (stoppedSinceRef.current === null) {
        stoppedSinceRef.current = now;
      } else if (
        cooldownOk &&
        inVehicleContext &&
        now - stoppedSinceRef.current >= STOPPED_DURATION_MS &&
        !hasNearbyEvent(latitude, longitude)
      ) {
        lastAlertRef.current = now;
        stoppedSinceRef.current = null;
        onAlertRef.current({ kind: 'stopped', latitude, longitude });
      }
      return;
    }

    stoppedSinceRef.current = null; // descartamos "parado" assim que volta a mover

    // ── LENTO ─────────────────────────────────────────────────────────────────
    if (speedKmh < SLOW_THRESHOLD_KMH) {
      if (slowSinceRef.current === null) {
        slowSinceRef.current = now;
      } else if (
        cooldownOk &&
        inVehicleContext &&
        now - slowSinceRef.current >= SLOW_DURATION_MS &&
        !hasNearbyEvent(latitude, longitude)
      ) {
        lastAlertRef.current = now;
        slowSinceRef.current = null;
        onAlertRef.current({ kind: 'slow', latitude, longitude });
      }
      return;
    }

    // Velocidade normal → reset
    slowSinceRef.current    = null;
    stoppedSinceRef.current = null;
  }, [hasNearbyEvent]);

  useEffect(() => {
    if (paused) {
      watcherRef.current?.remove();
      watcherRef.current = null;
      return;
    }

    let active = true;

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted' || !active) return;

      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: SAMPLE_INTERVAL_MS,
          distanceInterval: 10, // mínimo de 10 m de deslocamento para nova amostra
        },
        handleLocation,
      );
    })();

    return () => {
      active = false;
      watcherRef.current?.remove();
      watcherRef.current = null;
    };
  }, [paused, handleLocation]);
}
