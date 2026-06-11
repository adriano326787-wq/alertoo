/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Alertoo',
  slug: 'road-events',
  version: '1.1.11',
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
    // GoogleService-Info.plist — gerado pelo Firebase Console (iOS app).
    // Em EAS Build, definir o secret GOOGLE_SERVICE_INFO_PLIST (base64) e rodar
    // node scripts/create-google-service-info.js antes do build.
    googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? '',
    },
    infoPlist: {
      // Localização
      NSLocationWhenInUseUsageDescription:
        'Usamos sua localização para mostrar alertas e eventos próximos a você.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Usamos sua localização para avisar sobre trânsito, lentidão e radares mesmo com o app em segundo plano enquanto você dirige.',
      NSLocationAlwaysUsageDescription:
        'Usamos sua localização para avisar sobre trânsito, lentidão e radares mesmo com o app em segundo plano enquanto você dirige.',
      // Câmera e galeria (expo-image-picker)
      NSCameraUsageDescription:
        'Usamos a câmera para adicionar fotos aos seus eventos e ao seu perfil.',
      NSPhotoLibraryUsageDescription:
        'Usamos a galeria para adicionar fotos aos seus eventos e ao seu perfil.',
      NSPhotoLibraryAddUsageDescription:
        'Precisamos de acesso para salvar imagens na sua galeria.',
      // Rastreamento publicitário (AdMob / ATT — iOS 14+)
      NSUserTrackingUsageDescription:
        'Este identificador é usado para entregar anúncios personalizados relevantes para você.',
      // Microfone (Stripe SDK pode requerer em alguns fluxos)
      NSMicrophoneUsageDescription:
        'Acesso ao microfone pode ser necessário em algumas funcionalidades.',
      // Declara que o app não usa criptografia não-isenta (obrigatório para App Store/TestFlight)
      ITSAppUsesNonExemptEncryption: false,
      // URL Scheme para Google Sign-In (REVERSED_CLIENT_ID do GoogleService-Info.plist)
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            'com.googleusercontent.apps.657066902706-scqovndbjocqnjfsd0c9a012or7gd2dk',
          ],
        },
      ],
    },
  },
  android: {
    package: 'com.alertoo.app',
    versionCode: 32,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FF5722',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
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
        locationAlwaysAndWhenInUsePermission:
          'Usamos sua localização para avisar sobre trânsito, lentidão e radares mesmo com o app em segundo plano enquanto você dirige.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    'react-native-edge-to-edge',
    'expo-web-browser',
    [
      '@react-native-google-signin/google-signin',
      {
        // iOS — CLIENT_ID do GoogleService-Info.plist
        iosUrlScheme: 'com.googleusercontent.apps.657066902706-scqovndbjocqnjfsd0c9a012or7gd2dk',
      },
    ],
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
