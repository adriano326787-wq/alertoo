/**
 * Google Routes API (v2) — navegação completa turn-by-turn.
 *
 * Endpoint:  https://routes.googleapis.com/directions/v2:computeRoutes
 * Docs:      https://developers.google.com/maps/documentation/routes/compute_route_directions
 */

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface RouteStep {
  instruction: string;        // ex "Vire à direita na Rua Augusta"
  maneuver: string;           // ex "TURN_RIGHT", "STRAIGHT", "MERGE"
  distanceMeters: number;
  durationSeconds: number;
  startLocation: Coords;
  endLocation: Coords;
  polyline: Coords[];
}

export interface RouteResult {
  polyline: Coords[];         // rota geral completa
  distanceMeters: number;     // distância total
  durationSeconds: number;    // duração estimada (com tráfego)
  steps: RouteStep[];         // turn-by-turn
}

export interface ComputeRouteOptions {
  origin: Coords;
  destination: Coords;
  travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TWO_WHEELER' | 'TRANSIT';
  routingPreference?: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL' | 'TRAFFIC_UNAWARE';
  languageCode?: string;
}

const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// ─── Polyline decoder (algoritmo do Google) ──────────────────────────────────
export function decodePolyline(encoded: string): Coords[] {
  if (!encoded) return [];
  const coords: Coords[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}

// ─── Haversine: distância entre 2 coords (metros) ────────────────────────────
export function haversineMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ─── Distância mínima de um ponto à polyline da rota (metros) ────────────────
export function distanceToPolyline(point: Coords, line: Coords[]): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return haversineMeters(point, line[0]);

  let min = Infinity;
  for (let i = 1; i < line.length; i++) {
    const d = pointToSegmentMeters(point, line[i - 1], line[i]);
    if (d < min) min = d;
  }
  return min;
}

// Distância de ponto a segmento (aprox plana, suficiente para distâncias curtas)
function pointToSegmentMeters(p: Coords, a: Coords, b: Coords): number {
  const ax = a.longitude;
  const ay = a.latitude;
  const bx = b.longitude;
  const by = b.latitude;
  const px = p.longitude;
  const py = p.latitude;

  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return haversineMeters(p, a);

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const proj: Coords = { latitude: ay + t * dy, longitude: ax + t * dx };
  return haversineMeters(p, proj);
}

// ─── Bearing (rumo) entre 2 coords em graus 0-360 ────────────────────────────
export function bearingDegrees(from: Coords, to: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ─── Calcula rota completa com steps turn-by-turn ────────────────────────────
export async function computeRoute(
  apiKey: string,
  opts: ComputeRouteOptions
): Promise<RouteResult> {
  if (!apiKey) throw new Error('Google API key não configurada');

  const body = {
    origin:      { location: { latLng: { latitude: opts.origin.latitude, longitude: opts.origin.longitude } } },
    destination: { location: { latLng: { latitude: opts.destination.latitude, longitude: opts.destination.longitude } } },
    travelMode: opts.travelMode ?? 'DRIVE',
    routingPreference: opts.routingPreference ?? 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    languageCode: opts.languageCode ?? 'pt-BR',
    units: 'METRIC',
    polylineQuality: 'HIGH_QUALITY',
    polylineEncoding: 'ENCODED_POLYLINE',
  };

  // Field mask define o que vem na resposta — pedimos rota geral + steps
  const fieldMask = [
    'routes.duration',
    'routes.distanceMeters',
    'routes.polyline.encodedPolyline',
    'routes.legs.steps.navigationInstruction',
    'routes.legs.steps.distanceMeters',
    'routes.legs.steps.staticDuration',
    'routes.legs.steps.polyline.encodedPolyline',
    'routes.legs.steps.startLocation',
    'routes.legs.steps.endLocation',
  ].join(',');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Routes API ${res.status}: ${text.slice(0, 200) || res.statusText}`);
  }

  const data: any = await res.json();
  const route = data?.routes?.[0];
  if (!route) throw new Error('Rota não encontrada');

  const polyline = decodePolyline(route.polyline?.encodedPolyline ?? '');
  const distanceMeters: number = route.distanceMeters ?? 0;
  const durationSeconds = parseInt(String(route.duration ?? '0s').replace(/s$/, ''), 10) || 0;

  // Steps: percorrer todas as legs e flatten
  const steps: RouteStep[] = [];
  const legs = route.legs ?? [];
  for (const leg of legs) {
    const legSteps = leg.steps ?? [];
    for (const s of legSteps) {
      steps.push({
        instruction: s.navigationInstruction?.instructions ?? '',
        maneuver:    s.navigationInstruction?.maneuver ?? 'STRAIGHT',
        distanceMeters: s.distanceMeters ?? 0,
        durationSeconds: parseInt(String(s.staticDuration ?? '0s').replace(/s$/, ''), 10) || 0,
        startLocation: locFromLatLng(s.startLocation),
        endLocation:   locFromLatLng(s.endLocation),
        polyline:      decodePolyline(s.polyline?.encodedPolyline ?? ''),
      });
    }
  }

  return { polyline, distanceMeters, durationSeconds, steps };
}

function locFromLatLng(loc: any): Coords {
  return {
    latitude:  loc?.latLng?.latitude ?? 0,
    longitude: loc?.latLng?.longitude ?? 0,
  };
}

// ─── Helper: ícone do emoji por tipo de manobra ──────────────────────────────
export function maneuverIcon(maneuver: string): string {
  const m = (maneuver ?? '').toUpperCase();
  if (m.includes('UTURN'))                return '↩️';
  if (m.includes('TURN_SLIGHT_LEFT'))     return '↖️';
  if (m.includes('TURN_SLIGHT_RIGHT'))    return '↗️';
  if (m.includes('TURN_SHARP_LEFT'))      return '⬅️';
  if (m.includes('TURN_SHARP_RIGHT'))     return '➡️';
  if (m.includes('TURN_LEFT'))            return '⬅️';
  if (m.includes('TURN_RIGHT'))           return '➡️';
  if (m.includes('FORK_LEFT'))            return '↖️';
  if (m.includes('FORK_RIGHT'))           return '↗️';
  if (m.includes('MERGE'))                return '🔀';
  if (m.includes('RAMP_LEFT'))            return '↖️';
  if (m.includes('RAMP_RIGHT'))           return '↗️';
  if (m.includes('ROUNDABOUT'))           return '🔄';
  if (m.includes('DEPART'))               return '🚗';
  if (m.includes('DESTINATION'))          return '🏁';
  return '⬆️'; // STRAIGHT / default
}

// ─── Helper: detecta o step atual baseado na posição do usuário ──────────────
// Retorna o índice do step mais próximo cuja distância para o endLocation
// está acima de um threshold (= ainda não chegou ao fim do step).
export function currentStepIndex(userPos: Coords, steps: RouteStep[]): number {
  if (steps.length === 0) return -1;
  // Encontra o step cujo polyline está mais próximo do usuário
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < steps.length; i++) {
    const d = distanceToPolyline(userPos, steps[i].polyline);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  // Se já passou perto demais do endLocation, avança pro próximo
  const cur = steps[bestIdx];
  if (cur && haversineMeters(userPos, cur.endLocation) < 20 && bestIdx + 1 < steps.length) {
    return bestIdx + 1;
  }
  return bestIdx;
}
