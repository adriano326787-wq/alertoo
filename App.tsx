import { useEffect, useRef, useState } from 'react';
import { rf } from './src/utils/responsive';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SystemBars } from 'react-native-edge-to-edge';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/services/firebase';
import { setCurrentUser } from './src/services/authService';
import { useUserStore } from './src/store/userStore';
import { useEventsStore } from './src/store/eventsStore';
import { RoadEventsScreen } from './src/screens/RoadEventsScreen';
import { MapScreen } from './src/screens/MapScreen';
import { EntertainmentScreen } from './src/screens/EntertainmentScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { EmailVerificationScreen } from './src/screens/EmailVerificationScreen';
import { RankBadge } from './src/components/RankBadge';
import { t } from './src/utils/i18n';

const Tab = createBottomTabNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { profile, loadProfile, subscribeToProfile, clearProfile } = useUserStore();
  const profileUnsubRef = useRef<(() => void) | null>(null);

  // Carrega filtro persistido na inicialização
  useEffect(() => {
    useEventsStore.getState().loadFilter();
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

        // Ponto 3 — assina perfil em tempo real (só para usuários com conta)
        if (!u.isAnonymous) {
          profileUnsubRef.current = subscribeToProfile(u.uid);
        }
      } else {
        clearProfile();
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

  if (!ready) {
    return (
      <View style={styles.splash}>
        <SystemBars style="light" />
        <Text style={styles.splashLogo}>🔔</Text>
        <Text style={styles.splashName}>Alertoo</Text>
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 32 }} />
      </View>
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
