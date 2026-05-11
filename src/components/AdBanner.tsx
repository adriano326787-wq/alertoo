import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// ─── IDs de anúncio ────────────────────────────────────────────────────────────
// Em produção: substitua pelos seus Ad Unit IDs reais do AdMob
// Em desenvolvimento: TestIds.BANNER garante anúncios de teste sem risco de ban

const BANNER_ID_ANDROID = __DEV__
  ? TestIds.BANNER
  : 'ca-app-pub-4349309505537394/5595132714';

const BANNER_ID_IOS = __DEV__
  ? TestIds.BANNER
  : (process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? TestIds.BANNER);

const UNIT_ID = Platform.OS === 'ios' ? BANNER_ID_IOS : BANNER_ID_ANDROID;

interface Props {
  size?: BannerAdSize;
  style?: object;
}

export function AdBanner({ size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER, style }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={[styles.container, !loaded && styles.hidden, style]}>
      <BannerAd
        unitId={UNIT_ID}
        size={size}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
  },
});
