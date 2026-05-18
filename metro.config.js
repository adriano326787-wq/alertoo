// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ─── Fix: posthog-react-native@dist/surveys está vazio (bug do pacote) ────────
// O Metro não consegue resolver o módulo e lança erro 500 no bundle.
// Remapeamos para um stub vazio até o posthog corrigir.
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // ─── Fix: posthog-react-native surveys stub ────────────────────────────────
  if (moduleName === './surveys' &&
      context.originModulePath &&
      context.originModulePath.includes('posthog-react-native')) {
    return {
      filePath: require('path').join(__dirname, 'src/stubs/posthog-surveys-stub.js'),
      type: 'sourceFile',
    };
  }

  // ─── Fix: react-native-google-mobile-ads removido (incompatível New Arch) ──
  // Qualquer import de 'react-native-google-mobile-ads' vai para o stub.
  if (moduleName === 'react-native-google-mobile-ads' ||
      moduleName.startsWith('react-native-google-mobile-ads/')) {
    return {
      filePath: require('path').join(__dirname, 'src/stubs/admob-stub.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
