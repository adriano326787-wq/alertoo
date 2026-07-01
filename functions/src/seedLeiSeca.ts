import { onRequest } from 'firebase-functions/v2/https';
import { db } from './shared';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// ─── Função temporária para seed de Lei Seca — REMOVER APÓS USO ───────────
export const seedLeiSeca = onRequest(
  { region: 'us-central1', invoker: 'private' },
  async (req, res) => {
    const now = Date.now();
    const expiresAt = now + 180 * 60 * 1000; // 3h

    const events = [
      { title: 'Lei Seca - Descida do Joá / Barra Grill', description: 'Descida do Joá / Barra Grill, Recreio dos Bandeirantes', latitude: -23.0099, longitude: -43.3024, cityName: 'Rio de Janeiro' },
      { title: 'Lei Seca - Atrás do Barra Shopping', description: 'Atrás do Barra Shopping, 2 Sentidos', latitude: -22.9960, longitude: -43.3578, cityName: 'Rio de Janeiro' },
      { title: 'Lei Seca - Saída do Túnel Novo', description: 'Saída do Túnel Novo, Praia', latitude: -22.9619, longitude: -43.1750, cityName: 'Rio de Janeiro' },
      { title: 'Lei Seca - Após Fazenda Modelo / Posto BR', description: 'Após a Fazenda Modelo / Posto BR, Campo Grande', latitude: -22.9524, longitude: -43.5769, cityName: 'Rio de Janeiro' },
      { title: 'Lei Seca - PUC / Planetário', description: 'PUC / Planetário, 2 Sentidos', latitude: -22.9786, longitude: -43.2288, cityName: 'Rio de Janeiro' },
      { title: 'Lei Seca - Supermercado Guanabara / Habib\'s', description: 'Supermercado Guanabara / Habib\'s, 2 Sentidos', latitude: -22.8529, longitude: -43.3286, cityName: 'Rio de Janeiro' },
      { title: 'Lei Seca - Igreja Lagoinha / Antiga Ita Music', description: 'Igreja Lagoinha / Antiga Ita Music, 2 Sentidos', latitude: -22.7462, longitude: -42.8557, cityName: 'Itaboraí' },
      { title: 'Lei Seca - Fukamati / Light', description: 'Fukamati / Light, 2 Sentidos', latitude: -22.8598, longitude: -43.7918, cityName: 'Itaguaí' },
      { title: 'Lei Seca - Descida Gasômetro / IML', description: 'Descida Gasometro / IML, Centro', latitude: -22.8964, longitude: -43.2151, cityName: 'Rio de Janeiro' },
    ];

    const created: string[] = [];
    for (const ev of events) {
      const ref = await db.collection('events').add({
        category: 'policeblitz',
        title: ev.title,
        description: ev.description,
        latitude: ev.latitude,
        longitude: ev.longitude,
        createdAt: Timestamp.fromMillis(now),
        expiresAt: Timestamp.fromMillis(expiresAt),
        confirmations: 0,
        denials: 0,
        voters: [],
        userId: 'admin',
        stateUF: ev.cityName === 'Rio de Janeiro' || ev.cityName === 'Itaboraí' || ev.cityName === 'Itaguaí' ? 'RJ' : 'RJ',
        cityName: ev.cityName,
        countryCode: 'BR',
        speedLimit: null,
      });
      created.push(ref.id);
    }

    res.json({ ok: true, created });
  }
);
