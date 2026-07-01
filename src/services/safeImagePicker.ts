/**
 * Wrapper seguro pro expo-image-picker.
 *
 * `import * as ImagePicker from 'expo-image-picker'` é um import ESTÁTICO —
 * o pacote chama `requireNativeModule('ExponentImagePicker')` no top-level
 * do seu arquivo de entrada, então o erro acontece na hora do IMPORT, não só
 * quando uma função é chamada. Como os componentes que usam isso (modais de
 * criar evento, perfil) são carregados eagerly pelas telas principais, um
 * import estático crasha o app inteiro na abertura quando o binário nativo
 * instalado não tem esse módulo (ex: JS entregue via OTA antes do app nativo
 * correspondente ser publicado — ver expo-audio, mesmo problema).
 *
 * Este wrapper faz o require() de forma lazy (só na primeira chamada) e
 * dentro de um try/catch, then todos os call-sites importam DAQUI em vez de
 * 'expo-image-picker' diretamente.
 */
import { captureError } from './sentry';

type ImagePickerModule = typeof import('expo-image-picker');

let cached: ImagePickerModule | null | undefined;
let reportedUnavailable = false;

function getModule(): ImagePickerModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cached = require('expo-image-picker') as ImagePickerModule;
  } catch (err) {
    cached = null;
    if (!reportedUnavailable) {
      reportedUnavailable = true;
      captureError(err, { where: 'safeImagePicker.getModule' });
    }
  }
  return cached;
}

export async function requestMediaLibraryPermissionsAsync(): Promise<{ status: string }> {
  const lib = getModule();
  if (!lib) return { status: 'unavailable' };
  return lib.requestMediaLibraryPermissionsAsync();
}

export async function launchImageLibraryAsync(
  options: Parameters<ImagePickerModule['launchImageLibraryAsync']>[0]
): ReturnType<ImagePickerModule['launchImageLibraryAsync']> {
  const lib = getModule();
  if (!lib) return { canceled: true, assets: null } as any;
  return lib.launchImageLibraryAsync(options);
}

/** Use pra mostrar uma mensagem específica em vez do alerta genérico de permissão. */
export function isImagePickerAvailable(): boolean {
  return getModule() !== null;
}
