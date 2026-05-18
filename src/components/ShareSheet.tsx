import React from 'react';
import { useT } from '../hooks/useT';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { buildShareLinks } from '../utils/deepLinks';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  category: string;
  location?: string;
  eventId: string;
  eventType: 'road' | 'entertainment';
}

export function ShareSheet({
  visible,
  onClose,
  title,
  description,
  category,
  location,
  eventId,
  eventType,
}: Props) {
  const t = useT();
  const links = buildShareLinks(eventType, eventId);

  // Mensagem otimizada — usa link WEB (universal) que abre o app se instalado
  // ou redireciona pra Play Store automaticamente.
  const buildMessage = (): string => {
    const lines: string[] = [];
    lines.push(`🎉 ${title}`);
    if (description) lines.push(description);
    if (location) lines.push(`📍 ${location}`);
    lines.push('');
    lines.push(`👉 ${t('see_event') || 'Ver evento'}: ${links.webLink}`);
    lines.push(`📲 ${t('get_app') || 'Baixar Alertoo'}: ${links.storeLink}`);
    return lines.join('\n');
  };

  const message = buildMessage();
  // Para "copiar link", usa o link web (universal) — funciona pra todos
  const copyableLink = links.webLink;

  const handleWhatsApp = async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp não encontrado neste dispositivo');
      }
    } catch {
      Alert.alert('WhatsApp não encontrado neste dispositivo');
    }
    onClose();
  };

  const handleFacebook = async () => {
    const fbUrl = `fb://share?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(fbUrl);
      if (supported) {
        await Linking.openURL(fbUrl);
      } else {
        await Linking.openURL('https://www.facebook.com/sharer/sharer.php?u=alertoo.app');
      }
    } catch {
      await Linking.openURL('https://www.facebook.com/sharer/sharer.php?u=alertoo.app');
    }
    onClose();
  };

  const handleInstagram = async () => {
    try {
      await Share.share({ message });
    } catch {
      // ignore cancel
    }
    Alert.alert('Texto copiado! Cole no Instagram para compartilhar.');
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await Share.share({ message: copyableLink, title: 'Copiar link do evento' });
    } catch {
      // ignore cancel
    }
    onClose();
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({ message });
    } catch {
      // ignore cancel
    }
    onClose();
  };

  const options: {
    label: string;
    icon: string;
    color: string;
    onPress: () => void;
  }[] = [
    {
      label: 'WhatsApp',
      icon: '💬',
      color: '#25D366',
      onPress: handleWhatsApp,
    },
    {
      label: 'Facebook',
      icon: '📘',
      color: '#1877F2',
      onPress: handleFacebook,
    },
    {
      label: 'Instagram',
      icon: '📸',
      color: '#E1306C',
      onPress: handleInstagram,
    },
    {
      label: t('copy_link'),
      icon: '🔗',
      color: '#64748B',
      onPress: handleCopyLink,
    },
    {
      label: t('share'),
      icon: '↗',
      color: '#FF5722',
      onPress: handleNativeShare,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={styles.sheet}>
        <View style={styles.handleBar} />

        <Text style={styles.sheetTitle}>{t('share_event')}</Text>

        <View style={styles.eventInfo}>
          <Text style={styles.eventCategory}>{category}</Text>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.optionsList}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={styles.optionRow}
              onPress={opt.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: opt.color }]}>
                <Text style={styles.iconText}>{opt.icon}</Text>
              </View>
              <Text style={styles.optionLabel}>{opt.label}</Text>
              <Text style={styles.optionArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.cancelText}>{t('filter_cancel')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  eventCategory: {
    fontSize: 18,
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  optionsList: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  optionArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});
