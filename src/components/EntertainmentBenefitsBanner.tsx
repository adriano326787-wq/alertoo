import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';

// Necessário para LayoutAnimation funcionar no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BENEFITS = [
  {
    emoji: '📣',
    title: 'Alcance do público',
    description: 'Seu evento aparece no mapa para todos os usuários da região — sem custo extra.',
    color: '#1565C0',
    bg: '#E3F2FD',
  },
  {
    emoji: '💰',
    title: 'Aumento de receita',
    description: 'Mais visibilidade = mais clientes. Eventos divulgados recebem até 3× mais visitas.',
    color: '#2E7D32',
    bg: '#E8F5E9',
  },
  {
    emoji: '📍',
    title: 'Divulgação do local',
    description: 'Coloque seu bar, restaurante ou espaço no radar de quem está perto agora.',
    color: '#E65100',
    bg: '#FBE9E7',
  },
  {
    emoji: '🌟',
    title: 'Destaque com promoção',
    description: 'Promova seu evento com Bronze, Prata ou Ouro e apareça em primeiro no mapa.',
    color: '#6A1B9A',
    bg: '#F3E5F5',
  },
];

export function EntertainmentBenefitsBanner() {
  const [expanded, setExpanded] = useState(true);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v => !v);
  }

  return (
    <View style={styles.container}>
      {/* Header clicável */}
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>🚀</Text>
          <View>
            <Text style={styles.headerTitle}>Por que divulgar seu evento?</Text>
            <Text style={styles.headerSub}>Gratuito · Instantâneo · Alcance local</Text>
          </View>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Cards de benefícios */}
      {expanded && (
        <View style={styles.cards}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={[styles.card, { backgroundColor: b.bg, borderLeftColor: b.color }]}>
              <Text style={styles.cardEmoji}>{b.emoji}</Text>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: b.color }]}>{b.title}</Text>
                <Text style={styles.cardDesc}>{b.description}</Text>
              </View>
            </View>
          ))}

          {/* CTA de promoção */}
          <View style={styles.promoTip}>
            <Text style={styles.promoTipText}>
              💡 <Text style={styles.promoTipBold}>Dica:</Text> Após publicar, acesse seu Perfil e toque em{' '}
              <Text style={styles.promoTipBold}>"Promover"</Text> para impulsionar seu evento no mapa.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF8F6',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0D6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerEmoji: {
    fontSize: 26,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5722',
  },
  headerSub: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  chevron: {
    fontSize: 11,
    color: '#FF5722',
    fontWeight: '700',
  },
  cards: {
    padding: 12,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 12,
    gap: 10,
  },
  cardEmoji: {
    fontSize: 22,
    marginTop: 1,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: '#555',
    lineHeight: 17,
  },
  promoTip: {
    backgroundColor: '#FFFDE7',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFF176',
    marginTop: 2,
  },
  promoTipText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
  promoTipBold: {
    fontWeight: '700',
    color: '#333',
  },
});
