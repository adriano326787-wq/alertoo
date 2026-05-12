import { useAppStore } from '../store/appStore';
import { t } from '../utils/i18n';

/**
 * Hook que retorna a função t() e força re-render automático
 * sempre que o idioma do app for alterado.
 *
 * Uso: const t = useT();
 */
export function useT(): (key: string) => string {
  useAppStore((s) => s.langVersion);
  return t;
}
