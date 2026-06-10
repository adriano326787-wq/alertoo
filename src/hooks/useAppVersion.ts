import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { db } from '../services/firebase';

// versionCode atual do app — lido dinamicamente do app.config.js (android.versionCode)
// para nunca ficar desatualizado. Fallback de segurança caso Constants não exponha o valor.
export const CURRENT_VERSION_CODE: number =
  Constants.expoConfig?.android?.versionCode ?? 30;

// Tempo máximo que o app aguarda resposta do Firestore antes de liberar o boot.
// Se a rede estiver lenta ou Firebase indisponível, não bloqueia o usuário.
const CHECK_TIMEOUT_MS = 2500; // reduzido de 4000 → splash some mais rápido em redes lentas

export interface AppConfig {
  minVersionCode: number;
  latestVersionCode: number;
  forceUpdateUrl: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
}

export type AppVersionStatus =
  | 'loading'
  | 'ok'
  | 'force_update'
  | 'maintenance';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return Promise.race([
    promise,
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms)),
  ]);
}

export function useAppVersion() {
  const [status, setStatus] = useState<AppVersionStatus>('loading');
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const ref = doc(db, 'config', 'appConfig');

        const result = await withTimeout(
          getDoc(ref).catch(() => null), // qualquer erro de Firestore → null
          CHECK_TIMEOUT_MS,
        );

        if (cancelled) return;

        // Timeout ou erro de rede → libera o app sem bloquear
        if (result === 'timeout' || result === null) {
          setStatus('ok');
          return;
        }

        // Documento não existe ainda → libera normalmente
        if (!result.exists()) {
          setStatus('ok');
          return;
        }

        const data = result.data() as AppConfig;
        setConfig(data);

        if (data.maintenanceMode) {
          setStatus('maintenance');
          return;
        }

        if (CURRENT_VERSION_CODE < data.minVersionCode) {
          setStatus('force_update');
          return;
        }

        setStatus('ok');
      } catch {
        // Segurança extra: qualquer exceção não capturada libera o app
        if (!cancelled) setStatus('ok');
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  return { status, config };
}
