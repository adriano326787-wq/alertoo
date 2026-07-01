/**
 * useAccelerometerBraking
 *
 * Detecta frenagem/desvio brusco via acelerômetro — sinal usado pelo Context
 * Signal Engine (contextScoring.ts) para a hipótese de Acidente/Perigo na via.
 *
 * ⚠️ expo-sensors faz requireNativeModule('ExponentAccelerometer') no
 * top-level do seu módulo — import ESTÁTICO ("import { Accelerometer } from
 * 'expo-sensors'") crasharia o app inteiro caso o binário nativo instalado
 * não tenha esse módulo ainda (mesmo problema que já resolvemos nesta sessão
 * para expo-audio/expo-image-picker/react-native-share). Por isso o require
 * aqui é lazy e protegido por try/catch — se o módulo não existir, o hook
 * simplesmente não detecta nada, sem quebrar o app.
 *
 * Calibração inicial (ajustar com dados reais depois de coletar uso real):
 *   threshold = variação de magnitude do vetor de aceleração > 2.2g em <500ms
 */
import { useEffect, useRef } from 'react';
import { captureError } from '../services/sentry';

type AccelerometerModule = typeof import('expo-sensors');

let cachedModule: AccelerometerModule | null | undefined;
let reportedUnavailable = false;

function getAccelerometerModule(): AccelerometerModule | null {
  if (cachedModule !== undefined) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedModule = require('expo-sensors') as AccelerometerModule;
  } catch (err) {
    cachedModule = null;
    if (!reportedUnavailable) {
      reportedUnavailable = true;
      captureError(err, { where: 'useAccelerometerBraking.getAccelerometerModule' });
    }
  }
  return cachedModule;
}

/** true se o módulo nativo de sensores estiver disponível neste binário. */
export function isAccelerometerAvailable(): boolean {
  return getAccelerometerModule() !== null;
}

const UPDATE_INTERVAL_MS = 200;
const BRAKE_DELTA_G_THRESHOLD = 2.2; // variação de magnitude (em g) entre amostras consecutivas

interface Options {
  /** Callback disparado quando uma frenagem/desvio brusco é detectado. */
  onHardBrake: () => void;
  /** Desativa a leitura (ex: app em background, feature desligada). */
  paused?: boolean;
}

export function useAccelerometerBraking({ onHardBrake, paused = false }: Options) {
  const lastMagnitudeRef = useRef<number | null>(null);
  const onHardBrakeRef = useRef(onHardBrake);

  useEffect(() => { onHardBrakeRef.current = onHardBrake; }, [onHardBrake]);

  useEffect(() => {
    if (paused) return;

    const mod = getAccelerometerModule();
    if (!mod) return; // sensor indisponível neste binário — no-op silencioso

    mod.Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    const sub = mod.Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const last = lastMagnitudeRef.current;
      lastMagnitudeRef.current = magnitude;
      if (last === null) return;

      const delta = Math.abs(magnitude - last);
      if (delta > BRAKE_DELTA_G_THRESHOLD) {
        onHardBrakeRef.current();
      }
    });

    return () => sub.remove();
  }, [paused]);
}
