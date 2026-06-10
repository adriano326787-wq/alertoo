import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppConfig } from '../hooks/useAppVersion';

interface Props {
  config: AppConfig | null;
  mode: 'force_update' | 'maintenance';
}

export function ForceUpdateScreen({ config, mode }: Props) {
  const isMaintenance = mode === 'maintenance';

  function handleUpdate() {
    const url = config?.forceUpdateUrl ?? 'https://play.google.com/store/apps/details?id=com.alertoo.app';
    Linking.openURL(url).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{isMaintenance ? '🔧' : '🔔'}</Text>
        <Text style={styles.title}>
          {isMaintenance ? 'Em manutenção' : 'Atualização necessária'}
        </Text>
        <Text style={styles.subtitle}>
          {isMaintenance
            ? (config?.maintenanceMessage ?? 'O Alertoo está em manutenção. Voltamos em breve!')
            : 'Sua versão do Alertoo está desatualizada. Atualize para continuar usando o app.'}
        </Text>

        {!isMaintenance && (
          <TouchableOpacity style={styles.button} onPress={handleUpdate} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Atualizar agora</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonText: {
    color: '#FF5722',
    fontSize: 17,
    fontWeight: '700',
  },
});
