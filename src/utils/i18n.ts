/**
 * Sistema de internacionalização (i18n).
 *
 * Prioridade do idioma:
 *   1. País detectado pelo GPS (físico) — atualizado via updateLangFromCountry()
 *   2. Locale do dispositivo — detectado ao iniciar
 *   3. Fallback: inglês
 *
 * Traduções separadas por idioma em src/i18n/{pt,en,es,fr}.ts
 */

export type LangCode = 'pt' | 'en' | 'es' | 'fr';

import { pt } from '../i18n/pt';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { fr } from '../i18n/fr';

// ─── Traduções ────────────────────────────────────────────────────────────────
const translations: Record<LangCode, Record<string, string>> = { pt, en, es, fr };

// ─── Mapeamento país → idioma ─────────────────────────────────────────────────
const COUNTRY_TO_LANG: Record<string, LangCode> = {
  // Português
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt', ST: 'pt', TL: 'pt',
  // Espanhol
  AR: 'es', CL: 'es', CO: 'es', MX: 'es', PE: 'es', VE: 'es', EC: 'es', BO: 'es',
  PY: 'es', UY: 'es', CR: 'es', CU: 'es', DO: 'es', GT: 'es', HN: 'es', NI: 'es',
  PA: 'es', SV: 'es', ES: 'es', GQ: 'es', PH: 'es',
  // Francês
  FR: 'fr', BE: 'fr', CH: 'fr', CA: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', MG: 'fr',
  // Inglês (todos os demais)
};

// ─── Idioma atual (mutável) ───────────────────────────────────────────────────
// Prioridade: manual > GPS > dispositivo
let _currentLang: LangCode = detectDeviceLang();
let _manualLang: LangCode | null = null; // null = automático

const LANG_STORAGE_KEY = '@alertoo_lang';

function detectDeviceLang(): LangCode {
  try {
    // #31 — Use expo-localization which is properly polyfilled on Android API 21+.
    // Fall back to Intl.DateTimeFormat if expo-localization is unavailable.
    let locale = '';
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
      const { getLocales } = require('expo-localization') as any;
      locale = getLocales()?.[0]?.languageTag ?? '';
    } catch {
      locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    }
    const code = locale.split('-')[0].toLowerCase();
    if (code === 'pt') return 'pt';
    if (code === 'es') return 'es';
    if (code === 'fr') return 'fr';
    return 'en';
  } catch {
    return 'pt';
  }
}

/** Carrega preferência salva (chame no boot do app) */
export async function loadSavedLang(): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
    if (saved && ['pt', 'en', 'es', 'fr'].includes(saved)) {
      _manualLang = saved as LangCode;
      _currentLang = _manualLang;
    }
  } catch {}
}

/** Define idioma manualmente (persiste entre sessões) */
export async function setManualLang(lang: LangCode): Promise<void> {
  _manualLang = lang;
  _currentLang = lang;
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

/** Remove preferência manual (volta ao automático) */
export async function clearManualLang(): Promise<void> {
  _manualLang = null;
  _currentLang = detectDeviceLang();
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem(LANG_STORAGE_KEY);
  } catch {}
}

export function getManualLang(): LangCode | null {
  return _manualLang;
}

/**
 * Atualiza o idioma com base no país detectado pelo GPS.
 * Chamado em appStore.setUserCountryCode.
 * Retorna true se o idioma mudou (componentes precisam re-renderizar).
 */
export function updateLangFromCountry(countryCode: string): boolean {
  if (_manualLang) return false; // respeita escolha manual
  const lang = COUNTRY_TO_LANG[countryCode.toUpperCase()] ?? 'en';
  if (lang !== _currentLang) {
    _currentLang = lang;
    return true;
  }
  return false;
}

/** Idioma atual (leitura) */
export function getCurrentLang(): LangCode {
  return _currentLang;
}

/** Traduz uma chave para o idioma atual. */
export function t(key: string): string {
  return translations[_currentLang]?.[key]
    ?? translations['en']?.[key]
    ?? key;
}

/**
 * Traduz com interpolação de variáveis.
 * Ex: tf('time_ago_min', { n: 5 }) → "há 5 min" / "5 min ago"
 */
export function tf(key: string, vars: Record<string, string | number>): string {
  let result = t(key);
  for (const [k, v] of Object.entries(vars)) {
    result = result.replace(`{${k}}`, String(v));
  }
  return result;
}

/** Rótulo traduzido de categoria de alerta de estrada */
export function tRoadCat(category: string): string {
  return t(`cat_road_${category}`);
}

/** Rótulo traduzido de tipo de radar (fixed | mobile | blitz) */
export function tRadarType(type: string): string {
  return t(`radar_type_${type}`);
}

/** Rótulo traduzido de categoria de entretenimento */
export function tEntCat(category: string): string {
  return t(`cat_ent_${category}`);
}

/** Nome traduzido do tier de promoção */
export function tTier(tierId: string): string {
  return t(`tier_${tierId}`);
}

// ─── Rótulo de região por país ────────────────────────────────────────────────
const REGION_LABELS: Record<string, Partial<Record<LangCode, string>>> = {
  BR: { pt: 'Estado',       en: 'State',      es: 'Estado'      },
  PT: { pt: 'Distrito',     en: 'District',   es: 'Distrito'    },
  US: { pt: 'Estado',       en: 'State',      es: 'Estado'      },
  CA: { pt: 'Província',    en: 'Province',   es: 'Provincia'   },
  AU: { pt: 'Estado',       en: 'State',      es: 'Estado'      },
  AR: { pt: 'Província',    en: 'Province',   es: 'Provincia'   },
  CL: { pt: 'Região',       en: 'Region',     es: 'Región'      },
  CO: { pt: 'Departamento', en: 'Department', es: 'Departamento'},
  MX: { pt: 'Estado',       en: 'State',      es: 'Estado'      },
  ES: { pt: 'Comunidade',   en: 'Region',     es: 'Comunidad'   },
  FR: { pt: 'Região',       en: 'Région',     es: 'Región'      },
  IT: { pt: 'Região',       en: 'Region',     es: 'Región'      },
  DE: { pt: 'Estado',       en: 'State',      es: 'Estado'      },
};

export function getRegionLabel(countryCode: string | null | undefined): string {
  if (!countryCode) return t('filter_region');
  return REGION_LABELS[countryCode.toUpperCase()]?.[_currentLang] ?? t('filter_region');
}

export function getCityLabel(_countryCode: string | null | undefined): string {
  return t('filter_city');
}
