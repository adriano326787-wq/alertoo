/**
 * admob-stub.js — stub completo compatível com a API do react-native-google-mobile-ads
 *
 * Usado enquanto o SDK real não está instalado (incompatibilidade New Architecture v16).
 * Quando instalar react-native-google-mobile-ads@17+, remover este arquivo e o alias
 * no metro.config.js / babel.config.js.
 *
 * API coberta:
 *   - BannerAd (componente React)
 *   - InterstitialAd.createForAdRequest() → ad object com addAdEventListener / load / show
 *   - RewardedAd.createForAdRequest()    → idem
 *   - TestIds, AdEventType, RewardedAdEventType
 */

const React = require('react');
const { View } = require('react-native');

// ─── Tipos de evento ─────────────────────────────────────────────────────────

const AdEventType = {
  LOADED:  'loaded',
  ERROR:   'error',
  OPENED:  'opened',
  CLOSED:  'closed',
  CLICKED: 'clicked',
};

const RewardedAdEventType = {
  LOADED:  'loaded',
  ERROR:   'error',
  EARNED_REWARD: 'earned_reward',
  CLOSED: 'closed',
};

// ─── IDs de teste Google ──────────────────────────────────────────────────────

const TestIds = {
  BANNER:        'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL:  'ca-app-pub-3940256099942544/1033173712',
  REWARDED:      'ca-app-pub-3940256099942544/5224354917',
  REWARDED_INTERSTITIAL: 'ca-app-pub-3940256099942544/5354046379',
  NATIVE:        'ca-app-pub-3940256099942544/2247696110',
};

// ─── Fábrica de ad object (stub) ──────────────────────────────────────────────

function createStubAd() {
  const listeners = {};
  return {
    addAdEventListener(type, cb) {
      listeners[type] = cb;
      // Retorna unsubscribe
      return () => { delete listeners[type]; };
    },
    load() {
      // Simula carregamento bem-sucedido após 300ms
      setTimeout(() => {
        if (listeners[AdEventType.LOADED]) listeners[AdEventType.LOADED]();
      }, 300);
    },
    show() {
      // Simula exibição + fechamento imediato (stub não exibe nada)
      setTimeout(() => {
        if (listeners[AdEventType.OPENED])  listeners[AdEventType.OPENED]();
        if (listeners[AdEventType.CLOSED])  listeners[AdEventType.CLOSED]();
        // Para rewarded: simula recompensa
        if (listeners[RewardedAdEventType.EARNED_REWARD]) {
          listeners[RewardedAdEventType.EARNED_REWARD]({ type: 'credits', amount: 1 });
        }
        if (listeners[RewardedAdEventType.CLOSED]) listeners[RewardedAdEventType.CLOSED]();
      }, 200);
    },
    get loaded() { return true; },
  };
}

// ─── Banner ───────────────────────────────────────────────────────────────────

const BannerAdSize = {
  BANNER:                   'BANNER',
  LARGE_BANNER:             'LARGE_BANNER',
  MEDIUM_RECTANGLE:         'MEDIUM_RECTANGLE',
  FULL_BANNER:              'FULL_BANNER',
  LEADERBOARD:              'LEADERBOARD',
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
  INLINE_ADAPTIVE_BANNER:   'INLINE_ADAPTIVE_BANNER',
};

// BannerAd como componente React (retorna View invisível no stub)
function BannerAd({ style }) {
  return React.createElement(View, { style: [{ height: 0, overflow: 'hidden' }, style] });
}

// ─── Fábricas de ad ───────────────────────────────────────────────────────────

const InterstitialAd = {
  createForAdRequest(_unitId, _options) {
    return createStubAd();
  },
};

const RewardedAd = {
  createForAdRequest(_unitId, _options) {
    return createStubAd();
  },
};

// ─── MaxAds (inicialização) ───────────────────────────────────────────────────

const MobileAds = {
  initialize() {
    return Promise.resolve([]);
  },
  setRequestConfiguration() {
    return Promise.resolve();
  },
};

// ─── Consentimento (UMP) — stub no-op ────────────────────────────────────────

const AdsConsent = {
  requestInfoUpdate() { return Promise.resolve({}); },
  loadAndShowConsentFormIfRequired() { return Promise.resolve({}); },
  showPrivacyOptionsForm() { return Promise.resolve(); },
  getPrivacyOptionsRequirementStatus() { return Promise.resolve('NOT_REQUIRED'); },
};

const MaxAdContentRating = { G: 'G', PG: 'PG', T: 'T', MA: 'MA' };

module.exports = {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  TestIds,
  AdEventType,
  RewardedAdEventType,
  MobileAds,
  AdsConsent,
  MaxAdContentRating,
  default: MobileAds,
};
