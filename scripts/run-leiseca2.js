const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

initializeApp({ credential: applicationDefault(), projectId: 'lei-seca---eventos' });

const db = getFirestore();
const now = Date.now();
const TTL_MINUTES = 240;
const MIN_REMAINING_MS = 60 * 60 * 1000;

const events = [
  { title: 'Lei Seca - Barra Mall / Concessionária Nissan', description: 'Av. das Américas, 7083, Barra Mall / Concessionária Nissan, Recreio', latitude: -23.0185151, longitude: -43.4634021, cityName: 'Rio de Janeiro', stateUF: 'RJ', reportedAgoMin: 79 },
  { title: "Lei Seca - Habib's, 2 Sentidos", description: "Estrada do Galeão, 2434, Habib's, 2 Sentidos, Ilha do Governador", latitude: -22.8150, longitude: -43.2400, cityName: 'Rio de Janeiro', stateUF: 'RJ', reportedAgoMin: 79 },
  { title: 'Lei Seca - Procor, Estrada do Galeão', description: 'Rua Cambaúba, Procor, Estrada do Galeão, Ilha do Governador', latitude: -22.8170, longitude: -43.2420, cityName: 'Rio de Janeiro', stateUF: 'RJ', reportedAgoMin: 26 },
  { title: 'Lei Seca - Subida do Viaduto / Clínica Enio Serra', description: 'Rua Soares Cabral, 38, Subida do Viaduto / Clínica Enio Serra, Largo do Machado, Laranjeiras', latitude: -22.9359345, longitude: -43.1859500, cityName: 'Rio de Janeiro', stateUF: 'RJ', reportedAgoMin: 26 },
  { title: 'Lei Seca - Supermarket, 2 Sentidos', description: 'Rua Martinho de Almeida, 479, Supermarket, 2 Sentidos', latitude: -22.7158510, longitude: -42.6372661, cityName: 'Rio Bonito', stateUF: 'RJ', reportedAgoMin: 146 },
  { title: "Lei Seca - McDonald's / Habib's", description: "Estrada dos Bandeirantes - Taquara, McDonald's / Habib's, Barra da Tijuca", latitude: -22.9241464, longitude: -43.3737520, cityName: 'Rio de Janeiro', stateUF: 'RJ', reportedAgoMin: 1 },
  { title: 'Lei Seca - DPO / Praça de Tinguá, 2 Sentidos', description: 'Estrada Federal de Tinguá, DPO / Praça de Tinguá, 2 Sentidos', latitude: -22.6314, longitude: -43.5316, cityName: 'Nova Iguaçu', stateUF: 'RJ', reportedAgoMin: 146 },
  { title: 'Lei Seca - Rotatória da UFRRJ / Posto Shell', description: 'Av. Pref. Alberto da Silva Lavinas, 1960, Na Rotatória da UFRRJ / Posto Shell, 2 Sentidos', latitude: -22.1201732, longitude: -43.1072134, cityName: 'Três Rios', stateUF: 'RJ', reportedAgoMin: 146 },
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
      createdAt: Timestamp.fromMillis(createdAtMs),
      expiresAt: Timestamp.fromMillis(expiresAtMs),
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

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
