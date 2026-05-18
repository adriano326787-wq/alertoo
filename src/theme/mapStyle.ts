/**
 * Map styles — JSON arrays para Google Maps SDK (PROVIDER_GOOGLE).
 *
 * Aplica via: <MapView customMapStyle={mapStyleLight} />
 *
 * Estilo:
 *   - Reduz "noise" visual (esconde POIs, business labels secundários)
 *   - Aumenta contraste das ruas
 *   - Cores neutras pra destacar os pins do app
 *   - Suporte dark mode
 */

/* ─── LIGHT — clean, neutro, pouca cor ─────────────────────────────────────── */
export const mapStyleLight = [
  // Esconde POIs (lojas, restaurantes do Google) pra não competir com nossos pins
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // Base — cinza muito claro
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#eef3f0' }] },

  // Água — azul calmo
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe2f3' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5a8aa8' }] },

  // Estradas — alto contraste
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#fed7aa' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#fb923c' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },

  // Labels de rua
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },

  // Administrative (cidades, estados)
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
];

/* ─── DARK — modo noturno premium ──────────────────────────────────────────── */
export const mapStyleDark = [
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }, { weight: 2 }] },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a3a2a' }, { visibility: 'on' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#1a2532' }] },

  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1a2a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a6a8a' }] },

  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#7c3f0f' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#ea580c' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#475569' }] },

  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }, { weight: 3 }] },

  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#e2e8f0' }] },
];
