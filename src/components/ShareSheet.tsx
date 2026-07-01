import React, { useRef } from 'react';
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
  Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNShare, { Social } from 'react-native-share';
import { buildShareLinks } from '../utils/deepLinks';
import { EventStoryCard, STORY_CARD_WIDTH, STORY_CARD_HEIGHT } from './EventStoryCard';
import { captureEventStoryImage } from '../utils/storyImage';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  category: string;
  categoryColor: string;
  location?: string;
  eventId: string;
  eventType: 'road' | 'entertainment';
  photoUrl?: string | null;
}

export function ShareSheet({
  visible,
  onClose,
  title,
  description,
  category,
  categoryColor,
  location,
  eventId,
  eventType,
  photoUrl,
}: Props) {
  const t = useT();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const links = buildShareLinks(eventType, eventId);
  const storyCardRef = useRef<View>(null);

  // #17 — sanitize user-generated strings: strip carriage returns / leading+trailing whitespace
  const safeTitle = title.replace(/\r/g, '').trim();
  const safeDescription = description?.replace(/\r/g, '').trim();

  // Mensagem otimizada — usa link WEB (universal) que abre o app se instalado
  // ou redireciona pra Play Store automaticamente.
  const buildMessage = (): string => {
    const lines: string[] = [];
    lines.push(`🎉 ${safeTitle}`);
    if (safeDescription) lines.push(safeDescription);
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
    // Tenta anexar a imagem do story (foto + título) à mensagem do WhatsApp
    const imageUri = await captureEventStoryImage(storyCardRef);
    if (imageUri) {
      try {
        await RNShare.shareSingle({ social: Social.Whatsapp, url: imageUri, message });
        onClose();
        return;
      } catch {
        // segue pro fallback texto-only abaixo
      }
    }

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

  const handleInstagramStory = async () => {
    const imageUri = await captureEventStoryImage(storyCardRef);
    if (!imageUri) {
      Alert.alert(
        t('story_unavailable_title') || 'Não foi possível gerar o story',
        t('story_unavailable_msg') || 'Tente novamente em alguns segundos.',
      );
      onClose();
      return;
    }
    try {
      await RNShare.shareSingle({
        social: Social.InstagramStories,
        backgroundImage: imageUri,
        attributionURL: links.webLink,
        // appId vazio — Instagram aceita o compartilhamento da imagem normalmente;
        // sem um Facebook App ID registrado, apenas o botão de "voltar pro app" no
        // story não aparece (recurso opcional de atribuição).
        appId: '',
      });
    } catch {
      Alert.alert(
        t('instagram_not_found') || 'Instagram não encontrado',
        t('instagram_not_found_msg') || 'Instale o Instagram para compartilhar nos Stories.',
      );
    }
    onClose();
  };

  const handleFacebook = async () => {
    // Inclui o link do evento específico no parâmetro u (item #15)
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(links.webLink)}`;
    const fbDeepLink = `fb://share?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(fbDeepLink);
      if (supported) {
        await Linking.openURL(fbDeepLink);
      } else {
        await Linking.openURL(fbShareUrl);
      }
    } catch {
      await Linking.openURL(fbShareUrl);
    }
    onClose();
  };

  const handleInstagram = async () => {
    try {
      // #15 — actually copy to clipboard so the "paste" instruction makes sense
      Clipboard.setString(message);
      await Share.share({ message });
      Alert.alert('Cole no Instagram', 'Abra o Instagram e cole o texto na sua história ou mensagem.');
    } catch {
      // usuário cancelou — não mostrar alert
    }
    onClose();
  };

  const handleCopyLink = async () => {
    // #16 — copia silenciosamente para o clipboard em vez de abrir share sheet
    try {
      Clipboard.setString(copyableLink);
      Alert.alert(
        t('link_copied_title') || 'Link copiado!',
        t('link_copied_msg') || 'O link do evento foi copiado para a área de transferência.',
        [{ text: 'OK' }]
      );
    } catch {
      // fallback: abre share sheet nativa se Clipboard falhar
      try { await Share.share({ message: copyableLink }); } catch {}
    }
    onClose();
  };

  const handleNativeShare = async () => {
    // Anexa a imagem do story (foto + título do evento) ao share sheet nativo
    const imageUri = await captureEventStoryImage(storyCardRef);
    if (imageUri) {
      try {
        await RNShare.open({ url: imageUri, message, failOnCancel: false });
        onClose();
        return;
      } catch {
        // segue pro fallback texto-only abaixo
      }
    }

    try {
      await Share.share({ message });
    } catch {
      // ignore cancel
    }
    onClose();
  };

  const handleTelegram = async () => {
    const url = `tg://msg?text=${encodeURIComponent(message)}`;
    const webUrl = `https://t.me/share/url?url=${encodeURIComponent(links.webLink)}&text=${encodeURIComponent(`🎉 ${title}`)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      await Linking.openURL(supported ? url : webUrl);
    } catch {
      await Linking.openURL(webUrl);
    }
    onClose();
  };

  const handleTwitter = async () => {
    const tweetText = `🎉 ${safeTitle}${location ? ` · ${location}` : ''}\n\n${links.webLink}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    try { await Linking.openURL(url); } catch {}
    onClose();
  };

  const options: {
    label: string;
    icon: string;
    color: string;
    onPress: () => void;
  }[] = [
    { label: t('share_instagram_story') || 'Story do Instagram', icon: '🎬', color: '#E1306C', onPress: handleInstagramStory },
    { label: 'WhatsApp',       icon: '💬', color: '#25D366', onPress: handleWhatsApp },
    { label: 'Telegram',       icon: '✈️',  color: '#2AABEE', onPress: handleTelegram },
    { label: 'Facebook',       icon: '📘', color: '#1877F2', onPress: handleFacebook },
    { label: 'Instagram',      icon: '📸', color: '#E1306C', onPress: handleInstagram },
    { label: 'X / Twitter',    icon: '🐦', color: '#000000', onPress: handleTwitter },
    { label: t('copy_link'),   icon: '🔗', color: '#64748B', onPress: handleCopyLink },
    { label: t('share'),       icon: '↗',  color: '#FF5722', onPress: handleNativeShare },
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

      {/* Card do Instagram Story renderizado fora da tela — usado pelo view-shot pra gerar a imagem */}
      <View style={styles.storyCardWrapper} pointerEvents="none">
        <EventStoryCard
          ref={storyCardRef}
          title={safeTitle}
          description={safeDescription}
          category={category}
          categoryColor={categoryColor}
          location={location}
          photoUrl={photoUrl}
          ctaLabel={t('see_event') || 'Ver evento'}
        />
      </View>

      <View style={[styles.sheet, { paddingBottom: Math.max(32, bottomInset + 16) }]}>
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
  storyCardWrapper: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: STORY_CARD_WIDTH,
    height: STORY_CARD_HEIGHT,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // paddingBottom is set dynamically via safe area insets (#29)
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
