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

  // react-native-google-mobile-ads v16.3.3 instalado e compatível com New Architecture.
  // O redirect para o stub foi removido — o SDK real é usado agora.

  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
