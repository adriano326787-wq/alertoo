/**
 * Sistema de internacionalização (i18n).
 *
 * Prioridade do idioma:
 *   1. País detectado pelo GPS (físico) — atualizado via updateLangFromCountry()
 *   2. Locale do dispositivo — detectado ao iniciar
 *   3. Fallback: inglês
 */

export type LangCode = 'pt' | 'en' | 'es' | 'fr';

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
    filter_state_badge: '📍 {state}',
    filter_all_states: '🌐 Todos',

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

    // Geral
    go_to_map_event: 'Ir para o evento no mapa',
    go_to_event: 'Ir para o evento',
    navigate_gps: 'Como chegar',
    navigate_to: 'Navegando até',
    open_in_app: 'Abrir no Alertoo',
    open_in_google_maps: 'Abrir no Google Maps',
    getting_location: 'Obtendo localização…',
    calculating_route: 'Calculando rota…',
    distance: 'Distância',
    eta: 'Tempo',
    arrived: 'Você chegou!',
    steps: 'Próximos passos',
    arrival_time: 'Chegada',
    start_navigation: 'Iniciar navegação',
    cancel: 'Cancelar',
    cancel_navigation: 'Cancelar navegação',
    finish: 'Concluir',
    see_event: 'Ver evento',
    get_app: 'Baixar Alertoo',
    save: 'Salvar',
    saved: 'Salvo',
    search_placeholder: 'Buscar evento ou local…',
    add_photo: 'Adicionar foto',
    change_photo: 'Trocar foto',
    onboarding_skip: 'Pular',
    onboarding_next: 'Próximo',
    onboarding_done: 'Começar',
    share: 'Compartilhar',
    featured: 'Em Destaque',
    advertising: 'Publicidade',
    lang_title: 'Idioma',
    my_active_events: 'Meus Eventos Ativos',
    no_active_events: 'Nenhum evento ativo.',
    change_photo: 'Alterar foto',

    // Perfil — botões de evento
    view: 'Ver',
    manage: 'Gerir',
    promote: 'Promover',
    no_promo: 'Sem promoção ativa',
    days_remaining: 'd restantes',
    buy_credits: 'Comprar',
    admin_label: 'Administrador',
    support_title: 'Apoie o Alertoo',
    support_desc: 'Ajude a manter a plataforma gratuita',

    // Modais de evento
    featured_event: 'Evento em Destaque',
    own_event: 'Este é o seu evento',
    share_alert: 'Compartilhar este alerta',
    share_event: 'Compartilhar evento',

    // Adicionar evento
    add_event_title: 'Adicionar evento',
    add_road_title: 'Reportar alerta',
    add_category: 'Categoria',
    add_event_name: 'Nome do evento',
    add_description: 'Descrição (opcional)',
    add_address: 'Endereço (opcional)',
    add_publish: 'Publicar',
    add_road_type: 'Tipo de ocorrência',
    add_road_report: 'Reportar',

    // Comentários
    comments_title: 'Comentários',
    comments_empty: 'Nenhum comentário ainda.',
    comments_empty_hint: 'Seja o primeiro a comentar!',
    copy_link: 'Copiar link',

    live: 'AO VIVO',

    // Promoção
    promo_header: '🚀 Promover Evento',
    promo_event_label: 'EVENTO A PROMOVER',
    promo_already: 'Promovido — {n}d restantes',
    promo_photo_section: '1. FOTO DO EVENTO (OPCIONAL)',
    promo_change_photo: '✏️ Trocar foto',
    promo_add_photo: 'Toque para adicionar uma foto',
    promo_photo_hint: 'Recomendado: 16:9, máx. 5MB',
    promo_remove_photo: '🗑️ Remover foto',
    promo_tier_section: '2. NÍVEL DE DESTAQUE',
    promo_credits_section: '3. USAR CRÉDITOS',
    promo_credit: 'crédito',
    promo_credits: 'créditos',
    promo_days: 'dias',
    promo_insufficient: 'Créditos insuficientes',
    promo_balance: '🪙 Saldo atual:',
    promo_cost: '💸 Custo:',
    promo_remaining_bal: '✅ Restará:',
    promo_need_more: 'Você precisa de mais créditos',
    promo_buy_package: 'Toque para comprar um pacote',
    promo_uploading: 'Enviando foto... {n}%',
    promo_promoting: 'Promovendo evento...',
    promo_btn_promote: '{emoji} Promover como {tier}',
    promo_btn_buy: '🪙 Comprar créditos primeiro',
    promo_success_title: '🎉 Evento promovido!',
    promo_success_msg: 'Seu evento agora está destacado como {tier} por {days} dias!',
    promo_great: 'Ótimo!',
    promo_bronze_desc_1: 'Pin destacado no mapa',
    promo_bronze_desc_2: 'Badge Bronze visível',
    promo_bronze_desc_3: 'Válido por 7 dias',
    promo_prata_desc_1: 'Pin prateado maior',
    promo_prata_desc_2: 'Badge Prata visível',
    promo_prata_desc_3: 'Destaque no topo da lista',
    promo_prata_desc_4: 'Válido por 14 dias',
    promo_ouro_desc_1: 'Pin dourado animado',
    promo_ouro_desc_2: 'Badge Ouro em destaque',
    promo_ouro_desc_3: 'Fixado no topo da lista',
    promo_ouro_desc_4: 'Destaque na home',
    promo_ouro_desc_5: 'Válido por 30 dias',

    // Pacotes de créditos
    buy_credits_title: '🪙 Comprar Créditos',
    buy_credits_hero: 'Destaque seu evento',
    buy_credits_choose: 'ESCOLHA UM PACOTE',
    buy_credits_what: '💡 O que são créditos?',
    buy_credits_payment: 'MÉTODO DE PAGAMENTO',
    buy_credits_secure: '🔒 Pagamento seguro via Mercado Pago',
    pkg_popular: '⭐ Mais popular',
    pkg_best: '🔥 Melhor valor',
    pkg_credits: '{n} crédito',
    pkg_credits_pl: '{n} créditos',

    // Tiers de promoção
    tier_bronze: 'Bronze',
    tier_prata: 'Prata',
    tier_ouro: 'Ouro',

    // Placeholders dos modais de criação
    add_road_desc_ph: 'Ex: faixa da direita bloqueada...',
    add_ent_name_ph: 'Ex: Noite do Samba no Bar do João',
    add_ent_desc_ph: 'Detalhes, horário, entrada...',
    add_ent_addr_ph: 'Ex: Rua das Flores, 123',

    // EventTypePicker
    picker_title: 'O que deseja reportar?',
    picker_subtitle: 'Selecione o tipo de evento',
    picker_road_title: 'Alerta de Estrada',
    picker_road_desc: 'Acidentes, obras, blitz, alagamentos...',
    picker_ent_title: 'Evento de Entretenimento',
    picker_ent_desc: 'Bares, restaurantes, festas, shows...',

    // Auth extras
    auth_ranks_title: '🏆 Sistema de Ranks',
    auth_ranks_desc: 'Reporte eventos, confirme alertas e ganhe pontos.\nSuba de 🌱 Iniciante até 👑 Mestre!',
    auth_forgot_title: 'Recuperar senha',
    auth_forgot_send: 'Enviar link',
    auth_sent_title: 'E-mail enviado!',
    auth_close: 'Fechar',

    // Verificação de e-mail
    email_verify_title: 'Confirme seu e-mail',
    email_verified_btn: '✓ Já confirmei o e-mail',
    email_not_received: 'Não recebeu o e-mail?',
    email_tip_spam: '• Verifique a pasta de spam ou lixo eletrônico',
    email_tip_wait: '• Aguarde alguns minutos e tente reenviar',
    email_tip_check: '• Confirme se o e-mail está correto',
    email_use_other: 'Usar outro e-mail',

    // Mapa
    map_unavailable: 'Mapa indisponível',

    // Apoio / MercadoPago
    support_modal_title: '💛 Apoie o Alertoo',
    support_modal_hero: 'Ajude a manter o Alertoo gratuito',
    support_modal_secure: '🔒 Pagamento seguro via Mercado Pago',
    support_choose_value: 'Escolha um valor:',
    support_not_now: 'Agora não',

    // Categorias de alerta de estrada
    cat_road_drunkcheck:  'Lei Seca',
    cat_road_policeblitz: 'Blitz Policial',
    cat_road_accident:    'Acidente',
    cat_road_roadwork:    'Obras',
    cat_road_flood:       'Alagamento',
    cat_road_closure:     'Interdição',
    cat_road_traffic:     'Congestionamento',
    cat_road_hazard:      'Perigo na via',

    // Categorias de entretenimento
    cat_ent_bar:        'Bar',
    cat_ent_restaurant: 'Restaurante',
    cat_ent_party:      'Festa',
    cat_ent_show:       'Show',
    cat_ent_festival:   'Festival',
    cat_ent_club:       'Balada',

    // Tempo relativo
    time_just_now:      'agora mesmo',
    time_ago_min:       'há {n} min',
    time_ago_h:         'há {n}h',
    time_ago_d:         'há {n}d',
    time_expired:       'expirado',
    time_expires_min:   'expira em {n} min',
    time_expires_h:     'expira em {n}h',
    time_expires_hm:    'expira em {n}h {m}min',
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
    filter_state_badge: '📍 {state}',
    filter_all_states: '🌐 All',

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

    go_to_map_event: 'Go to event on map',
    go_to_event: 'Go to event',
    navigate_gps: 'Get directions',
    navigate_to: 'Navigating to',
    open_in_app: 'Open in Alertoo',
    open_in_google_maps: 'Open in Google Maps',
    getting_location: 'Getting location…',
    calculating_route: 'Calculating route…',
    distance: 'Distance',
    eta: 'Time',
    arrived: 'You have arrived!',
    steps: 'Next steps',
    arrival_time: 'Arrival',
    start_navigation: 'Start navigation',
    cancel: 'Cancel',
    cancel_navigation: 'Cancel navigation',
    finish: 'Done',
    see_event: 'View event',
    get_app: 'Get Alertoo',
    save: 'Save',
    saved: 'Saved',
    search_placeholder: 'Search event or place…',
    add_photo: 'Add photo',
    change_photo: 'Change photo',
    onboarding_skip: 'Skip',
    onboarding_next: 'Next',
    onboarding_done: 'Get started',
    share: 'Share',
    featured: 'Featured',
    advertising: 'Advertising',
    lang_title: 'Language',
    my_active_events: 'My Active Events',
    no_active_events: 'No active events.',
    change_photo: 'Change photo',

    view: 'View',
    manage: 'Manage',
    promote: 'Promote',
    no_promo: 'No active promotion',
    days_remaining: 'd remaining',
    buy_credits: 'Buy',
    admin_label: 'Administrator',
    support_title: 'Support Alertoo',
    support_desc: 'Help keep the platform free',

    featured_event: 'Featured Event',
    own_event: 'This is your event',
    share_alert: 'Share this alert',
    share_event: 'Share event',

    add_event_title: 'Add event',
    add_road_title: 'Report alert',
    add_category: 'Category',
    add_event_name: 'Event name',
    add_description: 'Description (optional)',
    add_address: 'Address (optional)',
    add_publish: 'Publish',
    add_road_type: 'Occurrence type',
    add_road_report: 'Report',

    comments_title: 'Comments',
    comments_empty: 'No comments yet.',
    comments_empty_hint: 'Be the first to comment!',
    copy_link: 'Copy link',

    live: 'LIVE',

    promo_header: '🚀 Promote Event',
    promo_event_label: 'EVENT TO PROMOTE',
    promo_already: 'Promoted — {n}d remaining',
    promo_photo_section: '1. EVENT PHOTO (OPTIONAL)',
    promo_change_photo: '✏️ Change photo',
    promo_add_photo: 'Tap to add a photo',
    promo_photo_hint: 'Recommended: 16:9, max. 5MB',
    promo_remove_photo: '🗑️ Remove photo',
    promo_tier_section: '2. HIGHLIGHT LEVEL',
    promo_credits_section: '3. USE CREDITS',
    promo_credit: 'credit',
    promo_credits: 'credits',
    promo_days: 'days',
    promo_insufficient: 'Insufficient credits',
    promo_balance: '🪙 Current balance:',
    promo_cost: '💸 Cost:',
    promo_remaining_bal: '✅ Remaining:',
    promo_need_more: 'You need more credits',
    promo_buy_package: 'Tap to buy a package',
    promo_uploading: 'Uploading photo... {n}%',
    promo_promoting: 'Promoting event...',
    promo_btn_promote: '{emoji} Promote as {tier}',
    promo_btn_buy: '🪙 Buy credits first',
    promo_success_title: '🎉 Event promoted!',
    promo_success_msg: 'Your event is now highlighted as {tier} for {days} days!',
    promo_great: 'Great!',
    promo_bronze_desc_1: 'Highlighted pin on map',
    promo_bronze_desc_2: 'Visible Bronze badge',
    promo_bronze_desc_3: 'Valid for 7 days',
    promo_prata_desc_1: 'Larger silver pin',
    promo_prata_desc_2: 'Visible Silver badge',
    promo_prata_desc_3: 'Featured at top of list',
    promo_prata_desc_4: 'Valid for 14 days',
    promo_ouro_desc_1: 'Animated golden pin',
    promo_ouro_desc_2: 'Featured Gold badge',
    promo_ouro_desc_3: 'Pinned at top of list',
    promo_ouro_desc_4: 'Home screen featured',
    promo_ouro_desc_5: 'Valid for 30 days',

    buy_credits_title: '🪙 Buy Credits',
    buy_credits_hero: 'Highlight your event',
    buy_credits_choose: 'CHOOSE A PACKAGE',
    buy_credits_what: '💡 What are credits?',
    buy_credits_payment: 'PAYMENT METHOD',
    buy_credits_secure: '🔒 Secure payment via Mercado Pago',
    pkg_popular: '⭐ Most popular',
    pkg_best: '🔥 Best value',
    pkg_credits: '{n} credit',
    pkg_credits_pl: '{n} credits',

    tier_bronze: 'Bronze',
    tier_prata: 'Silver',
    tier_ouro: 'Gold',

    add_road_desc_ph: 'Ex: right lane blocked...',
    add_ent_name_ph: 'Ex: Saturday Night at John\'s Bar',
    add_ent_desc_ph: 'Details, schedule, entrance fee...',
    add_ent_addr_ph: 'Ex: 123 Flowers St',

    picker_title: 'What do you want to report?',
    picker_subtitle: 'Select event type',
    picker_road_title: 'Road Alert',
    picker_road_desc: 'Accidents, roadwork, checkpoints, flooding...',
    picker_ent_title: 'Entertainment Event',
    picker_ent_desc: 'Bars, restaurants, parties, shows...',

    auth_ranks_title: '🏆 Rank System',
    auth_ranks_desc: 'Report events, confirm alerts and earn points.\nClimb from 🌱 Beginner to 👑 Master!',
    auth_forgot_title: 'Reset password',
    auth_forgot_send: 'Send link',
    auth_sent_title: 'Email sent!',
    auth_close: 'Close',

    email_verify_title: 'Confirm your email',
    email_verified_btn: '✓ I already confirmed my email',
    email_not_received: "Didn't receive the email?",
    email_tip_spam: '• Check your spam or junk folder',
    email_tip_wait: '• Wait a few minutes and try resending',
    email_tip_check: '• Confirm the email address is correct',
    email_use_other: 'Use another email',

    map_unavailable: 'Map unavailable',

    support_modal_title: '💛 Support Alertoo',
    support_modal_hero: 'Help keep Alertoo free',
    support_modal_secure: '🔒 Secure payment via Mercado Pago',
    support_choose_value: 'Choose an amount:',
    support_not_now: 'Not now',

    cat_road_drunkcheck:  'Sobriety Check',
    cat_road_policeblitz: 'Police Checkpoint',
    cat_road_accident:    'Accident',
    cat_road_roadwork:    'Road Work',
    cat_road_flood:       'Flooding',
    cat_road_closure:     'Road Closure',
    cat_road_traffic:     'Traffic Jam',
    cat_road_hazard:      'Road Hazard',

    cat_ent_bar:        'Bar',
    cat_ent_restaurant: 'Restaurant',
    cat_ent_party:      'Party',
    cat_ent_show:       'Show',
    cat_ent_festival:   'Festival',
    cat_ent_club:       'Nightclub',

    time_just_now:    'just now',
    time_ago_min:     '{n} min ago',
    time_ago_h:       '{n}h ago',
    time_ago_d:       '{n}d ago',
    time_expired:     'expired',
    time_expires_min: 'expires in {n} min',
    time_expires_h:   'expires in {n}h',
    time_expires_hm:  'expires in {n}h {m}min',
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
    filter_state_badge: '📍 {state}',
    filter_all_states: '🌐 Todos',

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

    go_to_map_event: 'Ir al evento en el mapa',
    go_to_event: 'Ir al evento',
    navigate_gps: 'Cómo llegar',
    open_in_app: 'Abrir en Alertoo',
    share: 'Compartir',
    featured: 'Destacados',
    advertising: 'Publicidad',
    lang_title: 'Idioma',
    my_active_events: 'Mis Eventos Activos',
    no_active_events: 'No hay eventos activos.',
    change_photo: 'Cambiar foto',

    view: 'Ver',
    manage: 'Gestionar',
    promote: 'Promover',
    no_promo: 'Sin promoción activa',
    days_remaining: 'd restantes',
    buy_credits: 'Comprar',
    admin_label: 'Administrador',
    support_title: 'Apoya Alertoo',
    support_desc: 'Ayuda a mantener la plataforma gratuita',

    featured_event: 'Evento Destacado',
    own_event: 'Este es tu evento',
    share_alert: 'Compartir esta alerta',
    share_event: 'Compartir evento',

    add_event_title: 'Agregar evento',
    add_road_title: 'Reportar alerta',
    add_category: 'Categoría',
    add_event_name: 'Nombre del evento',
    add_description: 'Descripción (opcional)',
    add_address: 'Dirección (opcional)',
    add_publish: 'Publicar',
    add_road_type: 'Tipo de incidente',
    add_road_report: 'Reportar',

    comments_title: 'Comentarios',
    comments_empty: 'Aún no hay comentarios.',
    comments_empty_hint: '¡Sé el primero en comentar!',
    copy_link: 'Copiar enlace',

    live: 'EN VIVO',

    promo_header: '🚀 Promover Evento',
    promo_event_label: 'EVENTO A PROMOVER',
    promo_already: 'Promovido — {n}d restantes',
    promo_photo_section: '1. FOTO DEL EVENTO (OPCIONAL)',
    promo_change_photo: '✏️ Cambiar foto',
    promo_add_photo: 'Toca para agregar una foto',
    promo_photo_hint: 'Recomendado: 16:9, máx. 5MB',
    promo_remove_photo: '🗑️ Eliminar foto',
    promo_tier_section: '2. NIVEL DE DESTAQUE',
    promo_credits_section: '3. USAR CRÉDITOS',
    promo_credit: 'crédito',
    promo_credits: 'créditos',
    promo_days: 'días',
    promo_insufficient: 'Créditos insuficientes',
    promo_balance: '🪙 Saldo actual:',
    promo_cost: '💸 Costo:',
    promo_remaining_bal: '✅ Restará:',
    promo_need_more: 'Necesitas más créditos',
    promo_buy_package: 'Toca para comprar un paquete',
    promo_uploading: 'Enviando foto... {n}%',
    promo_promoting: 'Promoviendo evento...',
    promo_btn_promote: '{emoji} Promover como {tier}',
    promo_btn_buy: '🪙 Comprar créditos primero',
    promo_success_title: '🎉 ¡Evento promovido!',
    promo_success_msg: '¡Tu evento ahora está destacado como {tier} por {days} días!',
    promo_great: '¡Genial!',
    promo_bronze_desc_1: 'Pin destacado en el mapa',
    promo_bronze_desc_2: 'Insignia Bronze visible',
    promo_bronze_desc_3: 'Válido por 7 días',
    promo_prata_desc_1: 'Pin plateado más grande',
    promo_prata_desc_2: 'Insignia Plata visible',
    promo_prata_desc_3: 'Destacado en lo alto de la lista',
    promo_prata_desc_4: 'Válido por 14 días',
    promo_ouro_desc_1: 'Pin dorado animado',
    promo_ouro_desc_2: 'Insignia Oro destacada',
    promo_ouro_desc_3: 'Fijado en lo alto de la lista',
    promo_ouro_desc_4: 'Destacado en inicio',
    promo_ouro_desc_5: 'Válido por 30 días',

    buy_credits_title: '🪙 Comprar Créditos',
    buy_credits_hero: 'Destaca tu evento',
    buy_credits_choose: 'ELIGE UN PAQUETE',
    buy_credits_what: '💡 ¿Qué son los créditos?',
    buy_credits_payment: 'MÉTODO DE PAGO',
    buy_credits_secure: '🔒 Pago seguro vía Mercado Pago',
    pkg_popular: '⭐ Más popular',
    pkg_best: '🔥 Mejor valor',
    pkg_credits: '{n} crédito',
    pkg_credits_pl: '{n} créditos',

    tier_bronze: 'Bronce',
    tier_prata: 'Plata',
    tier_ouro: 'Oro',

    add_road_desc_ph: 'Ej: carril derecho bloqueado...',
    add_ent_name_ph: 'Ej: Noche de Salsa en el Bar de Juan',
    add_ent_desc_ph: 'Detalles, horario, entrada...',
    add_ent_addr_ph: 'Ej: Calle de las Flores, 123',

    picker_title: '¿Qué deseas reportar?',
    picker_subtitle: 'Selecciona el tipo de evento',
    picker_road_title: 'Alerta de Tráfico',
    picker_road_desc: 'Accidentes, obras, controles, inundaciones...',
    picker_ent_title: 'Evento de Entretenimiento',
    picker_ent_desc: 'Bares, restaurantes, fiestas, shows...',

    auth_ranks_title: '🏆 Sistema de Rangos',
    auth_ranks_desc: 'Reporta eventos, confirma alertas y gana puntos.\n¡Sube de 🌱 Principiante a 👑 Maestro!',
    auth_forgot_title: 'Recuperar contraseña',
    auth_forgot_send: 'Enviar enlace',
    auth_sent_title: '¡Correo enviado!',
    auth_close: 'Cerrar',

    email_verify_title: 'Confirma tu correo',
    email_verified_btn: '✓ Ya confirmé mi correo',
    email_not_received: '¿No recibiste el correo?',
    email_tip_spam: '• Revisa tu carpeta de spam',
    email_tip_wait: '• Espera unos minutos e intenta reenviar',
    email_tip_check: '• Confirma que el correo es correcto',
    email_use_other: 'Usar otro correo',

    map_unavailable: 'Mapa no disponible',

    support_modal_title: '💛 Apoya Alertoo',
    support_modal_hero: 'Ayuda a mantener Alertoo gratuito',
    support_modal_secure: '🔒 Pago seguro vía Mercado Pago',
    support_choose_value: 'Elige un monto:',
    support_not_now: 'Ahora no',

    cat_road_drunkcheck:  'Control de Alcoholemia',
    cat_road_policeblitz: 'Control Policial',
    cat_road_accident:    'Accidente',
    cat_road_roadwork:    'Obras',
    cat_road_flood:       'Inundación',
    cat_road_closure:     'Cierre de vía',
    cat_road_traffic:     'Tráfico',
    cat_road_hazard:      'Peligro en la vía',

    cat_ent_bar:        'Bar',
    cat_ent_restaurant: 'Restaurante',
    cat_ent_party:      'Fiesta',
    cat_ent_show:       'Show',
    cat_ent_festival:   'Festival',
    cat_ent_club:       'Discoteca',

    time_just_now:    'ahora mismo',
    time_ago_min:     'hace {n} min',
    time_ago_h:       'hace {n}h',
    time_ago_d:       'hace {n}d',
    time_expired:     'expirado',
    time_expires_min: 'expira en {n} min',
    time_expires_h:   'expira en {n}h',
    time_expires_hm:  'expira en {n}h {m}min',
  },

  fr: {
    tab_road: 'Route',
    tab_map: 'Carte',
    tab_events: 'Événements',
    tab_profile: 'Profil',

    filter_title: 'Filtrer les alertes',
    filter_clear: 'Effacer le filtre',
    filter_region: 'Région',
    filter_city: 'Ville en',
    filter_showing: 'Affichage des alertes de :',
    filter_whole_region: 'Toute la région de',
    filter_cancel: 'Annuler',
    filter_apply: 'Appliquer',
    filter_no_regions: 'Aucune région disponible',

    profile_visitor: 'Vous naviguez en tant que visiteur',
    profile_visitor_desc: 'Créez un compte pour gagner des points, monter en rang et sauvegarder votre historique.',
    profile_create_account: 'Créer un compte',
    profile_sign_in: "J'ai déjà un compte",
    profile_ranks_title: 'Rangs disponibles :',
    profile_how_to_earn: 'Comment gagner des points :',
    profile_sign_out: 'Se déconnecter',
    profile_sign_out_confirm: 'Déconnexion',
    profile_sign_out_cancel: 'Annuler',
    profile_sign_out_msg: 'Voulez-vous vous déconnecter ?',
    profile_member_since: 'Membre depuis',
    profile_points_title: 'Points',
    profile_all_ranks: 'Tous les rangs',
    profile_how_to_earn_short: 'Comment gagner des points',
    profile_events_reported: 'Événements\nsignalés',
    profile_comments_posted: 'Commentaires\npubliés',
    profile_edit_name: 'Modifier le nom',
    profile_edit_name_placeholder: 'Votre nom',
    profile_save: 'Enregistrer',

    rank_iniciante:    'Débutant',
    rank_explorador:   'Explorateur',
    rank_colaborador:  'Contributeur',
    rank_especialista: 'Expert',
    rank_mestre:       'Maître',
    rank_start:        'Début',
    rank_max:          'pts — Rang maximum atteint ! 🎉',
    rank_progress:     'pts pour le prochain rang',

    road_title: 'Alertes Routières',
    road_confirm: '✓ Confirmer',
    road_deny: '✗ Refuser',
    road_voted: 'Vous avez déjà voté sur cet événement',
    road_own: 'Votre événement',
    road_empty: "Pas d'alertes actives pour le moment.",
    road_empty_hint: 'Appuyez sur la carte pour signaler un événement.',
    filter_state_badge: '📍 {state}',
    filter_all_states: '🌐 Tous',

    ent_title: 'Divertissement',
    ent_add: '+ Ajouter',
    ent_empty: "Pas encore d'événements ici.",
    ent_empty_hint: 'Appuyez sur "+ Ajouter" ou sur la carte pour créer !',
    ent_load_more: 'Charger plus',

    map_tap_hint: 'Appuyez sur la carte pour signaler',
    map_checking: 'Vérification de la localisation...',

    auth_sign_in_tab: 'Se connecter',
    auth_register_tab: 'Créer un compte',
    auth_name: 'Nom',
    auth_email: 'E-mail',
    auth_password: 'Mot de passe',
    auth_forgot: 'Mot de passe oublié',
    auth_continue_anon: 'Continuer sans compte',
    auth_anon_note: "Sans compte vous pouvez voir les événements mais vous n'accumulerez pas de points ni de rang.",
    auth_google: 'Continuer avec Google',
    auth_subtitle: 'Alertes et événements en temps réel, près de vous',
    auth_or: 'ou',

    points_road_event: 'Signaler un événement routier',
    points_ent_event: 'Signaler un événement de divertissement',
    points_confirmation: 'Confirmation reçue',
    points_like: "J'aime reçu",
    points_comment: 'Publier un commentaire',
    points_denial: 'Refus reçu',

    go_to_map_event: "Aller à l'événement sur la carte",
    go_to_event: "Aller à l'événement",
    navigate_gps: "Itinéraire",
    open_in_app: "Ouvrir dans Alertoo",
    share: 'Partager',
    featured: 'En vedette',
    advertising: 'Publicité',
    lang_title: 'Langue',
    my_active_events: 'Mes Événements Actifs',
    no_active_events: 'Aucun événement actif.',
    change_photo: 'Changer la photo',

    view: 'Voir',
    manage: 'Gérer',
    promote: 'Promouvoir',
    no_promo: 'Aucune promotion active',
    days_remaining: 'j restants',
    buy_credits: 'Acheter',
    admin_label: 'Administrateur',
    support_title: 'Soutenez Alertoo',
    support_desc: 'Aidez à garder la plateforme gratuite',

    featured_event: 'Événement en vedette',
    own_event: "C'est votre événement",
    share_alert: 'Partager cette alerte',
    share_event: 'Partager événement',

    add_event_title: 'Ajouter un événement',
    add_road_title: 'Signaler une alerte',
    add_category: 'Catégorie',
    add_event_name: "Nom de l'événement",
    add_description: 'Description (facultative)',
    add_address: 'Adresse (facultative)',
    add_publish: 'Publier',
    add_road_type: "Type d'incident",
    add_road_report: 'Signaler',

    comments_title: 'Commentaires',
    comments_empty: 'Aucun commentaire pour le moment.',
    comments_empty_hint: 'Soyez le premier à commenter !',
    copy_link: 'Copier le lien',

    live: 'EN DIRECT',

    promo_header: "🚀 Promouvoir l'événement",
    promo_event_label: 'ÉVÉNEMENT À PROMOUVOIR',
    promo_already: 'Promu — {n}j restants',
    promo_photo_section: "1. PHOTO DE L'ÉVÉNEMENT (FACULTATIVE)",
    promo_change_photo: '✏️ Changer la photo',
    promo_add_photo: 'Appuyez pour ajouter une photo',
    promo_photo_hint: 'Recommandé : 16:9, max. 5 Mo',
    promo_remove_photo: '🗑️ Supprimer la photo',
    promo_tier_section: '2. NIVEAU DE MISE EN AVANT',
    promo_credits_section: '3. UTILISER DES CRÉDITS',
    promo_credit: 'crédit',
    promo_credits: 'crédits',
    promo_days: 'jours',
    promo_insufficient: 'Crédits insuffisants',
    promo_balance: '🪙 Solde actuel :',
    promo_cost: '💸 Coût :',
    promo_remaining_bal: '✅ Restera :',
    promo_need_more: 'Vous avez besoin de plus de crédits',
    promo_buy_package: 'Appuyez pour acheter un package',
    promo_uploading: 'Envoi de la photo... {n}%',
    promo_promoting: "Promotion en cours...",
    promo_btn_promote: '{emoji} Promouvoir en {tier}',
    promo_btn_buy: "🪙 Acheter des crédits d'abord",
    promo_success_title: '🎉 Événement promu !',
    promo_success_msg: 'Votre événement est maintenant mis en avant en tant que {tier} pour {days} jours !',
    promo_great: 'Super !',
    promo_bronze_desc_1: 'Épingle mise en avant sur la carte',
    promo_bronze_desc_2: 'Badge Bronze visible',
    promo_bronze_desc_3: 'Valable 7 jours',
    promo_prata_desc_1: 'Épingle argentée plus grande',
    promo_prata_desc_2: 'Badge Argent visible',
    promo_prata_desc_3: 'En tête de liste',
    promo_prata_desc_4: 'Valable 14 jours',
    promo_ouro_desc_1: 'Épingle dorée animée',
    promo_ouro_desc_2: 'Badge Or en vedette',
    promo_ouro_desc_3: 'Épinglé en haut de liste',
    promo_ouro_desc_4: "Mis en avant sur l'accueil",
    promo_ouro_desc_5: 'Valable 30 jours',

    buy_credits_title: '🪙 Acheter des Crédits',
    buy_credits_hero: 'Mettez en avant votre événement',
    buy_credits_choose: 'CHOISISSEZ UN PACKAGE',
    buy_credits_what: '💡 Que sont les crédits ?',
    buy_credits_payment: 'MÉTHODE DE PAIEMENT',
    buy_credits_secure: '🔒 Paiement sécurisé via Mercado Pago',
    pkg_popular: '⭐ Le plus populaire',
    pkg_best: '🔥 Meilleur rapport qualité-prix',
    pkg_credits: '{n} crédit',
    pkg_credits_pl: '{n} crédits',

    tier_bronze: 'Bronze',
    tier_prata: 'Argent',
    tier_ouro: 'Or',

    add_road_desc_ph: 'Ex : voie droite bloquée...',
    add_ent_name_ph: "Ex : Soirée Jazz au Bar de Pierre",
    add_ent_desc_ph: 'Détails, horaires, entrée...',
    add_ent_addr_ph: 'Ex : 123 rue des Fleurs',

    picker_title: 'Que souhaitez-vous signaler ?',
    picker_subtitle: "Sélectionnez le type d'événement",
    picker_road_title: 'Alerte Routière',
    picker_road_desc: 'Accidents, travaux, contrôles, inondations...',
    picker_ent_title: 'Événement de Divertissement',
    picker_ent_desc: 'Bars, restaurants, fêtes, spectacles...',

    auth_ranks_title: '🏆 Système de Rangs',
    auth_ranks_desc: 'Signalez des événements, confirmez des alertes et gagnez des points.\nMontez de 🌱 Débutant à 👑 Maître !',
    auth_forgot_title: 'Récupérer le mot de passe',
    auth_forgot_send: 'Envoyer le lien',
    auth_sent_title: 'E-mail envoyé !',
    auth_close: 'Fermer',

    email_verify_title: 'Confirmez votre e-mail',
    email_verified_btn: "✓ J'ai déjà confirmé mon e-mail",
    email_not_received: "Vous n'avez pas reçu l'e-mail ?",
    email_tip_spam: '• Vérifiez votre dossier spam ou courrier indésirable',
    email_tip_wait: '• Attendez quelques minutes et réessayez',
    email_tip_check: "• Vérifiez que l'adresse e-mail est correcte",
    email_use_other: 'Utiliser un autre e-mail',

    map_unavailable: 'Carte indisponible',

    support_modal_title: '💛 Soutenez Alertoo',
    support_modal_hero: 'Aidez à garder Alertoo gratuit',
    support_modal_secure: '🔒 Paiement sécurisé via Mercado Pago',
    support_choose_value: 'Choisissez un montant :',
    support_not_now: 'Pas maintenant',

    cat_road_drunkcheck:  'Contrôle alcoolémie',
    cat_road_policeblitz: 'Contrôle policier',
    cat_road_accident:    'Accident',
    cat_road_roadwork:    'Travaux',
    cat_road_flood:       'Inondation',
    cat_road_closure:     'Fermeture de route',
    cat_road_traffic:     'Embouteillage',
    cat_road_hazard:      'Danger sur la route',

    cat_ent_bar:        'Bar',
    cat_ent_restaurant: 'Restaurant',
    cat_ent_party:      'Fête',
    cat_ent_show:       'Spectacle',
    cat_ent_festival:   'Festival',
    cat_ent_club:       'Boîte de nuit',

    time_just_now:    'à l\'instant',
    time_ago_min:     'il y a {n} min',
    time_ago_h:       'il y a {n}h',
    time_ago_d:       'il y a {n}j',
    time_expired:     'expiré',
    time_expires_min: 'expire dans {n} min',
    time_expires_h:   'expire dans {n}h',
    time_expires_hm:  'expire dans {n}h {m}min',
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
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
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
