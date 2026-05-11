/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Alertoo',
  slug: 'road-events',
  version: '1.0.0',
  scheme: 'alertoo',
  orientation: 'portrait',
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
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FF5722',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
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
        androidAppId: process.env.ADMOB_APP_ID_ANDROID ?? 'ca-app-pub-4349309505537394~6456788249',
        iosAppId:     process.env.ADMOB_APP_ID_IOS     ?? 'ca-app-pub-3940256099942544~1458002511',
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
  },
  owner: 'adrianosethi1',
};
