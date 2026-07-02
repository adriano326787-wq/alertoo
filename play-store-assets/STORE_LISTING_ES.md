# Alertoo — Contenido en español para Google Play Console

Traducción de `STORE_LISTING.md` para o Google Play Console permitir
múltiplos idiomas na ficha da loja. Use o idioma **"Español (Latinoamérica)"**
(es-419) — cobre Argentina, Chile, Colombia, Perú, Uruguay e demais países
hispanohablantes da América Latina com um único texto.

Cole os blocos abaixo nos mesmos campos do Play Console, na versão em
espanhol da ficha (Play Console permite ter uma versão por idioma).

---

## 1. App details

**App name** (máx 30 caracteres)
```
Alertoo
```

**Short description** (máx 80 caracteres)
```
Alertas de tránsito en tiempo real y descubre eventos cerca de ti.
```
> 68 caracteres

---

## 2. Full description (máx 4000 caracteres)

```
Alertoo es la app de avisos colaborativos de tránsito y descubrimiento de
eventos cerca de ti. Mira en tiempo real dónde hay controles policiales,
accidentes, inundaciones, obras — y qué está pasando de bueno en tu ciudad hoy.

🗺️ MAPA EN TIEMPO REAL
• Mira controles de alcoholemia, accidentes, inundaciones y obras cerca de ti.
• Pines de colores por categoría — entiende todo en 1 segundo.
• Bares, restaurantes, shows y festivales también aparecen en el mapa.

🚦 REPORTA EN 1 TOQUE
• Reporta un control o un accidente en segundos, sin registro complicado.
• Tu ubicación se usa solo con la app abierta — nunca en segundo plano.
• Ayuda a otros conductores y gana puntos en el ranking semanal.

🎉 EVENTOS CERCA DE TI
• Descubre bares, shows, festivales y fiestas en tu zona.
• Filtra por categoría, distancia u horario.
• Guarda tus favoritos y recibe recordatorios.

✅ UNA COMUNIDAD QUE FUNCIONA
• Confirma o niega alertas — los eventos con muchas negaciones desaparecen del mapa.
• Comenta, dale like y comparte.
• Sistema de reputación premia a quien más ayuda (Principiante → Vigía → Leyenda).

🥇 PROMOCIONA TU EVENTO O NEGOCIO
• Paquetes Bronce, Plata y Oro desde US$ 0,99.
• Aparece destacado con foto, animación y etiqueta de color.
• Promociona bares, restaurantes, eventos privados y más.
• Gana créditos gratis viendo anuncios.

🧭 RUTA DIRECTA EN EL GPS
• Toca cualquier evento y ábrelo directo en Google Maps o Waze.
• Conoce la hora, la distancia y qué esperar antes de salir de casa.

🔒 TU PRIVACIDAD PRIMERO
• Tu ubicación nunca se recopila en segundo plano.
• No vendemos datos — ni tenemos cómo.
• Cumple con GDPR (Europa) y normativas locales de protección de datos.
• Política de privacidad transparente: https://lei-seca---eventos.web.app/privacidade

💬 IDIOMAS
Español, portugués, inglés, francés — elige en la app.

📱 100% GRATIS
Alertoo es gratuito. Las promociones pagas sirven para dar visibilidad a tu
negocio o evento — el uso normal de la app, creación de alertas, comentarios
y mapa son totalmente gratis.

🌎 EXPANDIÉNDONOS POR LATINOAMÉRICA
Alertoo nació en Brasil y ahora también funciona en Argentina, Chile,
Colombia, Perú y Uruguay. ¡Empieza a usarlo y sé el primero en tu región!

—

¿Sugerencias? ¿Encontraste un error? Escríbenos:
adrianosethi@hotmail.com

Política de privacidad:
https://lei-seca---eventos.web.app/privacidade
```

---

## 3. Release notes (máx 500 caracteres) — es-419

```
🎉 ¡Alertoo ya está disponible en tu país!

• Mapa colaborativo de controles, accidentes, inundaciones y obras
• Descubre bares, shows y festivales cerca de ti
• Sistema de reputación y ranking semanal
• Promoción paga para negocios y eventos (Bronce, Plata, Oro)
• Disponible en español, portugués, inglés y francés
• Tu privacidad primero — la ubicación nunca se recopila en segundo plano
```

---

## 4. Notas específicas da expansão internacional

- **Moeda de cobrança:** usuários fora do Brasil pagam em **USD via Stripe**
  (cartão internacional) — Mercado Pago e Pix continuam exclusivos do Brasil.
  Ver `functions/src/utils/currency.ts`.
- **Categoria/tags:** mantém "Maps & Navigation", sem necessidade de campo
  separado por país — o Google Play já geo-distribui o app pelo campo
  "Países" (seção 11 do `STORE_LISTING.md` original).
- **Content rating / target audience:** mesmas respostas do documento
  original — não há diferença de conteúdo por país.
- **Ainda falta (fora do escopo deste documento):** screenshots com UI em
  espanhol (hoje só existem em português) — recomendável antes do
  lançamento oficial nesses países, mas não bloqueia a submissão da ficha.
