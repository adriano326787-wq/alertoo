#!/usr/bin/env node
/**
 * export-error-log.mjs — exporta os erros de error_logs (Firestore) para um
 * arquivo .txt local, sem precisar de tela de admin no app nem de token de
 * API do Sentry.
 *
 * Uso:
 *   FIREBASE_TOKEN=<refresh token do firebase login:ci> node scripts/export-error-log.mjs
 *
 * O FIREBASE_TOKEN é o mesmo usado pelos outros scripts admin deste projeto
 * (ex: create-lei-seca.mjs) — gerar com `firebase login:ci` se não tiver um.
 *
 * Escreve/sobrescreve error-log.txt na raiz do projeto, mais recente primeiro.
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'lei-seca---eventos';
const LIMIT = 200;

async function getAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Token refresh falhou: ${JSON.stringify(json.error)}`);
  return json.access_token;
}

function fsValueToJs(value) {
  if (value == null) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  return value;
}

function docToRecord(doc) {
  const fields = doc.fields ?? {};
  const record = {};
  for (const [key, value] of Object.entries(fields)) {
    record[key] = fsValueToJs(value);
  }
  return record;
}

async function fetchErrorLogs(accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'error_logs' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: LIMIT,
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`runQuery falhou (${res.status}): ${text}`);
  }
  const rows = await res.json();
  return rows
    .filter((r) => r.document)
    .map((r) => docToRecord(r.document));
}

function formatRecord(rec, index) {
  const lines = [];
  lines.push(`#${index + 1} — ${rec.createdAt ?? '(sem data)'}`);
  lines.push(`  Onde:       ${rec.where ?? '(não informado)'}`);
  lines.push(`  Plataforma: ${rec.platform ?? '?'}  |  App: ${rec.appVersion ?? '?'}`);
  lines.push(`  Mensagem:   ${rec.message ?? '(sem mensagem)'}`);
  if (rec.stack) {
    lines.push('  Stack:');
    rec.stack.split('\n').slice(0, 8).forEach((l) => lines.push(`    ${l}`));
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const refreshToken = process.env.FIREBASE_TOKEN;
  if (!refreshToken) {
    console.error('FIREBASE_TOKEN não definido. Gere um com: firebase login:ci');
    process.exit(1);
  }

  console.log('[export-error-log] obtendo access token...');
  const accessToken = await getAccessToken(refreshToken);

  console.log('[export-error-log] consultando error_logs no Firestore...');
  const records = await fetchErrorLogs(accessToken);

  if (records.length === 0) {
    console.log('[export-error-log] nenhum erro registrado — nada a exportar.');
  }

  const header = [
    '═'.repeat(70),
    `  ERROR LOG — Alertoo`,
    `  Exportado em: ${new Date().toISOString()}`,
    `  Total de registros: ${records.length} (máx ${LIMIT} mais recentes)`,
    '═'.repeat(70),
    '',
  ].join('\n');

  const body = records.map((rec, i) => formatRecord(rec, i)).join('\n');
  const outPath = join(__dirname, '..', 'error-log.txt');
  writeFileSync(outPath, header + '\n' + body, 'utf-8');

  console.log(`[export-error-log] escrito em ${outPath} (${records.length} registros)`);
}

main().catch((err) => {
  console.error('[export-error-log] falhou:', err.message);
  process.exit(1);
});
