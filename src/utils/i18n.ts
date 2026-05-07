/**
 * Sistema de internacionalização (i18n).
 *
 * Prioridade do idioma:
 *   1. País detectado pelo GPS (físico) — atualizado via updateLangFromCountry()
 *   2. Locale do dispositivo — detectado ao iniciar
 *   3. Fallback: inglês
 */

export type LangCode = 'pt' | 'en' | 'es';

// ─── Traduções ────────────────────────────────────────────────────────────────
const translations: Record<LangCode, Record<string, string>> = {
  pt: {
    // Abas
    tab_road: 'Estrada',
    tab_map: 'Mapa',
    tab_events: 'Eventos',
    tab_profile: 'Perfil',

    // Filtro
    filter_title: 'Filtrar alertas',
    filter_clear: 'Limpar filtro',
    filter_region: 'Estado',
    filter_city: 'Cidade em',
    filter_showing: 'Exibindo alertas de:',
    filter_whole_region: 'Todo o estado de',
    filter_cancel: 'Cancelar',
    filter_apply: 'Aplicar',
    filter_no_regions: 'Nenhuma região disponível',

    // Perfil
    profile_visitor: 'Você está como visitante',
    profile_visitor_desc: 'Crie uma conta para acumular pontos, subir de rank e ter seu histórico salvo.',
    profile_create_account: 'Criar conta',
    profile_sign_in: 'Já tenho conta',
    profile_ranks_title: 'Ranks disponíveis:',
    profile_how_to_earn: 'Como ganhar pontos:',
    profile_sign_out: 'Sair da conta',
    profile_sign_out_confirm: 'Sair',
    profile_sign_out_cancel: 'Cancelar',
    profile_sign_out_msg: 'Deseja encerrar a sessão?',
    profile_member_since: 'Membro desde',
    profile_points_title: 'Pontuação',
    profile_all_ranks: 'Todos os ranks',
    profile_how_to_earn_short: 'Como ganhar pontos',
    profile_events_reported: 'Eventos\nreportados',
    profile_comments_posted: 'Comentários\npublicados',
    profile_edit_name: 'Editar nome',
    profile_edit_name_placeholder: 'Seu nome',
    profile_save: 'Salvar',

    // Ranks
    rank_iniciante:    'Iniciante',
    rank_explorador:   'Explorador',
    rank_colaborador:  'Colaborador',
    rank_especialista: 'Especialista',
    rank_mestre:       'Mestre',
    rank_start:        'Início',
    rank_max:          'pts — Rank máximo! 🎉',
    rank_progress:     'pts para o próximo rank',

    // Alertas de estrada
    road_title: 'Alertas de Estrada',
    road_confirm: '✓ Confirmar',
    road_deny: '✗ Negar',
    road_voted: 'Você já votou neste evento',
    road_own: 'Seu evento',
    road_empty: 'Nenhum alerta ativo no momento.',
    road_empty_hint: 'Toque no mapa para reportar um evento.',

    // Entretenimento
    ent_title: 'Entretenimento',
    ent_add: '+ Adicionar',
    ent_empty: 'Nenhum evento por aqui ainda.',
    ent_empty_hint: 'Toque em "+ Adicionar" ou no mapa para criar!',
    ent_load_more: 'Carregar mais',

    // Mapa
    map_tap_hint: 'Toque no mapa para reportar',
    map_checking: 'Verificando localização...',

    // Auth
    auth_sign_in_tab: 'Entrar',
    auth_register_tab: 'Criar conta',
    auth_name: 'Nome',
    auth_email: 'E-mail',
    auth_password: 'Senha',
    auth_forgot: 'Esqueci minha senha',
    auth_continue_anon: 'Continuar sem conta',
    auth_anon_note: 'Sem conta você pode visualizar eventos, mas não acumula pontos nem rank.',
    auth_google: 'Continuar com Google',
    auth_subtitle: 'Alertas e eventos em tempo real, perto de você',
    auth_or: 'ou',

    // Pontos
    points_road_event: 'Reportar evento de estrada',
    points_ent_event: 'Reportar evento de entretenimento',
    points_confirmation: 'Confirmação recebida no evento',
    points_like: 'Curtida recebida no evento',
    points_comment: 'Publicar comentário',
    points_denial: 'Negação recebida no evento',
  },

  en: {
    tab_road: 'Road',
    tab_map: 'Map',
    tab_events: 'Events',
    tab_profile: 'Profile',

    filter_title: 'Filter alerts',
    filter_clear: 'Clear filter',
    filter_region: 'Region',
    filter_city: 'City in',
    filter_showing: 'Showing alerts from:',
    filter_whole_region: 'Entire region of',
    filter_cancel: 'Cancel',
    filter_apply: 'Apply',
    filter_no_regions: 'No regions available',

    profile_visitor: 'You are browsing as guest',
    profile_visitor_desc: 'Create an account to earn points, level up your rank and save your history.',
    profile_create_account: 'Create account',
    profile_sign_in: 'I already have an account',
    profile_ranks_title: 'Available ranks:',
    profile_how_to_earn: 'How to earn points:',
    profile_sign_out: 'Sign out',
    profile_sign_out_confirm: 'Sign out',
    profile_sign_out_cancel: 'Cancel',
    profile_sign_out_msg: 'Do you want to sign out?',
    profile_member_since: 'Member since',
    profile_points_title: 'Points',
    profile_all_ranks: 'All ranks',
    profile_how_to_earn_short: 'How to earn points',
    profile_events_reported: 'Reported\nevents',
    profile_comments_posted: 'Comments\nposted',
    profile_edit_name: 'Edit name',
    profile_edit_name_placeholder: 'Your name',
    profile_save: 'Save',

    rank_iniciante:    'Beginner',
    rank_explorador:   'Explorer',
    rank_colaborador:  'Contributor',
    rank_especialista: 'Expert',
    rank_mestre:       'Master',
    rank_start:        'Start',
    rank_max:          'pts — Max rank reached! 🎉',
    rank_progress:     'pts to next rank',

    road_title: 'Road Alerts',
    road_confirm: '✓ Confirm',
    road_deny: '✗ Deny',
    road_voted: 'You already voted on this event',
    road_own: 'Your event',
    road_empty: 'No active alerts right now.',
    road_empty_hint: 'Tap the map to report an event.',

    ent_title: 'Entertainment',
    ent_add: '+ Add',
    ent_empty: 'No events here yet.',
    ent_empty_hint: 'Tap "+ Add" or the map to create one!',
    ent_load_more: 'Load more',

    map_tap_hint: 'Tap map to report',
    map_checking: 'Checking location...',

    auth_sign_in_tab: 'Sign in',
    auth_register_tab: 'Create account',
    auth_name: 'Name',
    auth_email: 'Email',
    auth_password: 'Password',
    auth_forgot: 'Forgot password',
    auth_continue_anon: 'Continue without account',
    auth_anon_note: "Without an account you can view events but won't earn points or ranks.",
    auth_google: 'Continue with Google',
    auth_subtitle: 'Real-time alerts and events near you',
    auth_or: 'or',

    points_road_event: 'Report road event',
    points_ent_event: 'Report entertainment event',
    points_confirmation: 'Confirmation received',
    points_like: 'Like received',
    points_comment: 'Post a comment',
    points_denial: 'Denial received',
  },

  es: {
    tab_road: 'Tráfico',
    tab_map: 'Mapa',
    tab_events: 'Eventos',
    tab_profile: 'Perfil',

    filter_title: 'Filtrar alertas',
    filter_clear: 'Limpiar filtro',
    filter_region: 'Región',
    filter_city: 'Ciudad en',
    filter_showing: 'Mostrando alertas de:',
    filter_whole_region: 'Toda la región de',
    filter_cancel: 'Cancelar',
    filter_apply: 'Aplicar',
    filter_no_regions: 'Sin regiones disponibles',

    profile_visitor: 'Estás navegando como visitante',
    profile_visitor_desc: 'Crea una cuenta para acumular puntos, subir de rango y guardar tu historial.',
    profile_create_account: 'Crear cuenta',
    profile_sign_in: 'Ya tengo cuenta',
    profile_ranks_title: 'Rangos disponibles:',
    profile_how_to_earn: 'Cómo ganar puntos:',
    profile_sign_out: 'Cerrar sesión',
    profile_sign_out_confirm: 'Salir',
    profile_sign_out_cancel: 'Cancelar',
    profile_sign_out_msg: '¿Deseas cerrar la sesión?',
    profile_member_since: 'Miembro desde',
    profile_points_title: 'Puntuación',
    profile_all_ranks: 'Todos los rangos',
    profile_how_to_earn_short: 'Cómo ganar puntos',
    profile_events_reported: 'Eventos\nreportados',
    profile_comments_posted: 'Comentarios\npublicados',
    profile_edit_name: 'Editar nombre',
    profile_edit_name_placeholder: 'Tu nombre',
    profile_save: 'Guardar',

    rank_iniciante:    'Principiante',
    rank_explorador:   'Explorador',
    rank_colaborador:  'Colaborador',
    rank_especialista: 'Especialista',
    rank_mestre:       'Maestro',
    rank_start:        'Inicio',
    rank_max:          'pts — ¡Rango máximo! 🎉',
    rank_progress:     'pts para el siguiente rango',

    road_title: 'Alertas de Tráfico',
    road_confirm: '✓ Confirmar',
    road_deny: '✗ Negar',
    road_voted: 'Ya votaste en este evento',
    road_own: 'Tu evento',
    road_empty: 'No hay alertas activas en este momento.',
    road_empty_hint: 'Toca el mapa para reportar un evento.',

    ent_title: 'Entretenimiento',
    ent_add: '+ Agregar',
    ent_empty: 'No hay eventos aún.',
    ent_empty_hint: '¡Toca "+ Agregar" o el mapa para crear uno!',
    ent_load_more: 'Cargar más',

    map_tap_hint: 'Toca el mapa para reportar',
    map_checking: 'Verificando ubicación...',

    auth_sign_in_tab: 'Iniciar sesión',
    auth_register_tab: 'Crear cuenta',
    auth_name: 'Nombre',
    auth_email: 'Correo',
    auth_password: 'Contraseña',
    auth_forgot: 'Olvidé mi contraseña',
    auth_continue_anon: 'Continuar sin cuenta',
    auth_anon_note: 'Sin cuenta puedes ver eventos pero no acumulas puntos ni rango.',
    auth_google: 'Continuar con Google',
    auth_subtitle: 'Alertas y eventos en tiempo real, cerca de ti',
    auth_or: 'o',

    points_road_event: 'Reportar evento de tráfico',
    points_ent_event: 'Reportar evento de entretenimiento',
    points_confirmation: 'Confirmación recibida',
    points_like: 'Me gusta recibido',
    points_comment: 'Publicar comentario',
    points_denial: 'Negación recibida',
  },
};

// ─── Mapeamento país → idioma ─────────────────────────────────────────────────
const COUNTRY_TO_LANG: Record<string, LangCode> = {
  // Português
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt', ST: 'pt', TL: 'pt',
  // Espanhol
  AR: 'es', CL: 'es', CO: 'es', MX: 'es', PE: 'es', VE: 'es', EC: 'es', BO: 'es',
  PY: 'es', UY: 'es', CR: 'es', CU: 'es', DO: 'es', GT: 'es', HN: 'es', NI: 'es',
  PA: 'es', SV: 'es', ES: 'es', GQ: 'es', PH: 'es',
  // Inglês (todos os demais)
};

// ─── Idioma atual (mutável — atualizado pelo GPS) ─────────────────────────────
let _currentLang: LangCode = detectDeviceLang();

function detectDeviceLang(): LangCode {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    const code = locale.split('-')[0].toLowerCase();
    if (code === 'pt') return 'pt';
    if (code === 'es') return 'es';
    return 'en';
  } catch {
    return 'pt';
  }
}

/**
 * Atualiza o idioma com base no país detectado pelo GPS.
 * Chamado em appStore.setUserCountryCode.
 * Retorna true se o idioma mudou (componentes precisam re-renderizar).
 */
export function updateLangFromCountry(countryCode: string): boolean {
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
