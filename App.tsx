import { useEffect, useRef, useState } from 'react';
import { rf } from './src/utils/responsive';
import { View, ActivityIndicator, Text, StyleSheet, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SystemBars } from 'react-native-edge-to-edge';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/services/firebase';
import { requestNotificationPermission } from './src/services/notificationService';
import { setCurrentUser } from './src/services/authService';
import { useUserStore } from './src/store/userStore';
import { useEventsStore } from './src/store/eventsStore';
import { RoadEventsScreen } from './src/screens/RoadEventsScreen';
import { MapScreen } from './src/screens/MapScreen';
import { EntertainmentScreen } from './src/screens/EntertainmentScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { EmailVerificationScreen } from './src/screens/EmailVerificationScreen';
import { OnboardingScreen, shouldShowOnboarding } from './src/screens/OnboardingScreen';
import { RankBadge } from './src/components/RankBadge';
import { loadSavedLang } from './src/utils/i18n';
import { useT } from './src/hooks/useT';
import { parseEventDeepLink } from './src/utils/deepLinks';
import { useAppStore } from './src/store/appStore';
import { initSentry, setSentryUser } from './src/services/sentry';
import { initAnalytics, identify, resetAnalytics, track } from './src/services/analytics';
import { useFavoritesStore } from './src/store/favoritesStore';

// Inicializa Sentry o mais cedo possível (antes do componente)
initSentry();

const Tab = createBottomTabNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const { profile, loadProfile, subscribeToProfile, clearProfile } = useUserStore();
  const profileUnsubRef = useRef<(() => void) | null>(null);

  // Decide se mostra onboarding na primeira abertura
  useEffect(() => {
    shouldShowOnboarding()
      .then((show) => setShowOnboarding(show))
      .catch(() => setShowOnboarding(false));
  }, []);

  // Carrega filtro persistido, idioma salvo e permissão de notificação
  useEffect(() => {
    useEventsStore.getState().loadFilter();
    loadSavedLang().catch(() => {});
    requestNotificationPermission().catch(() => {});
    // Analytics — init + tracking de app_opened
    initAnalytics().then(() => {
      track('app_opened');
    }).catch(() => {});
  }, []);

  // ─── Deep links ─────────────────────────────────────────────────────────────
  // Captura links `alertoo://evento/{type}/{id}` (a) ao iniciar o app via link,
  // e (b) enquanto o app está em uso (foreground/background).
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      const parsed = parseEventDeepLink(url);
      if (parsed) {
        useAppStore.getState().setPendingDeepLink(parsed);
      }
    };

    // App aberto via deep link (cold start)
    Linking.getInitialURL().then(handleUrl).catch(() => {});

    // App já estava aberto, recebeu um novo link
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Ouve mudanças de autenticação em tempo real — resolve sair/entrar automaticamente
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);

      // Cancela assinatura anterior do perfil
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      if (u) {
        try {
          await loadProfile(u.uid, {
            displayName: u.displayName ?? (u.isAnonymous ? 'Visitante' : undefined),
            email: u.email ?? undefined,
            phone: u.phoneNumber ?? undefined,
            photoURL: u.photoURL ?? undefined,
          });
        } catch (_) {}

        // Sentry + Analytics: associa erros e eventos ao usuário
        setSentryUser({ id: u.uid, email: u.email ?? undefined });
        identify(u.uid, {
          email: u.email ?? undefined,
          isAnonymous: u.isAnonymous,
          displayName: u.displayName ?? undefined,
        });

        // Ponto 3 — assina perfil em tempo real (só para usuários com conta)
        if (!u.isAnonymous) {
          profileUnsubRef.current = subscribeToProfile(u.uid);
        }

        // Favoritos — assina lista do usuário (vazio pra anônimo)
        useFavoritesStore.getState().subscribe();
      } else {
        clearProfile();
        setSentryUser(null);
        resetAnalytics();
      }

      setUser(u);
      setReady(true);
    });

    return () => {
      unsubAuth();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  async function handleAuthenticated(u: User) {
    // onAuthStateChanged já cuida do restante
    setUser(u);
  }

  if (!ready || showOnboarding === null) {
    return (
      <View style={styles.splash}>
        <SystemBars style="light" />
        <Text style={styles.splashLogo}>🔔</Text>
        <Text style={styles.splashName}>Alertoo</Text>
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 32 }} />
      </View>
    );
  }

  // Onboarding antes de qualquer tela (mesmo antes do login)
  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <SystemBars style="light" />
        <StatusBar style="light" translucent />
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <SystemBars style="dark" />
        <StatusBar style="dark" translucent />
        <AuthScreen onAuthenticated={handleAuthenticated} />
      </SafeAreaProvider>
    );
  }

  // Usuário com e-mail cadastrado mas ainda não verificado
  const needsVerification = !user.isAnonymous && user.email && !user.emailVerified;
  if (needsVerification) {
    return (
      <SafeAreaProvider>
        <SystemBars style="dark" />
        <StatusBar style="dark" translucent />
        <EmailVerificationScreen
          user={user}
          onVerified={() => setUser({ ...user, emailVerified: true } as any)}
        />
      </SafeAreaProvider>
    );
  }

  // useSafeAreaInsets precisa estar dentro do SafeAreaProvider
  // por isso usamos um componente interno
  return (
    <SafeAreaProvider>
      <SystemBars style="dark" />
      <StatusBar style="dark" translucent />
      <NavigationContainer>
        <AppTabs profile={profile} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// Componente separado para acessar useSafeAreaInsets dentro do SafeAreaProvider
function AppTabs({ profile }: { profile: any }) {
  const t = useT(); // re-renderiza as abas quando o idioma muda
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF5722',
        tabBarInactiveTintColor: '#64748B',
        // Não definir height/paddingBottom/paddingTop — o React Navigation
        // + react-native-edge-to-edge gerenciam os insets automaticamente
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: '#1E293B',
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: rf(11), fontWeight: '700', letterSpacing: 0.3 },
      }}
    >
          <Tab.Screen
            name="Mapa"
            component={MapScreen}
            options={{
              tabBarLabel: t('tab_map'),
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🗺️</Text>,
            }}
          />
          <Tab.Screen
            name="Estrada"
            component={RoadEventsScreen}
            options={{
              tabBarLabel: t('tab_road'),
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🚗</Text>,
            }}
          />
          <Tab.Screen
            name="Entretenimento"
            component={EntertainmentScreen}
            options={{
              tabBarLabel: t('tab_events'),
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🎉</Text>,
            }}
          />
          <Tab.Screen
            name="Perfil"
            component={ProfileScreen}
            options={{
              tabBarLabel: t('tab_profile'),
              tabBarIcon: () =>
                profile
                  ? <RankBadge points={profile.points} size="small" />
                  : <Text style={{ fontSize: 22 }}>👤</Text>,
            }}
          />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FF5722', padding: 24,
  },
  splashLogo: { fontSize: 72, marginBottom: 8 },
  splashName: {
    fontSize: 42, fontWeight: '900', color: '#fff',
    letterSpacing: -1, marginBottom: 4,
  },
});
