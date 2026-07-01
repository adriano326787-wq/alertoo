/**
 * adsService.ts — Configuração central do AdMob
 *
 * SDK real (react-native-google-mobile-ads@16.3.3) já está instalado e ativo no
 * Android — ver scripts/patch-admob.js para o workaround de New Architecture.
 * iOS permanece desligado em AdBanner.tsx até o app ser publicado na App Store
 * (precisa de um App ID e unidades de anúncio próprios, distintos do Android).
 *
 * Se o require() abaixo falhar (pacote não instalado/build sem o módulo nativo),
 * cai para o stub em src/stubs/admob-stub.js — mantém o app funcional sem ads.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Resolução do SDK (real ou stub) ─────────────────────────────────────────

let AdSDK: any;
try {
  AdSDK = require('react-native-google-mobile-ads');
} catch {
  AdSDK = require('../stubs/admob-stub');
}

export const { MobileAds, TestIds, AdEventType, RewardedAdEventType, AdsConsent } = AdSDK;
export const { InterstitialAd, RewardedAd, BannerAd, BannerAdSize } = AdSDK;
export const { MaxAdContentRating } = AdSDK;

// ─── App ID ───────────────────────────────────────────────────────────────────
// Já é o App ID real do painel AdMob (também replicado no AndroidManifest.xml
// e em app.config.js, plugin react-native-google-mobile-ads).

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
  // Reaproveita a mesma unidade do interstitial pós-evento — criar uma unidade
  // dedicada "App Open" no painel AdMob é opcional, só ajuda a separar relatórios.
  INTERSTITIAL_APP_OPEN:     'ca-app-pub-4349309505537394/3528863269',
  REWARDED_EARN_CREDIT:      'ca-app-pub-4349309505537394/2293323127',
} as const;

const TEST_UNITS = {
  BANNER_ROAD_LIST:          'ca-app-pub-3940256099942544/6300978111',
  BANNER_ENTERTAINMENT_LIST: 'ca-app-pub-3940256099942544/6300978111', // mesmo ID de teste (ok para dev)
  INTERSTITIAL_AFTER_EVENT:  'ca-app-pub-3940256099942544/1033173712',
  INTERSTITIAL_APP_OPEN:     'ca-app-pub-3940256099942544/1033173712',
  REWARDED_EARN_CREDIT:      'ca-app-pub-3940256099942544/5224354917',
} as const;

export const AD_UNITS = __DEV__ ? TEST_UNITS : PROD_UNITS;

// ─── Inicialização ────────────────────────────────────────────────────────────

let _initialized = false;
// Promise compartilhada — garante que loadAd() aguarde a inicialização
let _initPromise: Promise<void> | null = null;

/**
 * Fluxo de consentimento (Google UMP / GDPR).
 * Precisa rodar e concluir ANTES do primeiro request de anúncio — depois que o
 * usuário responde o formulário (ou não há obrigação legal de exibi-lo), o SDK
 * do Google já aplica a escolha automaticamente nos requests seguintes (não é
 * necessário repassar a escolha manualmente para cada hook/banner).
 */
async function requestConsent(): Promise<void> {
  try {
    if (!AdsConsent?.requestInfoUpdate) return; // stub não tem AdsConsent
    await AdsConsent.requestInfoUpdate();
    await AdsConsent.loadAndShowConsentFormIfRequired();
  } catch {
    // Sem conexão ou erro no formulário — segue sem bloquear o app
  }
}

export async function initializeAds(): Promise<void> {
  if (_initialized) return;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      await requestConsent();
      try {
        await MobileAds.setRequestConfiguration?.({
          maxAdContentRating: MaxAdContentRating?.PG ?? 'PG',
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });
      } catch {
        // setRequestConfiguration pode não existir no stub — ignora
      }
      await MobileAds.initialize();
      _initialized = true;
    } catch {
      // SDK não disponível ainda — continua sem ads
    }
  })();
  return _initPromise;
}

/**
 * Reabre o formulário de privacidade (botão "Opções de privacidade" exigido
 * pelo Google em telas de configurações/privacidade quando AdsConsent.getPrivacyOptionsRequirementStatus()
 * indica REQUIRED).
 */
export async function showPrivacyOptionsForm(): Promise<void> {
  try {
    await AdsConsent?.showPrivacyOptionsForm?.();
  } catch {
    // formulário indisponível — ignora
  }
}

/** Retorna true se o SDK já foi inicializado */
export function isAdsInitialized(): boolean {
  return _initialized;
}

// ─── Controle de frequência ───────────────────────────────────────────────────

const COOLDOWN_KEYS = {
  interstitial: '@admob_interstitial_last',
  rewarded:     '@admob_rewarded_last',
  appOpen:      '@admob_app_open_last',
} as const;

// Cooldown mínimo entre interstitials: 10 minutos
const INTERSTITIAL_COOLDOWN_MS = 10 * 60 * 1000;
// Cooldown mínimo entre rewarded ads: 60 minutos
const REWARDED_COOLDOWN_MS = 60 * 60 * 1000;
// Cooldown mínimo entre interstitials de abertura do app: 4 horas
const APP_OPEN_COOLDOWN_MS = 4 * 60 * 60 * 1000;

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

export async function canShowAppOpenInterstitial(): Promise<boolean> {
  try {
    const last = await AsyncStorage.getItem(COOLDOWN_KEYS.appOpen);
    if (!last) return true;
    return Date.now() - Number(last) > APP_OPEN_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export async function markAppOpenInterstitialShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(COOLDOWN_KEYS.appOpen, String(Date.now()));
  } catch {}
}
