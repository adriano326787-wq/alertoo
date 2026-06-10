/**
 * submit-indexnow.js
 *
 * Notifica Bing/Yandex (protocolo IndexNow) sobre as URLs novas/alteradas
 * desta sessão: 90 páginas locais (/lei-seca/{slug}, /festas-e-eventos/{slug})
 * + 2 páginas hub atualizadas (/lei-seca, /festas-e-eventos).
 *
 * Usa a key já publicada em public/d5a6299b4b544f828ecc54b9d0e505d4.txt.
 */
const fs = require('fs');
const path = require('path');
const { STATES, CITIES } = require('./seo-locations-data');

const HOST = 'alertoo.com.br';
const KEY = 'd5a6299b4b544f828ecc54b9d0e505d4';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const ALL_LOCATIONS = [...STATES, ...CITIES];
const urlList = [
  `https://${HOST}/lei-seca`,
  `https://${HOST}/festas-e-eventos`,
  ...ALL_LOCATIONS.map((l) => `https://${HOST}/lei-seca/${l.slug}`),
  ...ALL_LOCATIONS.map((l) => `https://${HOST}/festas-e-eventos/${l.slug}`),
];

console.log(`Enviando ${urlList.length} URLs para o IndexNow...`);

fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  }),
})
  .then(async (res) => {
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    if (text) console.log('Resposta:', text);
  })
  .catch((err) => console.error('Erro:', err));
