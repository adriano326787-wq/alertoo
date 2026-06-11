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
    tab_ranking: 'Ranking',

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
    share_rank_title: 'Compartilhar meu rank',
    edit_event: 'Editar evento',

    // Adicionar evento
    add_event_title: 'Adicionar evento',
    add_road_title: 'Reportar alerta',
    add_category: 'Categoria',
    add_event_name: 'Nome do evento',
    add_description: 'Descrição (opcional)',
    add_address: 'Endereço (opcional)',
    add_publish: 'Publicar',
    add_road_type: 'Tipo de ocorrência',
    add_road_speed_limit: 'Limite de velocidade',
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
    cat_road_radar:       'Radar',

    // Notificação push — detecção de trânsito por GPS
    traffic_alert_slow_title:    'Trânsito lento detectado',
    traffic_alert_stopped_title: 'Você está parado há um tempo',
    traffic_alert_notif_body:    'Toque para reportar o que está acontecendo',

    // Rastreamento em segundo plano (#43-b) — toggle no perfil + notificação persistente (Android)
    bg_traffic_setting_title: 'Alertas de trânsito fora do app',
    bg_traffic_setting_desc: 'Receba avisos de trânsito lento ou parado mesmo com o app fechado, enquanto você dirige.',
    notif_channel_alerts: 'Alertas',
    notif_channel_monitoring: 'Monitoramento de trânsito',
    radar_title: 'Radar',
    radar_type_fixed: 'Radar fixo',
    radar_type_mobile: 'Radar móvel',
    radar_type_blitz: 'Fiscalização',
    radar_pending_tag: 'Aguardando confirmações',
    radar_pending_note: 'Seu radar ficará visível para todos após 2 confirmações de outros usuários.',
    radar_still_there: 'Ainda está aí',
    radar_gone: 'Não existe mais',
    radar_last_confirmed: 'Última confirmação',
    radar_already_voted: 'Você já votou neste radar recentemente.',
    radar_delete: 'Excluir radar',
    radar_delete_confirm: 'Tem certeza que deseja excluir este radar?',
    radar_select_type: 'Tipo de radar',
    radar_confirm_prompt_title: 'Radar próximo',
    radar_confirm_prompt_msg: 'Esse radar ainda está aí?',
    bg_traffic_notif_title: 'Alertoo está monitorando o trânsito',
    bg_traffic_notif_body: 'Você será avisado se o trânsito ficar lento ou parar',
    bg_traffic_permission_denied: 'Permissão de localização negada. Ative o acesso à localização nas configurações do app.',
    bg_traffic_foreground_only: 'Para alertas com o app fechado, permita o acesso à localização "Sempre" nas configurações do app.',

    // Categorias de entretenimento
    cat_ent_bar:        'Bar',
    cat_ent_restaurant: 'Restaurante',
    cat_ent_restaurante: 'Restaurante',
    cat_ent_party:      'Festa',
    cat_ent_festa:      'Festa',
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
    time_expires_d:     'expira em {n} dia',
    time_expires_dp:    'expira em {n} dias',

    // Ações de voto
    confirm: 'Confirma',
    deny: 'Nega',
    road_confirm_action: 'Confirmar',
    road_deny_action: 'Negar',
    time_left_label: 'Resta',
    speed_limit_stat: 'Limite',

    // Notificações locais
    notification_road: '🚨 Alerta de Estrada',
    notification_ent:  '🎉 Evento',

    // Perfil — hardcoded strings
    credits_unlimited_admin: 'créditos ilimitados (Admin)',
    credits_label_one: 'crédito disponível',
    credits_label_other: 'créditos disponíveis',
    saved_events: 'Eventos Salvos',
    fav_empty: 'Nenhum evento salvo ainda.\nToque em ☆ num evento para salvá-lo.',
    fav_ent: '🎉 Entretenimento',
    fav_road: '🚦 Trânsito',
    fav_view: 'Ver',
    fav_go: 'Ir ao local',
    driver_mode_title: 'Modo Motorista',
    driver_no_alerts: 'Nenhum alerta próximo',
    driver_clear_road: 'Via livre — nenhum alerta próximo',
    driver_exit: 'Sair do modo motorista',

    // Comentários
    comments_placeholder: 'Escreva um comentário...',

    // Onboarding (multi-idioma)
    onboarding_title_1: 'Tudo que acontece perto de você',
    onboarding_sub_1: 'Eventos, alertas de trânsito e o que está bombando agora — em tempo real no mapa.',
    onboarding_title_2: 'Descubra rolês incríveis',
    onboarding_sub_2: 'Festas, shows, restaurantes e festivais. Salve os seus preferidos pra voltar depois.',
    onboarding_title_3: 'Chegue mais rápido',
    onboarding_sub_3: 'Navegação GPS com instruções por voz e alertas da comunidade pra evitar engarrafamentos.',

    // #20 — missing keys used in MapScreen / CommentsModal / ProfileScreen
    too_far_title: 'Muito longe',
    too_far_msg: 'Você só pode reportar eventos num raio de {km} km.\n\nDistância: {dist} km.',
    water_area_title: 'Área inválida',
    water_area_msg: 'Não é possível criar eventos em áreas de água (oceano, baía, lago ou represa).\n\nToque em uma via ou local terrestre.',
    offline_banner: 'Sem conexão — dados podem estar desatualizados',
    login_required: 'Login necessário',
    comment_login_msg: 'Faça login para comentar nos eventos.',
    comment_send_error: 'Não foi possível enviar o comentário. Tente novamente.',
    load_more: 'Carregar mais',
    you: 'Você',
    error: 'Erro',
    remove: 'Remover',
    fav_remove_title: 'Remover favorito',
    fav_remove_msg: 'Deseja remover este evento dos favoritos?',
    map_hint: 'Toque no mapa para reportar um evento',
    filter_btn_label: 'Filtrar eventos por região',
    location_btn_label: 'Centralizar na minha localização',
    send_comment: 'Enviar comentário',
    close: 'Fechar',
    road_events_title: 'Meus Alertas Ativos',

    // Navegação GPS — #3/#8
    nav_then: 'Depois,',
    nav_destination: 'DESTINO',
    nav_recenter: 'Recentralizar',
    nav_recalculating: 'Recalculando rota.',
    nav_starting: 'Iniciando navegação.',
    nav_arrived_dest: 'Você chegou ao destino.',
    nav_now: 'Agora.',
    nav_voice_toggle: 'Ativar/desativar voz',
    nav_steps_toggle: 'Mostrar/ocultar passos',

    // App — #8
    welcome_back: 'Bem-vindo de volta, {name}!',

    // Modais — #1/#2 strings de Alert (#9 Ciclo 8)
    discard_draft_title: 'Descartar rascunho?',
    discard_draft_msg: 'Você preencheu a descrição. Deseja descartar e fechar?',
    keep_editing: 'Continuar editando',
    discard: 'Descartar',
    inappropriate_content: 'Conteúdo inadequado',
    report_failed: 'Não foi possível reportar',
    permission_required: 'Permissão necessária',
    gallery_permission_msg: 'Permita o acesso à galeria para escolher uma foto.',
    invalid_type: 'Tipo inválido',
    invalid_type_msg: 'Por favor, selecione uma imagem (JPEG, PNG, etc.).',
    photo_too_large: 'Foto muito grande',
    photo_too_large_msg: 'Escolha uma imagem menor que 8 MB.',
    invalid_name: 'Nome inválido',
    invalid_name_msg: 'O nome precisa ter pelo menos 2 caracteres.',
    reauth_required: 'Confirmação necessária',
    reauth_required_msg: 'Por segurança, faça logout e entre novamente antes de excluir a conta.',

    // Store — mensagens de rate-limit e erros (#5/#6 Ciclo 8)
    login_required_road: 'Faça login para reportar alertas de estrada.',
    login_required_ent: 'Faça login para publicar eventos.',
    rate_limit_wait: 'Aguarde {remaining}s antes de criar outro evento.',
    rate_limit_comment: 'Aguarde {remaining}s antes de comentar novamente.',
    error_loading_events: 'Erro ao carregar eventos. Puxe para atualizar.',

    // ContentFilter — (#7 Ciclo 8)
    content_label_title: 'título',
    content_label_description: 'descrição',
    content_label_address: 'endereço',
    content_inappropriate: 'O {label} contém um termo inadequado. Por favor, revise o conteúdo antes de publicar.',

    // AddEntertainmentModal — strings hardcoded corrigidas
    address_required: 'Endereço obrigatório',
    address_required_msg: 'Informe o endereço do local para que outras pessoas possam encontrá-lo.',
    address_incomplete: 'Endereço incompleto',
    address_incomplete_msg: 'Por favor, informe o nome da rua e um número ou bairro.',
    geocoding_searching: '🔍 buscando...',
    geocoding_detecting: 'Detectando endereço...',
    geocode_suggestion: 'Sugestão',
    address_placeholder: 'Ex: Rua das Flores, 123 — Centro',
    field_required_address: '⚠ Endereço obrigatório',
    photo_optional: '📷 Foto (opcional)',
    add_event_link: '🔗 Link do evento (opcional)',
    event_link_open: 'Abrir link',
    publish_failed: 'Não foi possível publicar',

    // EntertainmentScreen — strings hardcoded
    location_permission_denied: 'Permissão negada',
    location_permission_msg: 'Ative a localização para adicionar eventos.',
    location_fetch_error: 'Não foi possível obter sua localização. Verifique o GPS.',
    error_load_more: 'Não foi possível carregar mais eventos. Tente novamente.',
    error_retry_suffix: 'Toque para tentar novamente.',

    // ProfileScreen — strings hardcoded
    photo_save_error: 'Não foi possível salvar a foto. Tente novamente.',
    name_save_error: 'Não foi possível salvar o nome. Tente novamente.',
    delete_account_title: '⚠️ Excluir conta',
    delete_account_msg: 'Todos os seus dados serão excluídos permanentemente. Esta ação não pode ser desfeita.',
    delete_account_confirm: 'Excluir minha conta',
    delete_account_btn: '🗑️ Excluir minha conta',

    // AuthScreen — strings hardcoded
    auth_name_label: 'Nome',
    auth_name_placeholder: 'Seu nome completo',
    auth_password_placeholder: 'Mínimo 6 caracteres',
    auth_confirm_password_label: 'Confirmar senha',
    auth_confirm_password_placeholder: 'Repita a senha',
    auth_show_password: 'Mostrar senha',
    auth_hide_password: 'Ocultar senha',
    auth_show_confirm_password: 'Mostrar confirmação de senha',
    auth_hide_confirm_password: 'Ocultar confirmação de senha',
    auth_google_token_error: 'Não foi possível obter o ID token do Google.\n\nVerifique se o SHA-1 do app está registrado no Firebase Console e se o Web Client ID corresponde ao mesmo projeto.',
    auth_google_error_title: 'Erro Google',
    auth_google_signin_failed: 'Não foi possível entrar com Google.',
    auth_reset_no_email_title: 'Informe o e-mail',
    auth_reset_no_email_msg: 'Digite o e-mail cadastrado para receber o link.',
    auth_reset_user_not_found: 'Nenhuma conta encontrada com este e-mail.',
    auth_reset_invalid_email: 'E-mail inválido.',
    auth_reset_failed: 'Não foi possível enviar o e-mail. Tente novamente.',
    auth_anon_display_name: 'Visitante',
    auth_anon_failed: 'Não foi possível entrar. Verifique se o acesso anônimo está ativado no Firebase Console.',
    auth_required_fields_title: 'Campos obrigatórios',
    auth_required_email_password_msg: 'Preencha e-mail e senha.',
    auth_name_required_msg: 'Informe seu nome.',
    auth_invalid_email_title: 'E-mail inválido',
    auth_invalid_email_msg: 'Digite um endereço de e-mail válido.',
    auth_weak_password_title: 'Senha fraca',
    auth_weak_password_msg: 'A senha precisa ter no mínimo 6 caracteres.',
    auth_passwords_mismatch_title: 'Senhas não coincidem',
    auth_passwords_mismatch_msg: 'A confirmação de senha está diferente. Verifique e tente novamente.',
    auth_wrong_password: 'Senha incorreta.',
    auth_invalid_credential: 'E-mail ou senha incorretos.',
    auth_user_not_found: 'E-mail não encontrado.',
    auth_email_in_use: 'Este e-mail já está cadastrado.',
    auth_weak_password: 'Senha fraca (mínimo 6 caracteres).',
    auth_invalid_email_code: 'E-mail inválido.',
    auth_failed: 'Erro ao autenticar. Tente novamente.',
    auth_forgot_desc: 'Informe seu e-mail e enviaremos um link para redefinir sua senha.',
    auth_reset_sent_desc: 'Enviamos o link de recuperação para:',
    auth_reset_spam_hint: 'Verifique também a pasta de spam caso não encontre.',

    // MapScreen — strings hardcoded
    event_not_found_title: 'Evento não encontrado',
    event_not_found_msg: 'Este evento pode ter expirado ou sido removido.',
    location_disabled_title: 'Localização desativada',
    location_disabled_msg: 'Ative a permissão de localização nas configurações do celular para centralizar o mapa.',

    // NavigationModal — strings hardcoded
    nav_location_denied: 'Permissão de localização negada',
    nav_location_error: 'Erro ao obter localização',
    nav_route_error: 'Não foi possível calcular a rota',
    nav_start_btn: '▶  Iniciar',
    nav_finish_btn: '✓  Concluir',

    // MercadoPagoModal — strings hardcoded
    support_modal_body: 'O Alertoo é desenvolvido com muito carinho e mantido sem anúncios intrusivos. Sua doação ajuda a pagar servidores, mapas e novidades.',
    donate_mp_failed: 'Não foi possível abrir o Mercado Pago. Verifique sua conexão.',
    donate_tier_cafe_label: 'Café',
    donate_tier_cafe_desc: 'Um café para o time',
    donate_tier_apoio_label: 'Apoio',
    donate_tier_apoio_desc: 'Ajuda com o servidor',
    donate_tier_parceiro_label: 'Parceiro',
    donate_tier_parceiro_desc: 'Parceiro do Alertoo',
    donate_tier_heroi_label: 'Herói',
    donate_tier_heroi_desc: 'Herói da comunidade',

    // BuyCreditsScreen — strings hardcoded
    buy_credits_hero_desc: 'Use créditos para promover seus restaurantes, bares e eventos no mapa com destaque especial.',
    buy_credits_watch_ad_title: 'Assistir anúncio → +1 crédito',
    buy_credits_ad_cooldown: '⏳ Disponível novamente em 1 hora',
    buy_credits_ad_ready: '✅ Anúncio pronto — toque para assistir',
    buy_credits_ad_loading: '⏳ Carregando anúncio...',
    buy_credits_or_buy: 'ou compre créditos',
    buy_credits_ad_reward_title: '🎉 +1 crédito!',
    buy_credits_ad_reward_msg: 'Você ganhou 1 crédito de promoção assistindo ao anúncio.',
    buy_credits_ad_reward_btn: 'Ótimo!',
    buy_credits_ad_failed: 'Não foi possível exibir o anúncio.',
    buy_credits_payment_failed_title: '❌ Pagamento não concluído',
    buy_credits_payment_failed_msg: 'O pagamento foi cancelado ou recusado. Tente novamente.',
    buy_credits_fallback_title: '⚠️ Link genérico aberto',
    buy_credits_fallback_msg: 'Não foi possível gerar um link personalizado. Após concluir o pagamento, entre em contato pela tela de Perfil para receber seus créditos.',
    buy_credits_fallback_btn: 'Entendido',
    buy_credits_open_mp_failed: 'Não foi possível abrir o Mercado Pago.',
    buy_credits_confirmed_title: '✅ Pagamento confirmado!',
    buy_credits_confirmed_msg: '{credits} crédito(s) adicionado(s) à sua conta.',
    buy_credits_pending_title: '⏳ Pagamento em processamento',
    buy_credits_pending_msg: 'Seu pagamento ainda está sendo processado pelo Mercado Pago. Aguarde alguns minutos e tente novamente.',
    buy_credits_rejected_title: '❌ Pagamento não aprovado',
    buy_credits_rejected_msg: 'O pagamento foi recusado ou cancelado. Tente novamente.',
    buy_credits_verify_failed: 'Não foi possível verificar o pagamento.',
    try_again: 'Tentar novamente',
    understood: 'Entendido',

    // CommentsModal
    comment_cooldown: 'Aguarde {n}s para comentar novamente.',
    comments_anonymous_user: 'Usuário',

    // Sistema de denúncia (Opção D)
    report_event: 'Denunciar evento',
    report_reason_title: 'Motivo da denúncia',
    report_reason_nudity: 'Foto inapropriada / nudez',
    report_reason_violence: 'Violência ou conteúdo perturbador',
    report_reason_spam: 'Spam ou conteúdo enganoso',
    report_reason_other: 'Outro',
    report_note_placeholder: 'Detalhes adicionais (opcional)',
    report_send: 'Enviar denúncia',
    report_sending: 'Enviando...',
    report_success_title: 'Denúncia enviada',
    report_success_msg: 'Obrigado! Nossa equipe irá analisar o conteúdo.',
    report_already_sent: 'Você já denunciou este evento.',
    report_login_required: 'Faça login para denunciar eventos.',

    // Leaderboard
    leaderboard_title: 'Ranking',
    leaderboard_sub: 'Top usuários por pontuação',

    // FilterModal — categoria de entretenimento
    filter_category: 'Categoria de evento',
  },

  en: {
    tab_road: 'Road',
    tab_map: 'Map',
    tab_events: 'Events',
    tab_profile: 'Profile',
    tab_ranking: 'Ranking',

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
    share_rank_title: 'Share my rank',
    edit_event: 'Edit event',

    add_event_title: 'Add event',
    add_road_title: 'Report alert',
    add_category: 'Category',
    add_event_name: 'Event name',
    add_description: 'Description (optional)',
    add_address: 'Address (optional)',
    add_publish: 'Publish',
    add_road_type: 'Occurrence type',
    add_road_speed_limit: 'Speed limit',
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
    cat_road_radar:       'Speed Camera',

    traffic_alert_slow_title:    'Slow traffic detected',
    traffic_alert_stopped_title: "You've been stopped for a while",
    traffic_alert_notif_body:    "Tap to report what's happening",

    // Background tracking (#43-b) — profile toggle + persistent notification (Android)
    bg_traffic_setting_title: 'Traffic alerts outside the app',
    bg_traffic_setting_desc: 'Get notified about slow or stopped traffic even with the app closed while you drive.',
    notif_channel_alerts: 'Alerts',
    notif_channel_monitoring: 'Traffic monitoring',
    radar_title: 'Speed camera',
    radar_type_fixed: 'Fixed camera',
    radar_type_mobile: 'Mobile camera',
    radar_type_blitz: 'Checkpoint',
    radar_pending_tag: 'Awaiting confirmations',
    radar_pending_note: 'Your camera will be visible to everyone after 2 confirmations from other users.',
    radar_still_there: 'Still there',
    radar_gone: 'No longer there',
    radar_last_confirmed: 'Last confirmed',
    radar_already_voted: 'You already voted on this camera recently.',
    radar_delete: 'Delete camera',
    radar_delete_confirm: 'Are you sure you want to delete this camera?',
    radar_select_type: 'Camera type',
    radar_confirm_prompt_title: 'Camera nearby',
    radar_confirm_prompt_msg: 'Is this camera still there?',
    bg_traffic_notif_title: 'Alertoo is monitoring traffic',
    bg_traffic_notif_body: "You'll be notified if traffic slows down or stops",
    bg_traffic_permission_denied: 'Location permission denied. Enable location access in the app settings.',
    bg_traffic_foreground_only: 'For alerts with the app closed, allow "Always" location access in the app settings.',

    cat_ent_bar:        'Bar',
    cat_ent_restaurant: 'Restaurant',
    cat_ent_restaurante: 'Restaurant',
    cat_ent_party:      'Party',
    cat_ent_festa:      'Party',
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
    time_expires_d:   'expires in {n} day',
    time_expires_dp:  'expires in {n} days',

    confirm: 'Confirms',
    deny: 'Denies',
    road_confirm_action: 'Confirm',
    road_deny_action: 'Deny',
    time_left_label: 'Left',
    speed_limit_stat: 'Limit',

    notification_road: '🚨 Road Alert',
    notification_ent:  '🎉 Event',

    credits_unlimited_admin: 'unlimited credits (Admin)',
    credits_label_one: 'credit available',
    credits_label_other: 'credits available',
    saved_events: 'Saved Events',
    fav_empty: 'No saved events yet.\nTap ☆ on an event to save it.',
    fav_ent: '🎉 Entertainment',
    fav_road: '🚦 Traffic',
    fav_view: 'View',
    fav_go: 'Go there',
    driver_mode_title: 'Driver Mode',
    driver_no_alerts: 'No nearby alerts',
    driver_clear_road: 'Clear road — no alerts nearby',
    driver_exit: 'Exit driver mode',

    comments_placeholder: 'Write a comment...',

    onboarding_title_1: 'Everything happening near you',
    onboarding_sub_1: 'Events, traffic alerts and what\'s happening now — in real time on the map.',
    onboarding_title_2: 'Discover amazing events',
    onboarding_sub_2: 'Parties, shows, restaurants and festivals. Save your favorites to come back later.',
    onboarding_title_3: 'Get there faster',
    onboarding_sub_3: 'GPS navigation with voice directions and community alerts to avoid traffic jams.',

    too_far_title: 'Too far',
    too_far_msg: 'You can only report events within {km} km.\n\nDistance: {dist} km.',
    water_area_title: 'Invalid area',
    water_area_msg: 'Cannot create events in water areas (ocean, bay, lake or reservoir).\n\nTap on a road or land area.',
    offline_banner: 'No connection — data may be outdated',
    login_required: 'Login required',
    comment_login_msg: 'Sign in to comment on events.',
    comment_send_error: 'Could not send comment. Please try again.',
    load_more: 'Load more',
    you: 'You',
    error: 'Error',
    remove: 'Remove',
    fav_remove_title: 'Remove favorite',
    fav_remove_msg: 'Remove this event from favorites?',
    map_hint: 'Tap the map to report an event',
    filter_btn_label: 'Filter events by region',
    location_btn_label: 'Center on my location',
    send_comment: 'Send comment',
    close: 'Close',
    road_events_title: 'My Active Alerts',

    // GPS Navigation — #3/#8
    nav_then: 'Then,',
    nav_destination: 'DESTINATION',
    nav_recenter: 'Recenter',
    nav_recalculating: 'Recalculating route.',
    nav_starting: 'Starting navigation.',
    nav_arrived_dest: 'You have arrived at your destination.',
    nav_now: 'Now.',
    nav_voice_toggle: 'Toggle voice',
    nav_steps_toggle: 'Toggle steps',

    // App — #8
    welcome_back: 'Welcome back, {name}!',

    // Modals — Alert strings (#1/#2 Cycle 8)
    discard_draft_title: 'Discard draft?',
    discard_draft_msg: 'You filled in the description. Discard and close?',
    keep_editing: 'Keep editing',
    discard: 'Discard',
    inappropriate_content: 'Inappropriate content',
    report_failed: 'Could not report',
    permission_required: 'Permission required',
    gallery_permission_msg: 'Allow access to the gallery to choose a photo.',
    invalid_type: 'Invalid type',
    invalid_type_msg: 'Please select an image (JPEG, PNG, etc.).',
    photo_too_large: 'Photo too large',
    photo_too_large_msg: 'Choose an image smaller than 8 MB.',
    invalid_name: 'Invalid name',
    invalid_name_msg: 'The name must have at least 2 characters.',
    reauth_required: 'Confirmation required',
    reauth_required_msg: 'For security, sign out and sign in again before deleting your account.',

    // Store — rate-limit and error messages (#5/#6 Cycle 8)
    login_required_road: 'Sign in to report road alerts.',
    login_required_ent: 'Sign in to publish events.',
    rate_limit_wait: 'Wait {remaining}s before creating another event.',
    rate_limit_comment: 'Wait {remaining}s before commenting again.',
    error_loading_events: 'Error loading events. Pull to refresh.',

    // ContentFilter — (#7 Cycle 8)
    content_label_title: 'title',
    content_label_description: 'description',
    content_label_address: 'address',
    content_inappropriate: 'The {label} contains an inappropriate term. Please review the content before publishing.',

    // AddEntertainmentModal
    address_required: 'Address required',
    address_required_msg: 'Enter the venue address so others can find it.',
    address_incomplete: 'Incomplete address',
    address_incomplete_msg: 'Please enter the street name and a number or neighborhood.',
    geocoding_searching: '🔍 searching...',
    geocoding_detecting: 'Detecting address...',
    geocode_suggestion: 'Suggestion',
    address_placeholder: 'e.g. 123 Flowers St — Downtown',
    field_required_address: '⚠ Address required',
    photo_optional: '📷 Photo (optional)',
    add_event_link: '🔗 Event link (optional)',
    event_link_open: 'Open link',
    publish_failed: 'Could not publish',

    // EntertainmentScreen
    location_permission_denied: 'Permission denied',
    location_permission_msg: 'Enable location to add events.',
    location_fetch_error: 'Could not get your location. Check GPS.',
    error_load_more: 'Could not load more events. Please try again.',
    error_retry_suffix: 'Tap to retry.',

    // ProfileScreen
    photo_save_error: 'Could not save photo. Please try again.',
    name_save_error: 'Could not save name. Please try again.',
    delete_account_title: '⚠️ Delete account',
    delete_account_msg: 'All your data will be permanently deleted. This action cannot be undone.',
    delete_account_confirm: 'Delete my account',
    delete_account_btn: '🗑️ Delete my account',

    // AuthScreen
    auth_name_label: 'Name',
    auth_name_placeholder: 'Your full name',
    auth_password_placeholder: 'Minimum 6 characters',
    auth_confirm_password_label: 'Confirm password',
    auth_confirm_password_placeholder: 'Repeat password',
    auth_show_password: 'Show password',
    auth_hide_password: 'Hide password',
    auth_show_confirm_password: 'Show password confirmation',
    auth_hide_confirm_password: 'Hide password confirmation',
    auth_google_token_error: 'Could not get Google ID token.\n\nCheck that the app SHA-1 is registered in Firebase Console and the Web Client ID matches the same project.',
    auth_google_error_title: 'Google Error',
    auth_google_signin_failed: 'Could not sign in with Google.',
    auth_reset_no_email_title: 'Enter your email',
    auth_reset_no_email_msg: 'Type the registered email to receive the link.',
    auth_reset_user_not_found: 'No account found with this email.',
    auth_reset_invalid_email: 'Invalid email.',
    auth_reset_failed: 'Could not send the email. Please try again.',
    auth_anon_display_name: 'Visitor',
    auth_anon_failed: 'Could not sign in. Check that anonymous access is enabled in Firebase Console.',
    auth_required_fields_title: 'Required fields',
    auth_required_email_password_msg: 'Please fill in email and password.',
    auth_name_required_msg: 'Please enter your name.',
    auth_invalid_email_title: 'Invalid email',
    auth_invalid_email_msg: 'Please enter a valid email address.',
    auth_weak_password_title: 'Weak password',
    auth_weak_password_msg: 'Password must be at least 6 characters.',
    auth_passwords_mismatch_title: 'Passwords do not match',
    auth_passwords_mismatch_msg: 'The password confirmation is different. Please check and try again.',
    auth_wrong_password: 'Incorrect password.',
    auth_invalid_credential: 'Incorrect email or password.',
    auth_user_not_found: 'Email not found.',
    auth_email_in_use: 'This email is already registered.',
    auth_weak_password: 'Weak password (minimum 6 characters).',
    auth_invalid_email_code: 'Invalid email.',
    auth_failed: 'Authentication error. Please try again.',
    auth_forgot_desc: 'Enter your email and we will send a link to reset your password.',
    auth_reset_sent_desc: 'We sent the recovery link to:',
    auth_reset_spam_hint: 'Also check your spam folder if you cannot find it.',

    // MapScreen
    event_not_found_title: 'Event not found',
    event_not_found_msg: 'This event may have expired or been removed.',
    location_disabled_title: 'Location disabled',
    location_disabled_msg: 'Enable location permission in your phone settings to center the map.',

    // NavigationModal
    nav_location_denied: 'Location permission denied',
    nav_location_error: 'Error getting location',
    nav_route_error: 'Could not calculate route',
    nav_start_btn: '▶  Start',
    nav_finish_btn: '✓  Done',

    // MercadoPagoModal
    support_modal_body: 'Alertoo is developed with care and kept free of intrusive ads. Your donation helps pay for servers, maps and new features.',
    donate_mp_failed: 'Could not open Mercado Pago. Check your connection.',
    donate_tier_cafe_label: 'Coffee',
    donate_tier_cafe_desc: 'A coffee for the team',
    donate_tier_apoio_label: 'Support',
    donate_tier_apoio_desc: 'Helps with the server',
    donate_tier_parceiro_label: 'Partner',
    donate_tier_parceiro_desc: 'Alertoo partner',
    donate_tier_heroi_label: 'Hero',
    donate_tier_heroi_desc: 'Community hero',

    // BuyCreditsScreen
    buy_credits_hero_desc: 'Use credits to promote your restaurants, bars and events on the map with special highlights.',
    buy_credits_watch_ad_title: 'Watch ad → +1 credit',
    buy_credits_ad_cooldown: '⏳ Available again in 1 hour',
    buy_credits_ad_ready: '✅ Ad ready — tap to watch',
    buy_credits_ad_loading: '⏳ Loading ad...',
    buy_credits_or_buy: 'or buy credits',
    buy_credits_ad_reward_title: '🎉 +1 credit!',
    buy_credits_ad_reward_msg: 'You earned 1 promotion credit by watching the ad.',
    buy_credits_ad_reward_btn: 'Great!',
    buy_credits_ad_failed: 'Could not show the ad.',
    buy_credits_payment_failed_title: '❌ Payment not completed',
    buy_credits_payment_failed_msg: 'The payment was cancelled or declined. Please try again.',
    buy_credits_fallback_title: '⚠️ Generic link opened',
    buy_credits_fallback_msg: 'Could not generate a personalized link. After completing payment, contact us via the Profile screen to receive your credits.',
    buy_credits_fallback_btn: 'Got it',
    buy_credits_open_mp_failed: 'Could not open Mercado Pago.',
    buy_credits_confirmed_title: '✅ Payment confirmed!',
    buy_credits_confirmed_msg: '{credits} credit(s) added to your account.',
    buy_credits_pending_title: '⏳ Payment processing',
    buy_credits_pending_msg: 'Your payment is still being processed by Mercado Pago. Wait a few minutes and try again.',
    buy_credits_rejected_title: '❌ Payment not approved',
    buy_credits_rejected_msg: 'The payment was declined or cancelled. Please try again.',
    buy_credits_verify_failed: 'Could not verify payment.',
    try_again: 'Try again',
    understood: 'Got it',

    // CommentsModal
    comment_cooldown: 'Wait {n}s to comment again.',
    comments_anonymous_user: 'User',

    // Report system (Option D)
    report_event: 'Report event',
    report_reason_title: 'Reason for report',
    report_reason_nudity: 'Inappropriate photo / nudity',
    report_reason_violence: 'Violence or disturbing content',
    report_reason_spam: 'Spam or misleading content',
    report_reason_other: 'Other',
    report_note_placeholder: 'Additional details (optional)',
    report_send: 'Submit report',
    report_sending: 'Sending...',
    report_success_title: 'Report submitted',
    report_success_msg: 'Thank you! Our team will review the content.',
    report_already_sent: 'You already reported this event.',
    report_login_required: 'Sign in to report events.',

    // Leaderboard
    leaderboard_title: 'Ranking',
    leaderboard_sub: 'Top users by score',

    // FilterModal
    filter_category: 'Event category',
  },

  es: {
    tab_road: 'Tráfico',
    tab_map: 'Mapa',
    tab_events: 'Eventos',
    tab_profile: 'Perfil',
    tab_ranking: 'Ranking',

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
    share_rank_title: 'Compartir mi rango',
    edit_event: 'Editar evento',

    add_event_title: 'Agregar evento',
    add_road_title: 'Reportar alerta',
    add_category: 'Categoría',
    add_event_name: 'Nombre del evento',
    add_description: 'Descripción (opcional)',
    add_address: 'Dirección (opcional)',
    add_publish: 'Publicar',
    add_road_type: 'Tipo de incidente',
    add_road_speed_limit: 'Límite de velocidad',
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
    cat_road_radar:       'Radar de Velocidad',

    traffic_alert_slow_title:    'Tráfico lento detectado',
    traffic_alert_stopped_title: 'Llevas un tiempo detenido',
    traffic_alert_notif_body:    'Toca para reportar lo que está pasando',

    // Rastreo en segundo plano (#43-b) — interruptor en el perfil + notificación persistente (Android)
    bg_traffic_setting_title: 'Alertas de tráfico fuera de la app',
    bg_traffic_setting_desc: 'Recibe avisos de tráfico lento o detenido aunque la app esté cerrada mientras conduces.',
    notif_channel_alerts: 'Alertas',
    notif_channel_monitoring: 'Monitoreo de tráfico',
    radar_title: 'Radar',
    radar_type_fixed: 'Radar fijo',
    radar_type_mobile: 'Radar móvil',
    radar_type_blitz: 'Control policial',
    radar_pending_tag: 'Esperando confirmaciones',
    radar_pending_note: 'Tu radar será visible para todos después de 2 confirmaciones de otros usuarios.',
    radar_still_there: 'Sigue ahí',
    radar_gone: 'Ya no existe',
    radar_last_confirmed: 'Última confirmación',
    radar_already_voted: 'Ya votaste sobre este radar recientemente.',
    radar_delete: 'Eliminar radar',
    radar_delete_confirm: '¿Seguro que quieres eliminar este radar?',
    radar_select_type: 'Tipo de radar',
    radar_confirm_prompt_title: 'Radar cercano',
    radar_confirm_prompt_msg: '¿Este radar sigue ahí?',
    bg_traffic_notif_title: 'Alertoo está monitoreando el tráfico',
    bg_traffic_notif_body: 'Te avisaremos si el tráfico se ralentiza o se detiene',
    bg_traffic_permission_denied: 'Permiso de ubicación denegado. Activa el acceso a la ubicación en los ajustes de la app.',
    bg_traffic_foreground_only: 'Para alertas con la app cerrada, permite el acceso a la ubicación "Siempre" en los ajustes de la app.',

    cat_ent_bar:        'Bar',
    cat_ent_restaurant: 'Restaurante',
    cat_ent_restaurante: 'Restaurante',
    cat_ent_party:      'Fiesta',
    cat_ent_festa:      'Fiesta',
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
    time_expires_d:   'expira en {n} día',
    time_expires_dp:  'expira en {n} días',

    confirm: 'Confirma',
    deny: 'Niega',
    road_confirm_action: 'Confirmar',
    road_deny_action: 'Negar',
    time_left_label: 'Resta',
    speed_limit_stat: 'Límite',

    notification_road: '🚨 Alerta de Tráfico',
    notification_ent:  '🎉 Evento',

    credits_unlimited_admin: 'créditos ilimitados (Admin)',
    credits_label_one: 'crédito disponible',
    credits_label_other: 'créditos disponibles',
    saved_events: 'Eventos Guardados',
    fav_empty: 'Aún no hay eventos guardados.\nToca ☆ en un evento para guardarlo.',
    fav_ent: '🎉 Entretenimiento',
    fav_road: '🚦 Tráfico',
    fav_view: 'Ver',
    fav_go: 'Ir al lugar',
    driver_mode_title: 'Modo Conductor',
    driver_no_alerts: 'Sin alertas cercanas',
    driver_clear_road: 'Vía libre — sin alertas cercanas',
    driver_exit: 'Salir del modo conductor',

    comments_placeholder: 'Escribe un comentario...',

    onboarding_title_1: 'Todo lo que pasa cerca de ti',
    onboarding_sub_1: 'Eventos, alertas de tráfico y lo que está pasando ahora — en tiempo real en el mapa.',
    onboarding_title_2: 'Descubre eventos increíbles',
    onboarding_sub_2: 'Fiestas, shows, restaurantes y festivales. Guarda tus favoritos para volver después.',
    onboarding_title_3: 'Llega más rápido',
    onboarding_sub_3: 'Navegación GPS con instrucciones de voz y alertas de la comunidad para evitar embotellamientos.',

    too_far_title: 'Demasiado lejos',
    too_far_msg: 'Solo puedes reportar eventos en un radio de {km} km.\n\nDistancia: {dist} km.',
    water_area_title: 'Área inválida',
    water_area_msg: 'No puedes crear eventos en áreas acuáticas (océano, bahía, lago o represa).\n\nToca una vía o área terrestre.',
    offline_banner: 'Sin conexión — los datos pueden estar desactualizados',
    login_required: 'Inicio de sesión requerido',
    comment_login_msg: 'Inicia sesión para comentar en los eventos.',
    comment_send_error: 'No se pudo enviar el comentario. Inténtalo de nuevo.',
    load_more: 'Cargar más',
    you: 'Tú',
    error: 'Error',
    remove: 'Eliminar',
    fav_remove_title: 'Eliminar favorito',
    fav_remove_msg: '¿Eliminar este evento de favoritos?',
    map_hint: 'Toca el mapa para reportar un evento',
    filter_btn_label: 'Filtrar eventos por región',
    location_btn_label: 'Centrar en mi ubicación',
    send_comment: 'Enviar comentario',
    close: 'Cerrar',
    road_events_title: 'Mis Alertas Activas',

    // Navegación GPS — #3/#8
    nav_then: 'Después,',
    nav_destination: 'DESTINO',
    nav_recenter: 'Recentrar',
    nav_recalculating: 'Recalculando ruta.',
    nav_starting: 'Iniciando navegación.',
    nav_arrived_dest: 'Has llegado a tu destino.',
    nav_now: 'Ahora.',
    nav_voice_toggle: 'Activar/desactivar voz',
    nav_steps_toggle: 'Mostrar/ocultar pasos',

    // App — #8
    welcome_back: '¡Bienvenido de nuevo, {name}!',

    // Modales — strings de Alert (#1/#2 Ciclo 8)
    discard_draft_title: '¿Descartar borrador?',
    discard_draft_msg: 'Rellenaste la descripción. ¿Descartar y cerrar?',
    keep_editing: 'Seguir editando',
    discard: 'Descartar',
    inappropriate_content: 'Contenido inapropiado',
    report_failed: 'No se pudo reportar',
    permission_required: 'Permiso requerido',
    gallery_permission_msg: 'Permite el acceso a la galería para elegir una foto.',
    invalid_type: 'Tipo inválido',
    invalid_type_msg: 'Por favor, selecciona una imagen (JPEG, PNG, etc.).',
    photo_too_large: 'Foto demasiado grande',
    photo_too_large_msg: 'Elige una imagen de menos de 8 MB.',
    invalid_name: 'Nombre inválido',
    invalid_name_msg: 'El nombre debe tener al menos 2 caracteres.',
    reauth_required: 'Confirmación requerida',
    reauth_required_msg: 'Por seguridad, cierra sesión y vuelve a iniciar sesión antes de eliminar la cuenta.',

    // Store — mensajes de rate-limit y errores (#5/#6 Ciclo 8)
    login_required_road: 'Inicia sesión para reportar alertas de tráfico.',
    login_required_ent: 'Inicia sesión para publicar eventos.',
    rate_limit_wait: 'Espera {remaining}s antes de crear otro evento.',
    rate_limit_comment: 'Espera {remaining}s antes de comentar de nuevo.',
    error_loading_events: 'Error al cargar eventos. Desliza para actualizar.',

    // ContentFilter — (#7 Ciclo 8)
    content_label_title: 'título',
    content_label_description: 'descripción',
    content_label_address: 'dirección',
    content_inappropriate: 'El {label} contiene un término inapropiado. Por favor revisa el contenido antes de publicar.',

    // AddEntertainmentModal
    address_required: 'Dirección obligatoria',
    address_required_msg: 'Ingresa la dirección del lugar para que otros puedan encontrarlo.',
    address_incomplete: 'Dirección incompleta',
    address_incomplete_msg: 'Por favor, ingresa el nombre de la calle y un número o barrio.',
    geocoding_searching: '🔍 buscando...',
    geocoding_detecting: 'Detectando dirección...',
    geocode_suggestion: 'Sugerencia',
    address_placeholder: 'Ej: Calle de las Flores, 123 — Centro',
    field_required_address: '⚠ Dirección obligatoria',
    photo_optional: '📷 Foto (opcional)',
    add_event_link: '🔗 Enlace del evento (opcional)',
    event_link_open: 'Abrir enlace',
    publish_failed: 'No se pudo publicar',

    // EntertainmentScreen
    location_permission_denied: 'Permiso denegado',
    location_permission_msg: 'Activa la ubicación para agregar eventos.',
    location_fetch_error: 'No se pudo obtener tu ubicación. Verifica el GPS.',
    error_load_more: 'No se pudieron cargar más eventos. Inténtalo de nuevo.',
    error_retry_suffix: 'Toca para reintentar.',

    // ProfileScreen
    photo_save_error: 'No se pudo guardar la foto. Inténtalo de nuevo.',
    name_save_error: 'No se pudo guardar el nombre. Inténtalo de nuevo.',
    delete_account_title: '⚠️ Eliminar cuenta',
    delete_account_msg: 'Todos tus datos serán eliminados permanentemente. Esta acción no se puede deshacer.',
    delete_account_confirm: 'Eliminar mi cuenta',
    delete_account_btn: '🗑️ Eliminar mi cuenta',

    // AuthScreen
    auth_name_label: 'Nombre',
    auth_name_placeholder: 'Tu nombre completo',
    auth_password_placeholder: 'Mínimo 6 caracteres',
    auth_confirm_password_label: 'Confirmar contraseña',
    auth_confirm_password_placeholder: 'Repite la contraseña',
    auth_show_password: 'Mostrar contraseña',
    auth_hide_password: 'Ocultar contraseña',
    auth_show_confirm_password: 'Mostrar confirmación de contraseña',
    auth_hide_confirm_password: 'Ocultar confirmación de contraseña',
    auth_google_token_error: 'No se pudo obtener el token de Google.\n\nVerifica que el SHA-1 esté registrado en Firebase Console y que el Web Client ID corresponda al mismo proyecto.',
    auth_google_error_title: 'Error Google',
    auth_google_signin_failed: 'No se pudo iniciar sesión con Google.',
    auth_reset_no_email_title: 'Ingresa tu correo',
    auth_reset_no_email_msg: 'Escribe el correo registrado para recibir el enlace.',
    auth_reset_user_not_found: 'No se encontró ninguna cuenta con este correo.',
    auth_reset_invalid_email: 'Correo inválido.',
    auth_reset_failed: 'No se pudo enviar el correo. Inténtalo de nuevo.',
    auth_anon_display_name: 'Visitante',
    auth_anon_failed: 'No se pudo iniciar sesión. Verifica que el acceso anónimo esté activado en Firebase Console.',
    auth_required_fields_title: 'Campos obligatorios',
    auth_required_email_password_msg: 'Completa el correo y la contraseña.',
    auth_name_required_msg: 'Ingresa tu nombre.',
    auth_invalid_email_title: 'Correo inválido',
    auth_invalid_email_msg: 'Ingresa una dirección de correo válida.',
    auth_weak_password_title: 'Contraseña débil',
    auth_weak_password_msg: 'La contraseña debe tener al menos 6 caracteres.',
    auth_passwords_mismatch_title: 'Las contraseñas no coinciden',
    auth_passwords_mismatch_msg: 'La confirmación de contraseña es diferente. Verifica e intenta de nuevo.',
    auth_wrong_password: 'Contraseña incorrecta.',
    auth_invalid_credential: 'Correo o contraseña incorrectos.',
    auth_user_not_found: 'Correo no encontrado.',
    auth_email_in_use: 'Este correo ya está registrado.',
    auth_weak_password: 'Contraseña débil (mínimo 6 caracteres).',
    auth_invalid_email_code: 'Correo inválido.',
    auth_failed: 'Error al autenticar. Inténtalo de nuevo.',
    auth_forgot_desc: 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.',
    auth_reset_sent_desc: 'Enviamos el enlace de recuperación a:',
    auth_reset_spam_hint: 'Revisa también la carpeta de spam si no lo encuentras.',

    // MapScreen
    event_not_found_title: 'Evento no encontrado',
    event_not_found_msg: 'Este evento puede haber expirado o sido eliminado.',
    location_disabled_title: 'Ubicación desactivada',
    location_disabled_msg: 'Activa el permiso de ubicación en la configuración de tu teléfono para centrar el mapa.',

    // NavigationModal
    nav_location_denied: 'Permiso de ubicación denegado',
    nav_location_error: 'Error al obtener la ubicación',
    nav_route_error: 'No se pudo calcular la ruta',
    nav_start_btn: '▶  Iniciar',
    nav_finish_btn: '✓  Finalizar',

    // MercadoPagoModal
    support_modal_body: 'Alertoo se desarrolla con mucho cariño y se mantiene sin anuncios intrusivos. Tu donación ayuda a pagar servidores, mapas y novedades.',
    donate_mp_failed: 'No se pudo abrir Mercado Pago. Verifica tu conexión.',
    donate_tier_cafe_label: 'Café',
    donate_tier_cafe_desc: 'Un café para el equipo',
    donate_tier_apoio_label: 'Apoyo',
    donate_tier_apoio_desc: 'Ayuda con el servidor',
    donate_tier_parceiro_label: 'Socio',
    donate_tier_parceiro_desc: 'Socio de Alertoo',
    donate_tier_heroi_label: 'Héroe',
    donate_tier_heroi_desc: 'Héroe de la comunidad',

    // BuyCreditsScreen
    buy_credits_hero_desc: 'Usa créditos para promover tus restaurantes, bares y eventos en el mapa con destacado especial.',
    buy_credits_watch_ad_title: 'Ver anuncio → +1 crédito',
    buy_credits_ad_cooldown: '⏳ Disponible de nuevo en 1 hora',
    buy_credits_ad_ready: '✅ Anuncio listo — toca para ver',
    buy_credits_ad_loading: '⏳ Cargando anuncio...',
    buy_credits_or_buy: 'o compra créditos',
    buy_credits_ad_reward_title: '🎉 +1 crédito!',
    buy_credits_ad_reward_msg: 'Ganaste 1 crédito de promoción viendo el anuncio.',
    buy_credits_ad_reward_btn: '¡Genial!',
    buy_credits_ad_failed: 'No se pudo mostrar el anuncio.',
    buy_credits_payment_failed_title: '❌ Pago no completado',
    buy_credits_payment_failed_msg: 'El pago fue cancelado o rechazado. Inténtalo de nuevo.',
    buy_credits_fallback_title: '⚠️ Enlace genérico abierto',
    buy_credits_fallback_msg: 'No se pudo generar un enlace personalizado. Tras completar el pago, contáctanos desde la pantalla de Perfil para recibir tus créditos.',
    buy_credits_fallback_btn: 'Entendido',
    buy_credits_open_mp_failed: 'No se pudo abrir Mercado Pago.',
    buy_credits_confirmed_title: '✅ ¡Pago confirmado!',
    buy_credits_confirmed_msg: '{credits} crédito(s) agregado(s) a tu cuenta.',
    buy_credits_pending_title: '⏳ Pago en procesamiento',
    buy_credits_pending_msg: 'Tu pago aún está siendo procesado por Mercado Pago. Espera unos minutos e intenta de nuevo.',
    buy_credits_rejected_title: '❌ Pago no aprobado',
    buy_credits_rejected_msg: 'El pago fue rechazado o cancelado. Inténtalo de nuevo.',
    buy_credits_verify_failed: 'No se pudo verificar el pago.',
    try_again: 'Intentar de nuevo',
    understood: 'Entendido',

    // CommentsModal
    comment_cooldown: 'Espera {n}s para comentar de nuevo.',
    comments_anonymous_user: 'Usuario',

    // Sistema de denuncia (Opción D)
    report_event: 'Denunciar evento',
    report_reason_title: 'Motivo de la denuncia',
    report_reason_nudity: 'Foto inapropiada / desnudez',
    report_reason_violence: 'Violencia o contenido perturbador',
    report_reason_spam: 'Spam o contenido engañoso',
    report_reason_other: 'Otro',
    report_note_placeholder: 'Detalles adicionales (opcional)',
    report_send: 'Enviar denuncia',
    report_sending: 'Enviando...',
    report_success_title: 'Denuncia enviada',
    report_success_msg: 'Gracias. Nuestro equipo revisará el contenido.',
    report_already_sent: 'Ya has denunciado este evento.',
    report_login_required: 'Inicia sesión para denunciar eventos.',

    // Leaderboard
    leaderboard_title: 'Ranking',
    leaderboard_sub: 'Mejores usuarios por puntuación',

    // FilterModal
    filter_category: 'Categoría de evento',
  },

  fr: {
    tab_road: 'Route',
    tab_map: 'Carte',
    tab_events: 'Événements',
    tab_profile: 'Profil',
    tab_ranking: 'Classement',

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
    share_rank_title: 'Partager mon rang',
    edit_event: "Modifier l'événement",

    add_event_title: 'Ajouter un événement',
    add_road_title: 'Signaler une alerte',
    add_category: 'Catégorie',
    add_event_name: "Nom de l'événement",
    add_description: 'Description (facultative)',
    add_address: 'Adresse (facultative)',
    add_publish: 'Publier',
    add_road_type: "Type d'incident",
    add_road_speed_limit: 'Limite de vitesse',
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
    cat_road_radar:       'Radar de Vitesse',

    traffic_alert_slow_title:    'Trafic ralenti détecté',
    traffic_alert_stopped_title: 'Vous êtes arrêté depuis un moment',
    traffic_alert_notif_body:    'Appuyez pour signaler ce qui se passe',

    // Suivi en arrière-plan (#43-b) — interrupteur dans le profil + notification persistante (Android)
    bg_traffic_setting_title: 'Alertes trafic hors de l\'app',
    bg_traffic_setting_desc: 'Recevez des alertes de trafic ralenti ou arrêté même avec l\'app fermée pendant que vous conduisez.',
    notif_channel_alerts: 'Alertes',
    notif_channel_monitoring: 'Surveillance du trafic',
    radar_title: 'Radar',
    radar_type_fixed: 'Radar fixe',
    radar_type_mobile: 'Radar mobile',
    radar_type_blitz: 'Contrôle routier',
    radar_pending_tag: 'En attente de confirmations',
    radar_pending_note: "Votre radar sera visible par tous après 2 confirmations d'autres utilisateurs.",
    radar_still_there: 'Toujours là',
    radar_gone: "N'existe plus",
    radar_last_confirmed: 'Dernière confirmation',
    radar_already_voted: 'Vous avez déjà voté sur ce radar récemment.',
    radar_delete: 'Supprimer le radar',
    radar_delete_confirm: 'Voulez-vous vraiment supprimer ce radar ?',
    radar_select_type: 'Type de radar',
    radar_confirm_prompt_title: 'Radar à proximité',
    radar_confirm_prompt_msg: 'Ce radar est-il toujours là ?',
    bg_traffic_notif_title: 'Alertoo surveille le trafic',
    bg_traffic_notif_body: 'Vous serez averti si le trafic ralentit ou s\'arrête',
    bg_traffic_permission_denied: 'Permission de localisation refusée. Activez l\'accès à la localisation dans les paramètres de l\'app.',
    bg_traffic_foreground_only: 'Pour des alertes avec l\'app fermée, autorisez l\'accès à la localisation "Toujours" dans les paramètres de l\'app.',

    cat_ent_bar:        'Bar',
    cat_ent_restaurant: 'Restaurant',
    cat_ent_restaurante: 'Restaurant',
    cat_ent_party:      'Fête',
    cat_ent_festa:      'Fête',
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
    time_expires_d:   'expire dans {n} jour',
    time_expires_dp:  'expire dans {n} jours',

    confirm: 'Confirme',
    deny: 'Refuse',
    road_confirm_action: 'Confirmer',
    road_deny_action: 'Refuser',
    time_left_label: 'Reste',
    speed_limit_stat: 'Limite',

    notification_road: '🚨 Alerte Routière',
    notification_ent:  '🎉 Événement',

    credits_unlimited_admin: 'crédits illimités (Admin)',
    credits_label_one: 'crédit disponible',
    credits_label_other: 'crédits disponibles',
    saved_events: 'Événements Sauvegardés',
    fav_empty: "Aucun événement sauvegardé.\nAppuyez sur ☆ sur un événement pour le sauvegarder.",
    fav_ent: '🎉 Divertissement',
    fav_road: '🚦 Circulation',
    fav_view: 'Voir',
    fav_go: 'Y aller',
    driver_mode_title: 'Mode conducteur',
    driver_no_alerts: 'Aucune alerte à proximité',
    driver_clear_road: 'Route libre — aucune alerte à proximité',
    driver_exit: 'Quitter le mode conducteur',

    comments_placeholder: 'Écrivez un commentaire...',

    onboarding_title_1: 'Tout ce qui se passe près de vous',
    onboarding_sub_1: 'Événements, alertes routières et ce qui se passe maintenant — en temps réel sur la carte.',
    onboarding_title_2: 'Découvrez des événements incroyables',
    onboarding_sub_2: 'Fêtes, spectacles, restaurants et festivals. Sauvegardez vos favoris pour y revenir plus tard.',
    onboarding_title_3: 'Arrivez plus vite',
    onboarding_sub_3: 'Navigation GPS avec instructions vocales et alertes de la communauté pour éviter les embouteillages.',

    too_far_title: 'Trop loin',
    too_far_msg: 'Vous ne pouvez signaler des événements que dans un rayon de {km} km.\n\nDistance : {dist} km.',
    water_area_title: 'Zone invalide',
    water_area_msg: "Impossible de créer des événements dans des zones aquatiques (océan, baie, lac ou réservoir).\n\nAppuyez sur une route ou une zone terrestre.",
    offline_banner: 'Sans connexion — les données peuvent être obsolètes',
    login_required: 'Connexion requise',
    comment_login_msg: 'Connectez-vous pour commenter les événements.',
    comment_send_error: 'Impossible d\'envoyer le commentaire. Réessayez.',
    load_more: 'Charger plus',
    you: 'Vous',
    error: 'Erreur',
    remove: 'Supprimer',
    fav_remove_title: 'Supprimer le favori',
    fav_remove_msg: 'Supprimer cet événement des favoris ?',
    map_hint: 'Appuyez sur la carte pour signaler un événement',
    filter_btn_label: 'Filtrer les événements par région',
    location_btn_label: 'Centrer sur ma position',
    send_comment: 'Envoyer commentaire',
    close: 'Fermer',
    road_events_title: 'Mes Alertes Actives',

    // Navigation GPS — #3/#8
    nav_then: 'Ensuite,',
    nav_destination: 'DESTINATION',
    nav_recenter: 'Recentrer',
    nav_recalculating: 'Recalcul de l\'itinéraire.',
    nav_starting: 'Démarrage de la navigation.',
    nav_arrived_dest: 'Vous êtes arrivé à destination.',
    nav_now: 'Maintenant.',
    nav_voice_toggle: 'Activer/désactiver la voix',
    nav_steps_toggle: 'Afficher/masquer les étapes',

    // App — #8
    welcome_back: 'Bon retour, {name} !',

    // Modaux — strings d'Alert (#1/#2 Cycle 8)
    discard_draft_title: 'Supprimer le brouillon ?',
    discard_draft_msg: 'Vous avez rempli la description. Supprimer et fermer ?',
    keep_editing: 'Continuer à éditer',
    discard: 'Supprimer',
    inappropriate_content: 'Contenu inapproprié',
    report_failed: 'Impossible de signaler',
    permission_required: 'Permission requise',
    gallery_permission_msg: "Autorisez l'accès à la galerie pour choisir une photo.",
    invalid_type: 'Type invalide',
    invalid_type_msg: 'Veuillez sélectionner une image (JPEG, PNG, etc.).',
    photo_too_large: 'Photo trop grande',
    photo_too_large_msg: 'Choisissez une image de moins de 8 Mo.',
    invalid_name: 'Nom invalide',
    invalid_name_msg: 'Le nom doit comporter au moins 2 caractères.',
    reauth_required: 'Confirmation requise',
    reauth_required_msg: 'Pour des raisons de sécurité, déconnectez-vous et reconnectez-vous avant de supprimer votre compte.',

    // Store — messages de rate-limit et erreurs (#5/#6 Cycle 8)
    login_required_road: 'Connectez-vous pour signaler des alertes routières.',
    login_required_ent: 'Connectez-vous pour publier des événements.',
    rate_limit_wait: 'Attendez {remaining}s avant de créer un autre événement.',
    rate_limit_comment: 'Attendez {remaining}s avant de commenter à nouveau.',
    error_loading_events: 'Erreur lors du chargement des événements. Tirez pour actualiser.',

    // ContentFilter — (#7 Cycle 8)
    content_label_title: 'titre',
    content_label_description: 'description',
    content_label_address: 'adresse',
    content_inappropriate: 'Le {label} contient un terme inapproprié. Veuillez réviser le contenu avant de publier.',

    // AddEntertainmentModal
    address_required: 'Adresse obligatoire',
    address_required_msg: 'Entrez l\'adresse du lieu pour que les autres puissent le trouver.',
    address_incomplete: 'Adresse incomplète',
    address_incomplete_msg: 'Veuillez entrer le nom de la rue et un numéro ou quartier.',
    geocoding_searching: '🔍 recherche...',
    geocoding_detecting: 'Détection de l\'adresse...',
    geocode_suggestion: 'Suggestion',
    address_placeholder: 'Ex : 123 rue des Fleurs — Centre',
    field_required_address: '⚠ Adresse obligatoire',
    photo_optional: '📷 Photo (facultative)',
    add_event_link: '🔗 Lien de l\'événement (facultatif)',
    event_link_open: 'Ouvrir le lien',
    publish_failed: 'Impossible de publier',

    // EntertainmentScreen
    location_permission_denied: 'Permission refusée',
    location_permission_msg: 'Activez la localisation pour ajouter des événements.',
    location_fetch_error: 'Impossible d\'obtenir votre position. Vérifiez le GPS.',
    error_load_more: 'Impossible de charger plus d\'événements. Réessayez.',
    error_retry_suffix: 'Appuyez pour réessayer.',

    // ProfileScreen
    photo_save_error: 'Impossible de sauvegarder la photo. Réessayez.',
    name_save_error: 'Impossible de sauvegarder le nom. Réessayez.',
    delete_account_title: '⚠️ Supprimer le compte',
    delete_account_msg: 'Toutes vos données seront supprimées définitivement. Cette action est irréversible.',
    delete_account_confirm: 'Supprimer mon compte',
    delete_account_btn: '🗑️ Supprimer mon compte',

    // AuthScreen
    auth_name_label: 'Nom',
    auth_name_placeholder: 'Votre nom complet',
    auth_password_placeholder: 'Minimum 6 caractères',
    auth_confirm_password_label: 'Confirmer le mot de passe',
    auth_confirm_password_placeholder: 'Répétez le mot de passe',
    auth_show_password: 'Afficher le mot de passe',
    auth_hide_password: 'Masquer le mot de passe',
    auth_show_confirm_password: 'Afficher la confirmation',
    auth_hide_confirm_password: 'Masquer la confirmation',
    auth_google_token_error: "Impossible d'obtenir le token Google.\n\nVérifiez que le SHA-1 est enregistré dans Firebase Console et que le Web Client ID correspond au même projet.",
    auth_google_error_title: 'Erreur Google',
    auth_google_signin_failed: 'Impossible de se connecter avec Google.',
    auth_reset_no_email_title: 'Entrez votre e-mail',
    auth_reset_no_email_msg: 'Saisissez l\'e-mail enregistré pour recevoir le lien.',
    auth_reset_user_not_found: 'Aucun compte trouvé avec cet e-mail.',
    auth_reset_invalid_email: 'E-mail invalide.',
    auth_reset_failed: "Impossible d'envoyer l'e-mail. Réessayez.",
    auth_anon_display_name: 'Visiteur',
    auth_anon_failed: "Impossible de se connecter. Vérifiez que l'accès anonyme est activé dans Firebase Console.",
    auth_required_fields_title: 'Champs obligatoires',
    auth_required_email_password_msg: 'Veuillez remplir l\'e-mail et le mot de passe.',
    auth_name_required_msg: 'Veuillez entrer votre nom.',
    auth_invalid_email_title: 'E-mail invalide',
    auth_invalid_email_msg: 'Veuillez entrer une adresse e-mail valide.',
    auth_weak_password_title: 'Mot de passe faible',
    auth_weak_password_msg: 'Le mot de passe doit comporter au moins 6 caractères.',
    auth_passwords_mismatch_title: 'Les mots de passe ne correspondent pas',
    auth_passwords_mismatch_msg: 'La confirmation du mot de passe est différente. Vérifiez et réessayez.',
    auth_wrong_password: 'Mot de passe incorrect.',
    auth_invalid_credential: 'E-mail ou mot de passe incorrect.',
    auth_user_not_found: 'E-mail introuvable.',
    auth_email_in_use: 'Cet e-mail est déjà enregistré.',
    auth_weak_password: 'Mot de passe faible (minimum 6 caractères).',
    auth_invalid_email_code: 'E-mail invalide.',
    auth_failed: "Erreur d'authentification. Réessayez.",
    auth_forgot_desc: 'Entrez votre e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.',
    auth_reset_sent_desc: 'Nous avons envoyé le lien de récupération à :',
    auth_reset_spam_hint: 'Vérifiez aussi votre dossier spam si vous ne le trouvez pas.',

    // MapScreen
    event_not_found_title: 'Événement introuvable',
    event_not_found_msg: 'Cet événement a peut-être expiré ou été supprimé.',
    location_disabled_title: 'Localisation désactivée',
    location_disabled_msg: 'Activez la permission de localisation dans les paramètres de votre téléphone pour centrer la carte.',

    // NavigationModal
    nav_location_denied: 'Permission de localisation refusée',
    nav_location_error: 'Erreur lors de l\'obtention de la localisation',
    nav_route_error: "Impossible de calculer l'itinéraire",
    nav_start_btn: '▶  Démarrer',
    nav_finish_btn: '✓  Terminer',

    // MercadoPagoModal
    support_modal_body: "Alertoo est développé avec soin et maintenu sans publicités intrusives. Votre don aide à payer les serveurs, les cartes et les nouveautés.",
    donate_mp_failed: "Impossible d'ouvrir Mercado Pago. Vérifiez votre connexion.",
    donate_tier_cafe_label: 'Café',
    donate_tier_cafe_desc: 'Un café pour l\'équipe',
    donate_tier_apoio_label: 'Soutien',
    donate_tier_apoio_desc: 'Aide pour le serveur',
    donate_tier_parceiro_label: 'Partenaire',
    donate_tier_parceiro_desc: 'Partenaire d\'Alertoo',
    donate_tier_heroi_label: 'Héros',
    donate_tier_heroi_desc: 'Héros de la communauté',

    // BuyCreditsScreen
    buy_credits_hero_desc: 'Utilisez des crédits pour promouvoir vos restaurants, bars et événements sur la carte avec une mise en avant spéciale.',
    buy_credits_watch_ad_title: 'Regarder une pub → +1 crédit',
    buy_credits_ad_cooldown: '⏳ Disponible à nouveau dans 1 heure',
    buy_credits_ad_ready: '✅ Pub prête — appuyez pour regarder',
    buy_credits_ad_loading: '⏳ Chargement de la pub...',
    buy_credits_or_buy: 'ou achetez des crédits',
    buy_credits_ad_reward_title: '🎉 +1 crédit !',
    buy_credits_ad_reward_msg: 'Vous avez gagné 1 crédit de promotion en regardant la publicité.',
    buy_credits_ad_reward_btn: 'Super !',
    buy_credits_ad_failed: "Impossible d'afficher la publicité.",
    buy_credits_payment_failed_title: '❌ Paiement non effectué',
    buy_credits_payment_failed_msg: 'Le paiement a été annulé ou refusé. Réessayez.',
    buy_credits_fallback_title: '⚠️ Lien générique ouvert',
    buy_credits_fallback_msg: "Impossible de générer un lien personnalisé. Après avoir effectué le paiement, contactez-nous depuis l'écran Profil pour recevoir vos crédits.",
    buy_credits_fallback_btn: 'Compris',
    buy_credits_open_mp_failed: "Impossible d'ouvrir Mercado Pago.",
    buy_credits_confirmed_title: '✅ Paiement confirmé !',
    buy_credits_confirmed_msg: '{credits} crédit(s) ajouté(s) à votre compte.',
    buy_credits_pending_title: '⏳ Paiement en cours',
    buy_credits_pending_msg: 'Votre paiement est encore en cours de traitement par Mercado Pago. Attendez quelques minutes et réessayez.',
    buy_credits_rejected_title: '❌ Paiement non approuvé',
    buy_credits_rejected_msg: 'Le paiement a été refusé ou annulé. Réessayez.',
    buy_credits_verify_failed: 'Impossible de vérifier le paiement.',
    try_again: 'Réessayer',
    understood: 'Compris',

    // CommentsModal
    comment_cooldown: 'Attendez {n}s pour commenter à nouveau.',
    comments_anonymous_user: 'Utilisateur',

    // Système de signalement (Option D)
    report_event: 'Signaler événement',
    report_reason_title: 'Motif du signalement',
    report_reason_nudity: 'Photo inappropriée / nudité',
    report_reason_violence: 'Violence ou contenu choquant',
    report_reason_spam: 'Spam ou contenu trompeur',
    report_reason_other: 'Autre',
    report_note_placeholder: 'Détails supplémentaires (facultatif)',
    report_send: 'Envoyer le signalement',
    report_sending: 'Envoi en cours...',
    report_success_title: 'Signalement envoyé',
    report_success_msg: 'Merci ! Notre équipe examinera le contenu.',
    report_already_sent: 'Vous avez déjà signalé cet événement.',
    report_login_required: 'Connectez-vous pour signaler des événements.',

    // Leaderboard
    leaderboard_title: 'Classement',
    leaderboard_sub: 'Meilleurs utilisateurs par score',

    // FilterModal
    filter_category: "Catégorie d'événement",
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
