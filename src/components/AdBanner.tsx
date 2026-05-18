import React from 'react';
import { View, StyleSheet } from 'react-native';

// ─── AdBanner DESABILITADO TEMPORARIAMENTE ─────────────────────────────────────
//
//  Por que: react-native-google-mobile-ads@16.3.3 tem incompatibilidade com
//  New Architecture (Bridgeless) do RN — o módulo Kotlin não estende a spec
//  gerada pelo codegen, então TurboModuleRegistry.getEnforcing falha no boot.
//
//  Para reativar quando uma versão compatível for lançada (v17+):
//    1. Atualizar: npm i react-native-google-mobile-ads@latest
//    2. Rebuild Android: rm -rf android/app/build && ./gradlew assembleDebug
//    3. Reverter este arquivo para a versão com import BannerAd
//
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  size?: any;
  style?: object;
}

export function AdBanner({ style }: Props) {
  // Placeholder invisível — mantém a API mas não renderiza nada
  return <View style={[styles.hidden, style]} />;
}

// Re-exporta os tipos como any pra não quebrar quem importa BannerAdSize
export const BannerAdSize = {
  BANNER: 'BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
  FULL_BANNER: 'FULL_BANNER',
  LEADERBOARD: 'LEADERBOARD',
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
} as const;

const styles = StyleSheet.create({
  hidden: { height: 0, overflow: 'hidden' },
});
