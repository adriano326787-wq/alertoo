"use strict";
/**
 * Traduções server-side pras notificações push e e-mails transacionais.
 *
 * Duplica intencionalmente o mapeamento COUNTRY_TO_LANG de src/utils/i18n.ts
 * (client e Cloud Functions são bundles separados — mesmo padrão já usado em
 * resolveRegion/resolveCurrencyForCountry). Mantém as msmas 4 línguas do app
 * (pt/en/es/fr) pra nunca notificar alguém em um idioma que o app não suporta.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIF_STATIC = void 0;
exports.resolveLangForCountry = resolveLangForCountry;
exports.normalizeLangCode = normalizeLangCode;
exports.categoryLabel = categoryLabel;
exports.entertainmentCommentTitle = entertainmentCommentTitle;
exports.entertainmentCommentBody = entertainmentCommentBody;
exports.roadEventConfirmedTitle = roadEventConfirmedTitle;
exports.roadEventConfirmedBody = roadEventConfirmedBody;
exports.radarConfirmedTitle = radarConfirmedTitle;
exports.radarConfirmedBody = radarConfirmedBody;
exports.verificationEmailStrings = verificationEmailStrings;
exports.betaInviteEmailStrings = betaInviteEmailStrings;
exports.brazilOnlyMessage = brazilOnlyMessage;
const COUNTRY_TO_LANG = {
    // Português
    BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt', ST: 'pt', TL: 'pt',
    // Espanhol
    AR: 'es', CL: 'es', CO: 'es', MX: 'es', PE: 'es', VE: 'es', EC: 'es', BO: 'es',
    PY: 'es', UY: 'es', CR: 'es', CU: 'es', DO: 'es', GT: 'es', HN: 'es', NI: 'es',
    PA: 'es', SV: 'es', ES: 'es', GQ: 'es', PH: 'es',
    // Francês
    FR: 'fr', BE: 'fr', CH: 'fr', CA: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', MG: 'fr',
};
/** País ausente/desconhecido cai em 'pt' (base histórica do app é majoritariamente BR),
 *  igual ao comportamento anterior antes desta função existir. */
function resolveLangForCountry(countryCode) {
    if (!countryCode)
        return 'pt';
    return COUNTRY_TO_LANG[countryCode.toUpperCase()] ?? 'en';
}
const VALID_LANGS = ['pt', 'en', 'es', 'fr'];
/**
 * Normaliza um código de idioma salvo pelo client (ex: 'pt-BR', 'es', 'EN')
 * pro subconjunto de 4 línguas suportadas. Usado quando já temos o idioma
 * escolhido pelo usuário no site/app (mais direto que inferir do país).
 */
function normalizeLangCode(raw) {
    if (!raw)
        return 'pt';
    const primary = raw.trim().toLowerCase().split('-')[0];
    return VALID_LANGS.includes(primary) ? primary : 'pt';
}
// ─── Rótulos de categoria de evento de trânsito ──────────────────────────────
const CATEGORY_LABELS = {
    pt: {
        drunkcheck: 'Lei Seca', policeblitz: 'blitz', accident: 'acidente', roadwork: 'obras',
        flood: 'alagamento', closure: 'interdição', traffic: 'congestionamento', hazard: 'perigo na via', radar: 'radar',
    },
    en: {
        drunkcheck: 'DUI checkpoint', policeblitz: 'police checkpoint', accident: 'accident', roadwork: 'roadwork',
        flood: 'flooding', closure: 'road closure', traffic: 'traffic jam', hazard: 'road hazard', radar: 'speed camera',
    },
    es: {
        drunkcheck: 'control de alcoholemia', policeblitz: 'control policial', accident: 'accidente', roadwork: 'obras',
        flood: 'inundación', closure: 'corte de vía', traffic: 'congestión', hazard: 'peligro en la vía', radar: 'radar',
    },
    fr: {
        drunkcheck: "contrôle d'alcoolémie", policeblitz: 'contrôle policier', accident: 'accident', roadwork: 'travaux',
        flood: 'inondation', closure: 'route fermée', traffic: 'embouteillage', hazard: 'danger routier', radar: 'radar',
    },
};
const FALLBACK_CATEGORY_LABEL = { pt: 'alerta', en: 'alert', es: 'alerta', fr: 'alerte' };
function categoryLabel(lang, category) {
    return CATEGORY_LABELS[lang][category] ?? FALLBACK_CATEGORY_LABEL[lang];
}
// ─── Notificações estáticas (título + corpo fixos) ───────────────────────────
exports.NOTIF_STATIC = {
    blitzReminder: {
        pt: { title: '🚔 Viu alguma blitz hoje?', body: 'Ajude outros motoristas — reporte blitz ou lei seca na sua região.' },
        en: { title: '🚔 Seen a checkpoint today?', body: 'Help other drivers — report a checkpoint or DUI control in your area.' },
        es: { title: '🚔 ¿Viste algún control hoy?', body: 'Ayuda a otros conductores — reporta un control policial o de alcoholemia en tu zona.' },
        fr: { title: "🚔 Vu un contrôle aujourd'hui ?", body: 'Aidez les autres conducteurs — signalez un contrôle dans votre région.' },
    },
    streakReminder: {
        pt: { title: '🔥 Seu streak quebra à meia-noite!', body: 'Faça qualquer report ou confirmação hoje pra manter sua sequência de dias ativos.' },
        en: { title: '🔥 Your streak breaks at midnight!', body: 'Make any report or confirmation today to keep your daily streak alive.' },
        es: { title: '🔥 ¡Tu racha se rompe a medianoche!', body: 'Haz cualquier reporte o confirmación hoy para mantener tu racha de días activos.' },
        fr: { title: '🔥 Votre série se termine à minuit !', body: "Faites un signalement ou une confirmation aujourd'hui pour garder votre série active." },
    },
};
const ENTERTAINMENT_COMMENT_TITLE = {
    pt: '💬 Novo comentário no seu evento', en: '💬 New comment on your event',
    es: '💬 Nuevo comentario en tu evento', fr: '💬 Nouveau commentaire sur votre événement',
};
const SOMEONE = { pt: 'Alguém', en: 'Someone', es: 'Alguien', fr: "Quelqu'un" };
function entertainmentCommentTitle(lang) {
    return ENTERTAINMENT_COMMENT_TITLE[lang];
}
function entertainmentCommentBody(lang, name, eventTitle) {
    const n = name || SOMEONE[lang];
    switch (lang) {
        case 'es': return `${n} comentó en "${eventTitle}".`;
        case 'fr': return `${n} a commenté sur « ${eventTitle} ».`;
        case 'en': return `${n} commented on "${eventTitle}".`;
        default: return `${n} comentou em "${eventTitle}".`;
    }
}
const ROAD_EVENT_CONFIRMED_TITLE = {
    pt: '✅ Alguém confirmou seu alerta', en: '✅ Someone confirmed your alert',
    es: '✅ Alguien confirmó tu alerta', fr: '✅ Quelqu\'un a confirmé votre alerte',
};
function roadEventConfirmedTitle(lang) {
    return ROAD_EVENT_CONFIRMED_TITLE[lang];
}
function roadEventConfirmedBody(lang, categoryLbl, count) {
    if (count === 1) {
        switch (lang) {
            case 'es': return `Tu reporte de ${categoryLbl} acaba de ser confirmado por otro conductor.`;
            case 'fr': return `Votre signalement de ${categoryLbl} vient d'être confirmé par un autre conducteur.`;
            case 'en': return `Your ${categoryLbl} report was just confirmed by another driver.`;
            default: return `Seu report de ${categoryLbl} acabou de ser confirmado por outro motorista.`;
        }
    }
    switch (lang) {
        case 'es': return `Tu reporte de ${categoryLbl} ya fue confirmado ${count} veces — ¡estás ayudando a mucha gente!`;
        case 'fr': return `Votre signalement de ${categoryLbl} a été confirmé ${count} fois — vous aidez beaucoup de monde !`;
        case 'en': return `Your ${categoryLbl} report has been confirmed ${count} times — you're helping a lot of people!`;
        default: return `Seu report de ${categoryLbl} já foi confirmado ${count} vezes — você está ajudando muita gente!`;
    }
}
const RADAR_CONFIRMED_TITLE = {
    pt: '✅ Alguém confirmou seu radar', en: '✅ Someone confirmed your speed camera',
    es: '✅ Alguien confirmó tu radar', fr: '✅ Quelqu\'un a confirmé votre radar',
};
function radarConfirmedTitle(lang) {
    return RADAR_CONFIRMED_TITLE[lang];
}
function radarConfirmedBody(lang, count) {
    if (count === 1) {
        switch (lang) {
            case 'es': return 'Otro conductor confirmó que tu radar reportado sigue allí.';
            case 'fr': return 'Un autre conducteur a confirmé que votre radar signalé est toujours là.';
            case 'en': return 'Another driver confirmed your reported speed camera is still there.';
            default: return 'Outro motorista confirmou que seu radar reportado ainda está lá.';
        }
    }
    switch (lang) {
        case 'es': return `Tu radar ya fue confirmado ${count} veces — ¡estás ayudando a mucha gente!`;
        case 'fr': return `Votre radar a été confirmé ${count} fois — vous aidez beaucoup de monde !`;
        case 'en': return `Your speed camera has been confirmed ${count} times — you're helping a lot of people!`;
        default: return `Seu radar já foi confirmado ${count} vezes — você está ajudando muita gente!`;
    }
}
// ─── E-mail de verificação ────────────────────────────────────────────────────
function verificationEmailStrings(lang, displayName) {
    const name = displayName ? displayName : '';
    switch (lang) {
        case 'es':
            return {
                subject: 'Confirma tu correo - Alertoo',
                greeting: name ? `¡Hola, ${name}!` : '¡Hola!',
                body: 'Confirma tu correo para activar tu cuenta y empezar a recibir alertas en tiempo real de tu región.',
                button: 'Confirmar correo',
                footerIgnore: 'Si no creaste una cuenta en Alertoo, puedes ignorar este correo.',
                footerCopyLink: 'Si el botón no funciona, copia y pega este enlace en el navegador:',
            };
        case 'en':
            return {
                subject: 'Confirm your email - Alertoo',
                greeting: name ? `Hi, ${name}!` : 'Hi!',
                body: 'Confirm your email to activate your account and start receiving real-time alerts for your region.',
                button: 'Confirm email',
                footerIgnore: "If you didn't create an Alertoo account, you can ignore this email.",
                footerCopyLink: "If the button doesn't work, copy and paste this link into your browser:",
            };
        case 'fr':
            return {
                subject: 'Confirmez votre e-mail - Alertoo',
                greeting: name ? `Bonjour, ${name} !` : 'Bonjour !',
                body: 'Confirmez votre e-mail pour activer votre compte et recevoir des alertes en temps réel de votre région.',
                button: 'Confirmer l\'e-mail',
                footerIgnore: "Si vous n'avez pas créé de compte Alertoo, ignorez cet e-mail.",
                footerCopyLink: 'Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :',
            };
        default:
            return {
                subject: 'Confirme seu e-mail - Alertoo',
                greeting: name ? `Ola, ${name}!` : 'Ola!',
                body: 'Confirme seu e-mail para ativar sua conta e comecar a receber alertas em tempo real da sua regiao.',
                button: 'Confirmar e-mail',
                footerIgnore: 'Se voce nao criou uma conta no Alertoo, pode ignorar este e-mail.',
                footerCopyLink: 'Se o botao nao funcionar, copie e cole este link no navegador:',
            };
    }
}
// ─── E-mail de convite do programa de testes (Play Console) ─────────────────
function betaInviteEmailStrings(lang) {
    switch (lang) {
        case 'es':
            return {
                subject: '🧪 ¡Entraste al programa de pruebas de Alertoo!',
                heading: '🧪 ¡Bienvenido al programa de pruebas de Alertoo!',
                body: 'Recibimos tu registro. Tendrás acceso a las novedades antes que nadie.\n\nPróximo paso: haz clic en el botón para aceptar la invitación de pruebas de Google Play. Puede tardar algunas horas en habilitarse tu correo — si el enlace no funciona al principio, inténtalo más tarde.',
                button: 'Entrar al programa de pruebas',
                footer: 'Si no solicitaste esto, puedes ignorar este correo.',
            };
        case 'en':
            return {
                subject: "🧪 You're in Alertoo's testing program!",
                heading: '🧪 Welcome to the Alertoo testing program!',
                body: "We received your signup. You'll get access to new features before everyone else.\n\nNext step: click the button below to accept the Google Play testing invite. It may take a few hours for your email to be allowed — if the link doesn't work right away, try again later.",
                button: 'Join the testing program',
                footer: "If you didn't request this, you can ignore this email.",
            };
        case 'fr':
            return {
                subject: "🧪 Vous avez rejoint le programme de test d'Alertoo !",
                heading: "🧪 Bienvenue dans le programme de test d'Alertoo !",
                body: "Nous avons bien reçu votre inscription. Vous aurez accès aux nouveautés avant tout le monde.\n\nProchaine étape : cliquez sur le bouton pour accepter l'invitation de test Google Play. Cela peut prendre quelques heures — si le lien ne fonctionne pas tout de suite, réessayez plus tard.",
                button: 'Rejoindre le programme de test',
                footer: "Si vous n'avez pas demandé ceci, vous pouvez ignorer cet e-mail.",
            };
        default:
            return {
                subject: '🧪 Você entrou no programa de testes do Alertoo!',
                heading: '🧪 Bem-vindo ao programa de testes do Alertoo!',
                body: 'Recebemos seu cadastro. Você terá acesso às novidades antes de todo mundo.\n\nPróximo passo: clique no botão abaixo pra aceitar o convite de testes do Google Play. Pode levar algumas horas até o seu e-mail ser liberado na nossa lista — se o link não funcionar de primeira, tente novamente mais tarde.',
                button: 'Entrar no programa de testes',
                footer: 'Se você não pediu isso, pode ignorar este e-mail.',
            };
    }
}
const BRAZIL_ONLY_MESSAGES = {
    mercadopago: {
        pt: 'Mercado Pago disponivel apenas no Brasil. Use o cartao internacional (Stripe).',
        en: 'Mercado Pago is only available in Brazil. Please use the international card (Stripe).',
        es: 'Mercado Pago solo está disponible en Brasil. Usa la tarjeta internacional (Stripe).',
        fr: 'Mercado Pago est disponible uniquement au Brésil. Utilisez la carte internationale (Stripe).',
    },
    pix: {
        pt: 'Pix disponivel apenas no Brasil. Use o cartao internacional (Stripe).',
        en: 'Pix is only available in Brazil. Please use the international card (Stripe).',
        es: 'Pix solo está disponible en Brasil. Usa la tarjeta internacional (Stripe).',
        fr: 'Pix est disponible uniquement au Brésil. Utilisez la carte internationale (Stripe).',
    },
    donation: {
        pt: 'Doacoes disponiveis apenas no Brasil no momento.',
        en: 'Donations are currently only available in Brazil.',
        es: 'Las donaciones solo están disponibles en Brasil por el momento.',
        fr: "Les dons ne sont actuellement disponibles qu'au Brésil.",
    },
};
function brazilOnlyMessage(lang, method) {
    return BRAZIL_ONLY_MESSAGES[method][lang];
}
//# sourceMappingURL=i18nNotifications.js.map