/**
 * adsService.ts — Configuração central do AdMob
 *
 * ─── COMO USAR ────────────────────────────────────────────────────────────────
 *
 * 1. Instalar SDK (quando react-native-google-mobile-ads@17+ for lançado):
 *      npm install react-native-google-mobile-ads@latest
 *      npx expo run:android  (rebuild necessário)
 *
 * 2. Substituir os IDs de teste pelos IDs reais do painel AdMob:
 *      https://apps.admob.com → Apps → Unidades de anúncio
 *
 * 3. Adicionar o App ID no AndroidManifest.xml (android/app/src/main/):
 *      <meta-data
 *        android:name="com.google.android.gms.ads.APPLICATION_ID"
 *        android:value="SEU_APP_ID_AQUI"/>
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Resolução do SDK (real ou stub) ─────────────────────────────────────────

let AdSDK: any;
try {
  // Quando o SDK real estiver instalado, usa ele automaticamente
  AdSDK = require('react-native-google-mobile-ads');
} catch {
  // Fallback para o stub enquanto o SDK não está disponível
  AdSDK = require('../stubs/admob-stub');
}

export const { MobileAds, TestIds, AdEventType, RewardedAdEventType } = AdSDK;
export const { InterstitialAd, RewardedAd, BannerAd, BannerAdSize } = AdSDK;

// ─── App ID ───────────────────────────────────────────────────────────────────
// ⚠️  TROQUE PELO APP ID REAL DO SEU PAINEL ADMOB ANTES DE PUBLICAR

export const ADMOB_APP_ID_ANDROID =
  'ca-app-pub-4349309505537394~6456788249'; // PRODUÇÃO

// ─── Ad Unit IDs ──────────────────────────────────────────────────────────────
// Em builds de desenvolvimento (__DEV__) usa os IDs de TESTE do Google para
// garantir que os anúncios carreguem independente do status de aprovação no AdMob.
// Em builds de produção usa os IDs reais do painel AdMob.

const PROD_UNITS = {
  BANNER_ROAD_LIST:          'ca-app-pub-4349309505537394/5595132714',
  BANNER_ENTERTAINMENT_LIST: 'ca-app-pub-4349309505537394/2312812496',
  INTERSTITIAL_AFTER_EVENT:  'ca-app-pub-4349309505537394/3528863269',
  REWARDED_EARN_CREDIT:      'ca-app-pub-4349309505537394/2293323127',
} as const;

const TEST_UNITS = {
  BANNER_ROAD_LIST:          'ca-app-pub-3940256099942544/6300978111',
  BANNER_ENTERTAINMENT_LIST: 'ca-app-pub-3940256099942544/6300978111', // mesmo ID de teste (ok para dev)
  INTERSTITIAL_AFTER_EVENT:  'ca-app-pub-3940256099942544/1033173712',
  REWARDED_EARN_CREDIT:      'ca-app-pub-3940256099942544/5224354917',
} as const;

export const AD_UNITS = __DEV__ ? TEST_UNITS : PROD_UNITS;

// ─── Inicialização ────────────────────────────────────────────────────────────

let _initialized = false;
// Promise compartilhada — garante que loadAd() aguarde a inicialização
let _initPromise: Promise<void> | null = null;

export async function initializeAds(): Promise<void> {
  if (_initialized) return;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      await MobileAds.initialize();
      _initialized = true;
    } catch {
      // SDK não disponível ainda — continua sem ads
    }
  })();
  return _initPromise;
}

/** Retorna true se o SDK já foi inicializado */
export function isAdsInitialized(): boolean {
  return _initialized;
}

// ─── Controle de frequência ───────────────────────────────────────────────────

const COOLDOWN_KEYS = {
  interstitial: '@admob_interstitial_last',
  rewarded:     '@admob_rewarded_last',
} as const;

// Cooldown mínimo entre interstitials: 10 minutos
const INTERSTITIAL_COOLDOWN_MS = 10 * 60 * 1000;
// Cooldown mínimo entre rewarded ads: 60 minutos
const REWARDED_COOLDOWN_MS = 60 * 60 * 1000;

export async function canShowInterstitial(): Promise<boolean> {
  try {
    const last = await AsyncStorage.getItem(COOLDOWN_KEYS.interstitial);
    if (!last) return true;
    return Date.now() - Number(last) > INTERSTITIAL_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export async function markInterstitialShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(COOLDOWN_KEYS.interstitial, String(Date.now()));
  } catch {}
}

export async function canShowRewarded(): Promise<boolean> {
  try {
    const last = await AsyncStorage.getItem(COOLDOWN_KEYS.rewarded);
    if (!last) return true;
    return Date.now() - Number(last) > REWARDED_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export async function markRewardedShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(COOLDOWN_KEYS.rewarded, String(Date.now()));
  } catch {}
}
