// Roda dentro do contexto do firebase-admin com as credenciais do firebase CLI.
// Invocado via: firebase functions:shell < scripts/create-leiseca-jun28-admin.js

const admin = require('firebase-admin');

try { admin.initializeApp(); } catch (e) { /* já inicializado pelo functions:shell */ }

const db = admin.firestore();
const now = Date.now();
const TTL_MINUTES = 240; // Lei Seca = 4h
const MIN_REMAINING_MS = 60 * 60 * 1000;

const events = [
  { title: 'Lei Seca - Dom Atacadista, 2 Sentidos', description: 'Av Caravelas, Dom Atacadista, 2 Sentidos, Angra dos Reis', latitude: -23.0067, longitude: -44.3181, cityName: 'Angra dos Reis', stateUF: 'RJ', reportedAgoMin: 182 },
  { title: 'Lei Seca - Santa Mônica / Subway, Campos dos Afonsos', description: 'Rua Divisória, 88, Santa Mônica / Subway, Campos dos Afonsos, Bento Ribeiro', latitude: -22.8453, longitude: -43.3611, cityName: 'Rio de Janeiro', stateUF: 'RJ', reportedAgoMin: 95 },
  { title: 'Lei Seca - SENAI / Hotel Ramada, Praça da Bíblia', description: 'R. Bruno de Azevedo, 32, Parque Tamandaré, SENAI / Hotel Ramada, Praça da Bíblia', latitude: -21.7545, longitude: -41.3244, cityName: 'Campos dos Goytacazes', stateUF: 'RJ', reportedAgoMin: 101 },
  { title: 'Lei Seca - Vivo Rio / Antes do SDU, Av Brasil', description: 'Av. Infante Dom Henrique, Vivo Rio / Antes do SDU, Av Brasil, Centro', latitude: -22.9356, longitude: -43.1729, cityName: 'Rio de Janeiro', stateUF: 'RJ', reportedAgoMin: 119 },
  { title: 'Lei Seca - DPO Praia dos Cavaleiros / Droga Raia', description: 'Av N Srª da Glória, DPO Praia dos Cavaleiros / Droga Raia, Centro', latitude: -22.3708, longitude: -41.7869, cityName: 'Macaé', stateUF: 'RJ', reportedAgoMin: 88 },
  { title: 'Lei Seca - Educandário Terra Santa, Único', description: 'Rua Monsenhor Bacelar, 489, Educandário Terra Santa, Único', latitude: -22.5079, longitude: -43.1857, cityName: 'Petrópolis', stateUF: 'RJ', reportedAgoMin: 197 },
  { title: 'Lei Seca - Padaria Rei do Recreio / Após Ponte de Madeira', description: 'Av. Pedro Moura, 128, Recreio dos Bandeirantes, Padaria Rei do Recreio / Após Ponte de Madeira, 2 Sentidos', latitude: -23.0099, longitude: -43.4639, cityName: 'Rio de Janeiro', stateUF: 'RJ', reportedAgoMin: 35 },
];

async function run() {
  for (const ev of events) {
    const createdAtMs = now - ev.reportedAgoMin * 60 * 1000;
    const naturalExpiry = createdAtMs + TTL_MINUTES * 60 * 1000;
    const expiresAtMs = Math.max(naturalExpiry, now + MIN_REMAINING_MS);

    const ref = await db.collection('events').add({
      category: 'drunkcheck',
      title: ev.title,
      description: ev.description,
      latitude: ev.latitude,
      longitude: ev.longitude,
      createdAt: admin.firestore.Timestamp.fromMillis(createdAtMs),
      expiresAt: admin.firestore.Timestamp.fromMillis(expiresAtMs),
      confirmations: 0,
      denials: 0,
      voters: [],
      userId: 'admin',
      stateUF: ev.stateUF,
      cityName: ev.cityName,
      countryCode: 'BR',
      speedLimit: null,
    });
    console.log('Criado:', ref.id, '-', ev.title);
  }
  console.log('Todos os eventos criados.');
}

run().catch(console.error);
