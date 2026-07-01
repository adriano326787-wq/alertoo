"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onBetaTesterAdded = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const shared_1 = require("./shared");
/**
 * A Play Developer API (androidpublisher.edits.testers) NÃO suporta mais
 * listas de e-mail individuais — só Google Groups (que exigiria um domínio
 * Google Workspace). Então não dá pra adicionar o tester 100% automático
 * via API; o admin ainda precisa colar o e-mail na lista de testers do
 * Play Console manualmente (Versão > Testes > Closed testing > Testers).
 *
 * O que ESSA function automatiza: assim que alguém se cadastra, já manda
 * o e-mail com o link de opt-in pro tester — ele só vai conseguir entrar
 * de fato depois que o e-mail estiver na lista do Play Console, mas não
 * precisa esperar nem perguntar nada, o link já chega.
 */
const OPT_IN_URL = 'https://play.google.com/apps/testing/com.alertoo.app';
function buildInviteEmailHtml() {
    return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#FF5722;">🧪 Bem-vindo ao programa de testes do Alertoo!</h2>
      <p>Recebemos seu cadastro. Você terá acesso às novidades antes de todo mundo.</p>
      <p><strong>Próximo passo:</strong> clique no botão abaixo pra aceitar o convite de testes do Google Play. Pode levar algumas horas até o seu e-mail ser liberado na nossa lista — se o link não funcionar de primeira, tente novamente mais tarde.</p>
      <p style="text-align:center; margin: 32px 0;">
        <a href="${OPT_IN_URL}" style="background:#FF5722;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;">Entrar no programa de testes</a>
      </p>
      <p style="color:#888;font-size:13px;">Se você não pediu isso, pode ignorar este e-mail.</p>
    </div>`;
}
exports.onBetaTesterAdded = (0, firestore_1.onDocumentCreated)({ document: 'beta_testers/{entryId}', region: 'us-central1', secrets: [shared_1.RESEND_API_KEY] }, async (event) => {
    const snap = event.data;
    const email = snap?.data()?.email;
    if (!snap || !email)
        return;
    try {
        const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${(0, shared_1.readSecret)(shared_1.RESEND_API_KEY)}`,
            },
            body: JSON.stringify({
                from: 'Alertoo <noreply@alertoo.com.br>',
                to: [email],
                subject: '🧪 Você entrou no programa de testes do Alertoo!',
                html: buildInviteEmailHtml(),
            }),
        });
        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Resend ${resp.status}: ${txt}`);
        }
        await snap.ref.update({ invited: true, invitedAt: new Date() });
        console.log(`[playTesters] e-mail de convite enviado para ${email}.`);
    }
    catch (e) {
        console.error('[playTesters] falha ao enviar e-mail de convite:', e);
        await snap.ref.update({ invited: false, inviteError: String(e) }).catch(() => { });
    }
    // Lembrete pro admin: o e-mail ainda precisa ser adicionado manualmente
    // na lista de testers da track "internal" no Play Console pra funcionar de fato.
    const pendingSnap = await shared_1.db.collection('beta_testers').where('invited', '==', true).count().get();
    console.log(`[playTesters] total de testers convidados (precisam ser colados no Play Console): ${pendingSnap.data().count}`);
});
//# sourceMappingURL=playTesters.js.map