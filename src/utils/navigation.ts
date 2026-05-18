/**
 * Abre app de navegação GPS externo (Google Maps / Waze / Apple Maps)
 * com rota até as coordenadas do evento.
 *
 * Estratégia:
 *  1. Tenta Google Maps (mais universal — funciona em Android e iOS, fallback web)
 *  2. Fallback Waze se Google não disponível
 *  3. Último recurso: abre URL no navegador
 */

import { Linking, Alert, Platform } from 'react-native';

export interface NavigationTarget {
  latitude: number;
  longitude: number;
  label?: string;
}

/** Abre Google Maps com navegação iniciada até as coordenadas. */
export async function openGoogleMapsNavigation(target: NavigationTarget): Promise<boolean> {
  const { latitude, longitude, label } = target;

  // No Android, `google.navigation:` abre Google Maps direto em modo navegação
  // No iOS, usa `comgooglemaps://` (precisa do app instalado)
  const androidNavUrl = `google.navigation:q=${latitude},${longitude}&mode=d`;
  const iosNavUrl = `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;
  // URL web universal — abre Google Maps app se instalado, navegador caso contrário
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving${
    label ? `&destination_place_id=${encodeURIComponent(label)}` : ''
  }`;

  const candidates = Platform.OS === 'android'
    ? [androidNavUrl, webUrl]
    : [iosNavUrl, webUrl];

  for (const url of candidates) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // tenta próximo
    }
  }

  // Último recurso: tenta abrir o webUrl forçadamente
  try {
    await Linking.openURL(webUrl);
    return true;
  } catch {
    return false;
  }
}

/** Abre Waze com navegação iniciada até as coordenadas. */
export async function openWazeNavigation(target: NavigationTarget): Promise<boolean> {
  const { latitude, longitude } = target;
  const wazeUrl = `waze://?ll=${latitude},${longitude}&navigate=yes`;
  const wazeWebUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;

  for (const url of [wazeUrl, wazeWebUrl]) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // tenta próximo
    }
  }
  return false;
}

/**
 * Abre o melhor app de navegação disponível, com fallback automático.
 * Tenta Google Maps primeiro (universal), depois Waze, depois web.
 */
export async function openNavigation(target: NavigationTarget): Promise<void> {
  const opened = await openGoogleMapsNavigation(target);
  if (!opened) {
    const wazeOpened = await openWazeNavigation(target);
    if (!wazeOpened) {
      Alert.alert(
        'Navegação indisponível',
        'Não foi possível abrir um app de mapas. Instale o Google Maps ou Waze para usar essa funcionalidade.'
      );
    }
  }
}
