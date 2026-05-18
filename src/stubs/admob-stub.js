/**
 * admob-stub.js — react-native-google-mobile-ads removido (incompatível com New Architecture)
 * Stub vazio para evitar crash de TurboModuleRegistry.getEnforcing
 */
module.exports = {
  BannerAd: () => null,
  BannerAdSize: {
    BANNER: 'BANNER',
    LARGE_BANNER: 'LARGE_BANNER',
    MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
    FULL_BANNER: 'FULL_BANNER',
    LEADERBOARD: 'LEADERBOARD',
    ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
  },
  InterstitialAd: { createForAdRequest: () => ({}) },
  RewardedAd: { createForAdRequest: () => ({}) },
  TestIds: {},
  AdEventType: {},
  RewardedAdEventType: {},
};
