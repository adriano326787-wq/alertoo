/**
 * test-mp.js — Testes de integração com Mercado Pago (sandbox)
 *
 * Uso:
 *   node functions/test-mp.js <TEST_ACCESS_TOKEN>
 *
 * Exemplo:
 *   node functions/test-mp.js TEST-1234567890abcdef...
 *
 * Cartões de teste do Mercado Pago:
 *   Aprovado:  5031 7557 3453 0604 | CVV: 123 | Validade: 11/25 | Nome: APRO
 *   Recusado:  5031 7557 3453 0604 | CVV: 123 | Validade: 11/25 | Nome: OTHE
 *   Pendente:  5031 7557 3453 0604 | CVV: 123 | Validade: 11/25 | Nome: CONT
 *
 * Documentação completa:
 *   https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/integration-test/test-cards
 */

const TEST_TOKEN = process.argv[2];

if (!TEST_TOKEN || (!TEST_TOKEN.startsWith('TEST-') && !TEST_TOKEN.startsWith('APP_USR-'))) {
  console.error('\n❌ Token inválido! Deve começar com TEST- ou APP_USR-\n');
  process.exit(1);
}
const IS_TEST_TOKEN = TEST_TOKEN.startsWith('TEST-');

const MP_API = 'https://api.mercadopago.com';
const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TEST_TOKEN}`,
};

// Pacotes válidos (espelho de functions/src/index.ts)
const CREDIT_PACKAGES = {
  pkg_1:  { credits: 1,  price: 4.99,  label: '1 crédito' },
  pkg_5:  { credits: 5,  price: 19.99, label: '5 créditos' },
  pkg_10: { credits: 10, price: 34.99, label: '10 créditos' },
  pkg_20: { credits: 20, price: 59.99, label: '20 créditos' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  ✅ ${label}`);
}

function fail(label, detail) {
  failed++;
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     ${detail}`);
}

async function fetchMP(path, options = {}) {
  const resp = await fetch(`${MP_API}${path}`, {
    headers: HEADERS,
    ...options,
  });
  const body = await resp.json().catch(() => ({}));
  return { status: resp.status, ok: resp.ok, body };
}

// ─── Testes ───────────────────────────────────────────────────────────────────

async function testCredentials() {
  console.log('\n📋 1. Validação das credenciais de teste');
  const { status, ok: isOk, body } = await fetchMP('/users/me');
  if (isOk && body.id) {
    const tipo = IS_TEST_TOKEN ? '🧪 Teste (TEST-)' : '🔴 Produção (APP_USR-)';
    ok(`Token válido — ${tipo} | Conta: ${body.email ?? body.id} | Site: ${body.site_id ?? 'MLB'}`);
    if (!IS_TEST_TOKEN) {
      console.log('     ⚠️  ATENÇÃO: token de PRODUÇÃO detectado. Preferências criadas serão reais.');
      console.log('     ⚠️  Para sandbox verdadeiro use o token TEST- do painel MP → Credenciais → Teste.');
    }
  } else {
    fail('Token inválido ou expirado', `Status: ${status} — ${JSON.stringify(body).slice(0, 120)}`);
    process.exit(1);
  }
}

async function testCreatePreference(packageId) {
  const pkg = CREDIT_PACKAGES[packageId];
  const fakeUid = `test_user_${Date.now()}`;
  const externalReference = `${fakeUid}|${packageId}|${Date.now()}`;

  const payload = {
    items: [{
      id: packageId,
      title: pkg.label,
      description: `${pkg.credits} crédito(s) para promoção no Alertoo`,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: pkg.price,
    }],
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }],
      installments: 1,
    },
    back_urls: {
      success: 'alertoo://payment/success',
      failure: 'alertoo://payment/failure',
      pending: 'alertoo://payment/pending',
    },
    statement_descriptor: 'ALERTOO',
    external_reference: externalReference,
  };

  const { status, ok: isOk, body } = await fetchMP('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (isOk && body.id && body.init_point) {
    ok(`Preferência criada para ${pkg.label} (R$ ${pkg.price})`);
    console.log(`     preference_id:      ${body.id}`);
    console.log(`     external_reference: ${externalReference}`);
    console.log(`     init_point: ${body.init_point.slice(0, 80)}...`);
    return { prefId: body.id, externalReference };
  } else {
    fail(`Falha ao criar preferência para ${pkg.label}`, `Status ${status}: ${JSON.stringify(body).slice(0, 200)}`);
    return null;
  }
}

async function testPaymentSearch(externalReference) {
  // MP não aceita preference_id como filtro — a busca correta usa external_reference
  const encoded = encodeURIComponent(externalReference);
  const { status, ok: isOk, body } = await fetchMP(
    `/v1/payments/search?external_reference=${encoded}&sort=date_created&criteria=desc`
  );

  if (isOk) {
    const count = body.results?.length ?? 0;
    ok(`Busca por external_reference OK (${count} pagamento${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''})`);
    if (count === 0) {
      console.log('     ℹ️  Nenhum pagamento — esperado para preferência recém-criada sem checkout');
    }
    return body.results?.[0] ?? null;
  } else {
    fail('Falha na busca por external_reference', `Status ${status}: ${JSON.stringify(body).slice(0, 200)}`);
    return null;
  }
}

async function testPreferenceIdSearchFails(preferenceId) {
  // Confirma que preference_id NÃO é parâmetro válido (regressão)
  const { ok: isOk, status } = await fetchMP(
    `/v1/payments/search?preference_id=${preferenceId}&sort=date_created&criteria=desc`
  );
  if (!isOk && status === 400) {
    ok('Confirmado: preference_id rejeitado pela API (busca deve usar external_reference)');
  } else {
    fail('Inesperado: preference_id foi aceito — pode ter mudado na API do MP');
  }
}

async function testCreateDonationPreference(amount) {
  const labels = { 5: '☕ Café', 10: '🙌 Servidor', 25: '🚀 Parceiro', 50: '🏆 Herói' };
  const payload = {
    items: [{
      id: `donation_${amount}`,
      title: `Apoio Alertoo — ${labels[amount]}`,
      description: 'Doação para manter o Alertoo gratuito',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: amount,
    }],
    back_urls: {
      success: 'alertoo://payment/success',
      failure: 'alertoo://payment/failure',
      pending: 'alertoo://payment/pending',
    },
    statement_descriptor: 'ALERTOO APOIO',
  };

  const { status, ok: isOk, body } = await fetchMP('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (isOk && body.id) {
    ok(`Preferência de doação criada: R$ ${amount} (${labels[amount]})`);
    return body.id;
  } else {
    fail(`Falha na preferência de doação R$ ${amount}`, `Status ${status}: ${JSON.stringify(body).slice(0, 200)}`);
    return null;
  }
}

async function testInvalidPackage() {
  // Simula o que aconteceria se um packageId inválido chegasse — a Cloud Function
  // bloquearia antes disso, mas testamos a API diretamente para garantir que o
  // campo unit_price com 0 ou negativo é rejeitado.
  const payload = {
    items: [{ id: 'pkg_invalido', title: 'Teste Inválido', quantity: 1, currency_id: 'BRL', unit_price: 0 }],
  };
  const { status, ok: isOk } = await fetchMP('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!isOk && status >= 400) {
    ok(`Pacote inválido (unit_price=0) rejeitado corretamente pela API (HTTP ${status})`);
  } else {
    fail('API aceitou unit_price=0 — comportamento inesperado', `Status: ${status}`);
  }
}

async function testBackUrlsPresent(preferenceId) {
  // Verifica que as back_urls foram salvas corretamente na preferência
  const { ok: isOk, body } = await fetchMP(`/checkout/preferences/${preferenceId}`);
  if (isOk && body.back_urls) {
    const { success, failure, pending } = body.back_urls;
    const allCorrect =
      success === 'alertoo://payment/success' &&
      failure === 'alertoo://payment/failure' &&
      pending === 'alertoo://payment/pending';
    if (allCorrect) {
      ok('Back URLs de deep link corretas na preferência');
    } else {
      fail('Back URLs incorretas na preferência', JSON.stringify(body.back_urls));
    }
  } else {
    fail('Não foi possível buscar a preferência para verificar back_urls');
  }
}

async function testInstallmentsRestriction(preferenceId) {
  const { ok: isOk, body } = await fetchMP(`/checkout/preferences/${preferenceId}`);
  if (isOk) {
    const maxInst = body.payment_methods?.installments;
    if (maxInst === 1) {
      ok('Parcelamento restrito a 1x (sem parcelamento)');
    } else {
      fail(`Parcelamento não está restrito — installments=${maxInst} (esperado: 1)`);
    }
  } else {
    fail('Não foi possível verificar configuração de parcelamento');
  }
}

async function testNoTicketPayment(preferenceId) {
  const { ok: isOk, body } = await fetchMP(`/checkout/preferences/${preferenceId}`);
  if (isOk) {
    const excluded = body.payment_methods?.excluded_payment_types ?? [];
    const ticketExcluded = excluded.some(e => e.id === 'ticket');
    if (ticketExcluded) {
      ok('Boleto (ticket) excluído corretamente — apenas PIX + cartão');
    } else {
      fail('Boleto NÃO foi excluído — boleto pode aparecer no checkout');
    }
  } else {
    fail('Não foi possível verificar métodos de pagamento excluídos');
  }
}

async function testExternalReference(preferenceId) {
  const { ok: isOk, body } = await fetchMP(`/checkout/preferences/${preferenceId}`);
  if (isOk && body.external_reference) {
    const parts = body.external_reference.split('|');
    if (parts.length === 3) {
      ok(`external_reference com formato correto uid|packageId|timestamp`);
    } else {
      fail('external_reference com formato inesperado', body.external_reference);
    }
  } else {
    fail('external_reference ausente na preferência');
  }
}

// ─── Runner principal ─────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  🧪 Alertoo — Testes de Integração Mercado Pago Sandbox');
  console.log('══════════════════════════════════════════════════════════');

  // 1. Valida credenciais
  await testCredentials();

  // 2. Criação de preferências de compra de créditos
  console.log('\n📦 2. Criação de preferências (compra de créditos)');
  const pref1 = await testCreatePreference('pkg_1');
  await testCreatePreference('pkg_5');
  await testCreatePreference('pkg_10');
  await testCreatePreference('pkg_20');

  // 3. Verificações de configuração da preferência
  if (pref1) {
    console.log('\n🔧 3. Verificação de configuração da preferência');
    await testBackUrlsPresent(pref1.prefId);
    await testInstallmentsRestriction(pref1.prefId);
    await testNoTicketPayment(pref1.prefId);
    await testExternalReference(pref1.prefId);
  }

  // 4. Busca de pagamentos (external_reference — método correto)
  console.log('\n🔍 4. Busca de pagamentos');
  if (pref1) {
    await testPaymentSearch(pref1.externalReference);
    await testPreferenceIdSearchFails(pref1.prefId);
  }

  // 5. Preferências de doação
  console.log('\n💛 5. Preferências de doação (MercadoPagoModal)');
  await testCreateDonationPreference(5);
  await testCreateDonationPreference(10);
  await testCreateDonationPreference(25);
  await testCreateDonationPreference(50);

  // 6. Rejeição de dados inválidos
  console.log('\n🛡️  6. Rejeição de dados inválidos');
  await testInvalidPackage();

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  const total = passed + failed;
  console.log(`  Resultado: ${passed}/${total} testes passaram`);
  if (failed === 0) {
    console.log('  🎉 Todos os testes passaram! Integração MP OK.\n');
  } else {
    console.log(`  ⚠️  ${failed} teste(s) falharam. Verifique os detalhes acima.\n`);
  }
  console.log('══════════════════════════════════════════════════════════\n');

  if (passed > 0 && failed === 0) {
    console.log('📝 Próximos passos para teste completo (pagamento real no sandbox):');
    console.log('');
    console.log('   1. Configure o token de TESTE no Firebase Secret Manager:');
    console.log(`      firebase functions:secrets:set MP_ACCESS_TOKEN`);
    console.log('      (cole o token TEST-... quando solicitado)');
    console.log('');
    console.log('   2. Deploy das functions com o token de teste:');
    console.log('      firebase deploy --only functions');
    console.log('');
    console.log('   3. No app, complete um pagamento usando os cartões de teste:');
    console.log('      Aprovado:  5031 7557 3453 0604  |  CVV: 123  |  Validade: 11/25  |  Nome: APRO');
    console.log('      Recusado:  5031 7557 3453 0604  |  CVV: 123  |  Validade: 11/25  |  Nome: OTHE');
    console.log('      Pendente:  5031 7557 3453 0604  |  CVV: 123  |  Validade: 11/25  |  Nome: CONT');
    console.log('');
    console.log('   4. Após o pagamento, toque "Verificar pagamento" no app');
    console.log('');
    console.log('   ⚠️  Depois dos testes, restaure o token de produção:');
    console.log('      firebase functions:secrets:set MP_ACCESS_TOKEN');
    console.log('      (cole o token APP_USR-... de produção)');
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n💥 Erro inesperado durante os testes:', err.message);
  process.exit(1);
});
