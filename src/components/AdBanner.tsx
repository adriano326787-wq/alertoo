/**
 * AdBanner — componente de banner AdMob.
 *
 * Usa o SDK real (react-native-google-mobile-ads) quando instalado,
 * ou o stub localizado em src/stubs/admob-stub.js como fallback.
 *
 * Para ativar o SDK real:
 *   1. npm install react-native-google-mobile-ads@17+
 *   2. npx expo run:android  (rebuild necessário)
 *   3. Adicionar App ID no AndroidManifest.xml (ver adsService.ts)
 *   4. Trocar AD_UNITS.BANNER_* pelos IDs reais no painel AdMob
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BannerAd as SDKBannerAd, BannerAdSize, AD_UNITS } from '../services/adsService';

export { BannerAdSize };

interface Props {
  /** Qual unidade de anúncio usar. Default: lista de eventos de trânsito */
  unitId?: string;
  size?: keyof typeof BannerAdSize | string;
  style?: object;
  /** Label exibido acima do banner */
  label?: string;
}

export function AdBanner({
  unitId = AD_UNITS.BANNER_ROAD_LIST,
  size = BannerAdSize?.ANCHORED_ADAPTIVE_BANNER ?? 'ANCHORED_ADAPTIVE_BANNER',
  style,
  label = 'Publicidade',
}: Props) {
  const [adFailed, setAdFailed] = useState(false);

  // No stub o BannerAd retorna View vazia (height:0) — não exibe nada visível
  // Quando o SDK real estiver instalado, exibe o banner real
  if (adFailed || Platform.OS === 'ios') {
    // iOS não configurado ainda — retorna nada
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <SDKBannerAd
        unitId={unitId}
        size={size}
        onAdFailedToLoad={() => setAdFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 9,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
