import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

const app = initializeApp({
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db   = getFirestore(app);

const { user } = await signInWithEmailAndPassword(auth, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
const ADMIN_UID = user.uid;
console.log('Auth OK —', ADMIN_UID);

// ---------------------------------------------------------------------------
// 5 maiores cidades por estado [nome, UF, lat, lon]
// ---------------------------------------------------------------------------
const CITIES = [
  // AC
  ['Rio Branco','AC',-9.9754,-67.8249],['Cruzeiro do Sul','AC',-7.6306,-72.6724],
  ['Sena Madureira','AC',-9.0654,-68.6590],['Tarauacá','AC',-8.1600,-70.7658],['Feijó','AC',-8.1742,-70.3542],
  // AL
  ['Maceió','AL',-9.6658,-35.7350],['Arapiraca','AL',-9.7525,-36.6614],
  ['Rio Largo','AL',-9.4778,-35.8528],['Palmeira dos Índios','AL',-9.4078,-36.6278],['União dos Palmares','AL',-9.1619,-36.0319],
  // AM
  ['Manaus','AM',-3.1019,-60.0250],['Parintins','AM',-2.6269,-56.7358],
  ['Itacoatiara','AM',-3.1431,-58.4442],['Manacapuru','AM',-3.2994,-60.6211],['Coari','AM',-4.0853,-63.1406],
  // AP
  ['Macapá','AP',0.0349,-51.0694],['Santana','AP',-0.0589,-51.1817],
  ['Laranjal do Jari','AP',-0.7956,-52.4614],['Oiapoque','AP',3.8400,-51.8350],['Porto Grande','AP',0.7133,-51.4083],
  // BA
  ['Salvador','BA',-12.9711,-38.5108],['Feira de Santana','BA',-12.2664,-38.9663],
  ['Vitória da Conquista','BA',-14.8619,-40.8444],['Camaçari','BA',-12.6994,-38.3244],['Juazeiro','BA',-9.4236,-40.5031],
  // CE
  ['Fortaleza','CE',-3.7172,-38.5433],['Caucaia','CE',-3.7311,-38.6528],
  ['Juazeiro do Norte','CE',-7.2136,-39.3156],['Maracanaú','CE',-3.8739,-38.6269],['Sobral','CE',-3.6883,-40.3494],
  // DF
  ['Brasília','DF',-15.7939,-47.8828],['Ceilândia','DF',-15.8189,-48.1086],
  ['Taguatinga','DF',-15.8306,-48.0553],['Samambaia','DF',-15.8761,-48.0761],['Planaltina','DF',-15.6189,-47.6522],
  // ES
  ['Vitória','ES',-20.3155,-40.3128],['Serra','ES',-20.1286,-40.3075],
  ['Vila Velha','ES',-20.3297,-40.2922],['Cariacica','ES',-20.2631,-40.4197],['Cachoeiro de Itapemirim','ES',-20.8489,-41.1131],
  // GO
  ['Goiânia','GO',-16.6869,-49.2648],['Aparecida de Goiânia','GO',-16.8236,-49.2436],
  ['Anápolis','GO',-16.3281,-48.9531],['Rio Verde','GO',-17.7983,-50.9261],['Luziânia','GO',-16.2525,-47.9500],
  // MA
  ['São Luís','MA',-2.5297,-44.3028],['Imperatriz','MA',-5.5256,-47.4822],
  ['São José de Ribamar','MA',-2.5603,-44.0567],['Timon','MA',-5.0942,-42.8350],['Caxias','MA',-4.8653,-43.3556],
  // MG
  ['Belo Horizonte','MG',-19.9245,-43.9352],['Uberlândia','MG',-18.9186,-48.2772],
  ['Contagem','MG',-19.9317,-44.0536],['Juiz de Fora','MG',-21.7642,-43.3503],['Betim','MG',-19.9681,-44.1986],
  // MS
  ['Campo Grande','MS',-20.4697,-54.6201],['Dourados','MS',-22.2233,-54.8058],
  ['Três Lagoas','MS',-20.7864,-51.7008],['Corumbá','MS',-19.0086,-57.6533],['Ponta Porã','MS',-22.5358,-55.7258],
  // MT
  ['Cuiabá','MT',-15.5989,-56.0975],['Várzea Grande','MT',-15.6461,-56.1322],
  ['Rondonópolis','MT',-16.4711,-54.6383],['Sinop','MT',-11.8647,-55.5064],['Tangará da Serra','MT',-14.6208,-57.5025],
  // PA
  ['Belém','PA',-1.4558,-48.4902],['Ananindeua','PA',-1.3653,-48.3722],
  ['Santarém','PA',-2.4426,-54.7083],['Marabá','PA',-5.3686,-49.1178],['Castanhal','PA',-1.2942,-47.9264],
  // PB
  ['João Pessoa','PB',-7.1195,-34.8450],['Campina Grande','PB',-7.2308,-35.8817],
  ['Santa Rita','PB',-7.1119,-34.9789],['Patos','PB',-7.0206,-37.2811],['Bayeux','PB',-7.1264,-34.9417],
  // PE
  ['Recife','PE',-8.0539,-34.8811],['Caruaru','PE',-8.2760,-35.9761],
  ['Olinda','PE',-8.0089,-34.8550],['Petrolina','PE',-9.3986,-40.5014],['Jaboatão dos Guararapes','PE',-8.1131,-35.0142],
  // PI
  ['Teresina','PI',-5.0919,-42.8036],['Parnaíba','PI',-2.9050,-41.7769],
  ['Picos','PI',-7.0775,-41.4675],['Piripiri','PI',-4.2706,-41.7778],['Floriano','PI',-6.7700,-43.0225],
  // PR
  ['Curitiba','PR',-25.4297,-49.2711],['Londrina','PR',-23.3045,-51.1696],
  ['Maringá','PR',-23.4253,-51.9386],['Ponta Grossa','PR',-25.0994,-50.1583],['Cascavel','PR',-24.9578,-53.4550],
  // RJ
  ['Rio de Janeiro','RJ',-22.9068,-43.1729],['São Gonçalo','RJ',-22.8269,-43.0539],
  ['Duque de Caxias','RJ',-22.7856,-43.3117],['Nova Iguaçu','RJ',-22.7594,-43.4511],['Niterói','RJ',-22.8839,-43.1036],
  // RN
  ['Natal','RN',-5.7945,-35.2110],['Mossoró','RN',-5.1878,-37.3443],
  ['Parnamirim','RN',-5.9147,-35.2642],['São Gonçalo do Amarante','RN',-5.7967,-35.3311],['Macaíba','RN',-5.8575,-35.3539],
  // RO
  ['Porto Velho','RO',-8.7619,-63.9039],['Ji-Paraná','RO',-10.8797,-61.9453],
  ['Ariquemes','RO',-9.9092,-63.0364],['Vilhena','RO',-12.7406,-60.1464],['Cacoal','RO',-11.4353,-61.4481],
  // RR
  ['Boa Vista','RR',2.8238,-60.6753],['Rorainópolis','RR',-0.9422,-60.4283],
  ['Caracaraí','RR',1.8228,-61.1331],['Alto Alegre','RR',2.9897,-61.0706],['Mucajaí','RR',2.4494,-60.9197],
  // RS
  ['Porto Alegre','RS',-30.0328,-51.2300],['Caxias do Sul','RS',-29.1678,-51.1794],
  ['Canoas','RS',-29.9175,-51.1839],['Pelotas','RS',-31.7719,-52.3425],['Santa Maria','RS',-29.6842,-53.8069],
  // SC
  ['Joinville','SC',-26.3044,-48.8456],['Florianópolis','SC',-27.5954,-48.5480],
  ['Blumenau','SC',-26.9194,-49.0661],['São José','SC',-27.5969,-48.6369],['Chapecó','SC',-27.1006,-52.6150],
  // SE
  ['Aracaju','SE',-10.9472,-37.0731],['Nossa Senhora do Socorro','SE',-10.8553,-37.1272],
  ['Lagarto','SE',-10.9144,-37.6553],['Itabaiana','SE',-10.6861,-37.4253],['São Cristóvão','SE',-11.0139,-37.2042],
  // SP
  ['São Paulo','SP',-23.5505,-46.6333],['Guarulhos','SP',-23.4628,-46.5328],
  ['Campinas','SP',-22.9056,-47.0608],['São Bernardo do Campo','SP',-23.6939,-46.5650],['Santo André','SP',-23.6639,-46.5383],
  // TO
  ['Palmas','TO',-10.2128,-48.3603],['Araguaína','TO',-7.1925,-48.2064],
  ['Gurupi','TO',-11.7319,-49.0678],['Porto Nacional','TO',-10.7061,-48.4169],['Paraíso do Tocantins','TO',-10.1744,-48.8839],
];

// ---------------------------------------------------------------------------
// 5 eventos por cidade — rotação de templates
// ---------------------------------------------------------------------------
const TEMPLATES = [
  {
    category: 'festival',
    titleFn: (city) => `Festival Gastronômico de ${city}`,
    descFn:  (city, uf) => `O maior festival de gastronomia do ${uf}! Chefs renomados, food trucks, cervejas artesanais e muito sabor em ${city}. Entrada gratuita, consumação mínima de R$ 30.`,
  },
  {
    category: 'show',
    titleFn: (city) => `Show ao Vivo — Palco ${city}`,
    descFn:  (city) => `Uma noite inesquecível com as melhores bandas locais de ${city}. Rock, MPB e pop reunidos em um único palco. Ingressos a partir de R$ 40.`,
  },
  {
    category: 'bar',
    titleFn: (city) => `Happy Hour do Mês — ${city}`,
    descFn:  (city) => `Toda semana o melhor happy hour de ${city}! Drinques especiais com 40% de desconto das 17h às 20h. Petiscos inclusos na promoção.`,
  },
  {
    category: 'cultural',
    titleFn: (city) => `Expo Arte ${city} 2026`,
    descFn:  (city, uf) => `Exposição de arte contemporânea com obras de artistas de todo o ${uf}. Visitação gratuita de terça a domingo, das 10h às 18h, no centro cultural de ${city}.`,
  },
  {
    category: 'sports',
    titleFn: (city) => `Torneio Esportivo de ${city}`,
    descFn:  (city) => `Campeonato amador de futebol, vôlei e corrida de rua em ${city}. Inscrições abertas para todas as idades. Premiação para os três primeiros colocados de cada categoria.`,
  },
];

// ---------------------------------------------------------------------------
// Gera os 675 docs
// ---------------------------------------------------------------------------
const now   = Date.now();
const col   = collection(db, 'entertainment_events');
let created = 0;

const BATCH_SIZE = 499;
let batch = writeBatch(db);
let batchCount = 0;

for (const [cityName, stateUF, lat, lon] of CITIES) {
  for (let t = 0; t < TEMPLATES.length; t++) {
    const tmpl = TEMPLATES[t];
    // Espalha datas de expiração entre 7 e 90 dias a partir de hoje
    const daysAhead = 7 + (t * 15) + Math.floor(Math.random() * 10);
    const expiresAt = Timestamp.fromMillis(now + daysAhead * 86400_000);
    const createdAt = Timestamp.fromMillis(now - Math.floor(Math.random() * 7 * 86400_000));

    batch.set(doc(col), {
      title:           tmpl.titleFn(cityName),
      description:     tmpl.descFn(cityName, stateUF),
      category:        tmpl.category,
      latitude:        lat + (Math.random() - 0.5) * 0.02,
      longitude:       lon + (Math.random() - 0.5) * 0.02,
      address:         `${cityName} — ${stateUF}`,
      cityName,
      stateUF,
      countryCode:     'BR',
      userId:          ADMIN_UID,
      createdAt,
      expiresAt,
      promotionTier:   null,
      promotionEndDate: null,
      isFeatured:      false,
      viewCount:       0,
      commentCount:    0,
      likes:           [],
      attendees:       [],
      isRecurring:     false,
      avgRating:       null,
      ratingCount:     0,
      photoUrl:        null,
      link:            null,
    });

    batchCount++;
    created++;

    if (batchCount === BATCH_SIZE) {
      await batch.commit();
      console.log(`Lote commitado — ${created} eventos criados`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }
}

if (batchCount > 0) {
  await batch.commit();
  console.log(`Lote final commitado — ${created} eventos criados`);
}

console.log(`\nConcluído: ${created} eventos de entretenimento criados.`);
process.exit(0);
