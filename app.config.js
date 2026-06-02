/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Alertoo',
  slug: 'road-events',
  version: '1.0.1',
  scheme: 'alertoo',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FF5722',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.alertoo.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Usamos sua localização para mostrar alertas e eventos próximos a você.',
    },
  },
  android: {
    package: 'com.alertoo.app',
    versionCode: 2,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FF5722',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
    ],
    config: {
      googleMaps: {
        // Chave lida da variável de ambiente (EAS Secret ou .env local)
        apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
      },
    },
  },
  plugins: [
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: 'ca-app-pub-4349309505537394~6456788249',
        iosAppId: 'ca-app-pub-4349309505537394~6456788249',
        userTrackingUsageDescription: 'Este identificador é usado para entregar anúncios personalizados.',
        skAdNetworkItems: [],
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Usamos sua localização para mostrar alertas e eventos próximos a você.',
      },
    ],
    'react-native-edge-to-edge',
    'expo-web-browser',
    '@react-native-google-signin/google-signin',
    [
      '@stripe/stripe-react-native',
      {
        merchantIdentifier: 'merchant.com.alertoo.app',
        enableGooglePay: false,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#FF5722',
        sounds: [],
      },
    ],
  ],
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      projectId: '4e50f222-420e-465f-9624-3634d83ae645',
    },
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
    stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  },
  owner: 'adrianosethi1',
};
