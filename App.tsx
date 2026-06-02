import { useEffect, useRef, useState } from 'react';
import { rf } from './src/utils/responsive';
import { View, ActivityIndicator, Text, StyleSheet, Linking, Animated } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SystemBars } from 'react-native-edge-to-edge';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/services/firebase';
import { requestNotificationPermission } from './src/services/notificationService';
import * as Notifications from 'expo-notifications';
import { setCurrentUser } from './src/services/authService';
import { useUserStore } from './src/store/userStore';
import { useEventsStore } from './src/store/eventsStore';
import { RoadEventsScreen } from './src/screens/RoadEventsScreen';
import { MapScreen } from './src/screens/MapScreen';
import { EntertainmentScreen } from './src/screens/EntertainmentScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { EmailVerificationScreen } from './src/screens/EmailVerificationScreen';
import { OnboardingScreen, shouldShowOnboarding } from './src/screens/OnboardingScreen';
import { RankBadge } from './src/components/RankBadge';
import { loadSavedLang, tf } from './src/utils/i18n';
import { useT } from './src/hooks/useT';
import { parseEventDeepLink, parsePaymentDeepLink } from './src/utils/deepLinks';
import { useAppStore } from './src/store/appStore';
import { initSentry, setSentryUser } from './src/services/sentry';
import { initAnalytics, identify, resetAnalytics, track } from './src/services/analytics';
import { useFavoritesStore } from './src/store/favoritesStore';
import { initializeAds } from './src/services/adsService';
import { clearAdminCache } from './src/services/adminService';

// Inicializa Sentry o mais cedo possível (antes do componente)
initSentry();

const Tab = createBottomTabNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  // #35 — warm-start toast: shown briefly when the user is already logged in at launch
  const [warmToast, setWarmToast] = useState<string | null>(null);
  const warmToastShown = useRef(false);
  // #20 — in-app notification toast (shown when a notification arrives in foreground)
  const [inAppNotif, setInAppNotif] = useState<{ title: string; body: string } | null>(null);
  const inAppNotifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    // AdMob — inicializa SDK (gracefully ignora se não instalado)
    initializeAds().catch(() => {});
  }, []);

  // ─── Deep links ─────────────────────────────────────────────────────────────
  // Captura links `alertoo://evento/{type}/{id}` (a) ao iniciar o app via link,
  // e (b) enquanto o app está em uso (foreground/background).
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      const parsed = parseEventDeepLink(url);
      if (parsed) {
        useAppStore.getState().setPendingDeepLink(parsed);
        return;
      }
      const paymentResult = parsePaymentDeepLink(url);
      if (paymentResult) {
        useAppStore.getState().setMPPaymentReturn(paymentResult);
      }
    };

    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    // #20 — Show in-app toast when notification arrives in foreground
    const notifReceivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body } = notification.request.content;
      if (title) {
        if (inAppNotifTimer.current) clearTimeout(inAppNotifTimer.current);
        setInAppNotif({ title, body: body ?? '' });
        inAppNotifTimer.current = setTimeout(() => setInAppNotif(null), 4000);
      }
    });

    // #33 — Navigate to event when user taps a local notification
    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      const { eventId, eventType } = data ?? {};
      if (eventId && (eventType === 'road' || eventType === 'entertainment')) {
        useAppStore.getState().setPendingDeepLink({ type: eventType, id: eventId });
      }
    });

    return () => {
      sub.remove();
      notifReceivedSub.remove();
      notifSub.remove();
      if (inAppNotifTimer.current) clearTimeout(inAppNotifTimer.current);
    };
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
        clearAdminCache();
        setSentryUser(null);
        resetAnalytics();
      }

      setUser(u);
      setReady(true);

      // #35 — show warm-start toast only on the very first auth state resolution
      if (!warmToastShown.current && u && !u.isAnonymous) {
        warmToastShown.current = true;
        const name = u.displayName?.split(' ')[0] ?? null;
        if (name) {
          setWarmToast(name);
          setTimeout(() => setWarmToast(null), 3000);
        }
      }
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
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <SystemBars style="dark" />
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
        <EmailVerificationScreen
          user={user}
          onVerified={() => setUser({ ...user, emailVerified: true } as any)}
        />
      </SafeAreaProvider>
    );
  }

  // useSafeAreaInsets precisa estar dentro do SafeAreaProvider
  // por isso usamos um componente interno
  const stripeKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

  return (
    <StripeProvider publishableKey={stripeKey} merchantIdentifier="merchant.com.alertoo.app">
    <SafeAreaProvider>
      <SystemBars style="dark" />
      <NavigationContainer>
        <AppTabs profile={profile} />
      </NavigationContainer>
      {/* #35 — warm-start toast */}
      {warmToast && (
        <View style={styles.warmToast} pointerEvents="none">
          <Text style={styles.warmToastText}>👋 {tf('welcome_back', { name: warmToast! })}</Text>
        </View>
      )}
      {/* #20 — in-app notification toast (foreground) */}
      {inAppNotif && (
        <View style={styles.inAppNotif} pointerEvents="none">
          <Text style={styles.inAppNotifTitle} numberOfLines={1}>{inAppNotif.title}</Text>
          {!!inAppNotif.body && <Text style={styles.inAppNotifBody} numberOfLines={2}>{inAppNotif.body}</Text>}
        </View>
      )}
    </SafeAreaProvider>
    </StripeProvider>
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
            name="Ranking"
            component={LeaderboardScreen}
            options={{
              tabBarLabel: t('tab_ranking') || 'Ranking',
              tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏆</Text>,
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
  warmToast: {
    position: 'absolute', bottom: 80, left: 24, right: 24,
    backgroundColor: 'rgba(30,41,59,0.92)', borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20, shadowRadius: 8, elevation: 10,
  },
  warmToastText: { fontSize: rf(14), fontWeight: '600', color: '#fff' },
  inAppNotif: {
    position: 'absolute', top: 56, left: 16, right: 16,
    backgroundColor: 'rgba(30,41,59,0.95)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 12,
    borderLeftWidth: 4, borderLeftColor: '#FF5722',
  },
  inAppNotifTitle: { fontSize: rf(14), fontWeight: '700', color: '#fff', marginBottom: 2 },
  inAppNotifBody: { fontSize: rf(12), color: 'rgba(255,255,255,0.75)' },
});
