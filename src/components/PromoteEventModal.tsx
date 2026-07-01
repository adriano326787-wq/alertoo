import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Alert, ActivityIndicator, Image, Animated, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from '../services/safeImagePicker';
import {
  PROMOTION_TIERS,
  PromotionTier,
  PROMOTION_PACKAGES,
  PROMOTION_PRICING,
  PromotionPackageId,
  WEEKDAY_LABELS,
  calcPackageCredits,
} from '../types/promotion';
import {
  createPromotion,
  uploadPromotionPhoto,
  daysRemaining,
  getUserCredits,
} from '../services/promotionService';
import { getCurrentUserId } from '../services/authService';
import { EntertainmentEvent } from '../types/entertainment';
import { BuyCreditsScreen } from '../screens/BuyCreditsScreen';
import { useT } from '../hooks/useT';
import { tf, tTier } from '../utils/i18n';

interface Props {
  visible: boolean;
  event: EntertainmentEvent | null;
  userCredits: number;
  isAdmin?: boolean;
  onClose: () => void;
  onPromoted: () => void;
  onCreditsUpdated: (newCredits: number) => void;
}

// Benefícios chave por tier (1 linha, direto ao ponto)
const TIER_KEY_BENEFIT: Record<PromotionTier, string> = {
  bronze: 'Pin destacado no mapa',
  prata:  'Pin + topo da lista da região',
  ouro:   'Pin animado + home + topo da lista',
};

// Cor de fundo suave por tier
const TIER_BG: Record<PromotionTier, string> = {
  bronze: '#FFF8F0',
  prata:  '#F5F7FF',
  ouro:   '#FFFBEA',
};

const TIER_BORDER: Record<PromotionTier, string> = {
  bronze: '#CD7F32',
  prata:  '#A8A9AD',
  ouro:   '#FFD700',
};

// Ranking de valor dos tiers — usado para detectar downgrades acidentais
const TIER_RANK: Record<PromotionTier, number> = { bronze: 1, prata: 2, ouro: 3 };

export function PromoteEventModal({
  visible, event, userCredits, isAdmin = false, onClose, onPromoted, onCreditsUpdated,
}: Props) {
  const t = useT();
  const { top } = useSafeAreaInsets();
  const [selectedTier, setSelectedTier]       = useState<PromotionTier>('bronze');
  const [selectedPackage, setSelectedPackage] = useState<PromotionPackageId>('full');
  const [selectedWeeks, setSelectedWeeks]     = useState(1);
  const [singleDayDow, setSingleDayDow]       = useState<number>(new Date().getDay());
  const [photoUris, setPhotoUris]             = useState<string[]>([]);
  const [eventLink, setEventLink]             = useState('');
  const [uploadProgress, setUploadProgress]   = useState(0);
  const [loading, setLoading]                 = useState(false);
  const [showBuyCredits, setShowBuyCredits]   = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Ao abrir o modal para um evento que já tem promoção ativa, pré-seleciona
  // o nível/pacote/semanas atuais — evita que o usuário downgrade por engano
  // achando "bronze" (default) o estado atual.
  useEffect(() => {
    if (!visible || !event) return;
    const isActive = !!event.promotionTier && !!event.promotionEndDate && event.promotionEndDate > Date.now();
    if (!isActive) return;

    setSelectedTier(event.promotionTier!);
    if (event.promotionPackage) {
      setSelectedPackage(event.promotionPackage);
      if (event.promotionPackage === 'single' && event.promotionActiveDays?.length === 1) {
        setSingleDayDow(event.promotionActiveDays[0]);
      }
    }
    if (event.promotionWeeks) {
      setSelectedWeeks(event.promotionWeeks);
    }
  }, [visible, event?.id]);

  const tierConfig  = PROMOTION_TIERS[selectedTier];
  const pkgConfig   = PROMOTION_PACKAGES[selectedPackage];
  const activeDays  = selectedPackage === 'single' ? [singleDayDow] : pkgConfig.defaultActiveDays;
  const totalCredits = calcPackageCredits(selectedTier, selectedPackage, selectedWeeks);
  const remaining    = userCredits - totalCredits;
  const canAfford    = isAdmin || userCredits >= totalCredits;
  const maxPhotos    = tierConfig.maxPhotos;

  const alreadyPromoted = !!(
    event?.promotionTier &&
    event.promotionEndDate &&
    event.promotionEndDate > Date.now()
  );

  // ── Dupla verificação: detecta downgrade de tier ou redução de validade ──
  const currentTier      = alreadyPromoted ? event!.promotionTier! : null;
  const currentEndDate   = alreadyPromoted ? event!.promotionEndDate! : null;
  const newDurationMs    = selectedWeeks * 7 * 24 * 60 * 60 * 1000;
  const newEndDate       = Date.now() + newDurationMs;
  const isTierDowngrade  = !!currentTier && TIER_RANK[selectedTier] < TIER_RANK[currentTier];
  const isShorterPeriod  = !!currentEndDate && newEndDate < currentEndDate;
  const isDowngrade      = isTierDowngrade || isShorterPeriod;

  useEffect(() => {
    setPhotoUris((prev) => prev.slice(0, PROMOTION_TIERS[selectedTier].maxPhotos));
  }, [selectedTier]);

  async function handlePickPhoto(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'unavailable') {
      Alert.alert('Indisponível nesta versão', 'A seleção de fotos não está disponível nesta versão do app. Atualize o Alertoo e tente novamente.');
      return;
    }
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para escolher a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // #34 — allowsEditing+aspect já força o crop 16:9 no cropper nativo, mas
      // alguns apps de galeria de fabricante (ex: alguns ROMs Android) ignoram
      // esse parâmetro. Checagem defensiva: se a proporção retornada estiver
      // muito longe de 16:9, avisa que a foto vai aparecer com tarja lateral
      // no pin do mapa (em vez de simplesmente aceitar e surpreender o organizador).
      if (asset.width && asset.height) {
        const ratio = asset.width / asset.height;
        const target = 16 / 9;
        const deviation = Math.abs(ratio - target) / target;
        if (deviation > 0.35) {
          Alert.alert(
            'Foto fora da proporção ideal',
            'Essa foto está bem diferente do formato 16:9 recomendado. Ela ainda será usada, mas pode aparecer com faixas laterais/superiores no pin do mapa. Quer escolher outra foto mais "paisagem" (larga)?',
            [
              { text: 'Usar assim mesmo', onPress: () => acceptPhoto(index, asset.uri) },
              { text: 'Escolher outra', style: 'cancel', onPress: () => handlePickPhoto(index) },
            ],
          );
          return;
        }
      }
      acceptPhoto(index, asset.uri);
    }
  }

  function acceptPhoto(index: number, uri: string) {
    setPhotoUris((prev) => {
      const next = [...prev];
      next[index] = uri;
      return next;
    });
  }

  function handleRemovePhoto(index: number) {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePromote() {
    if (!event) return;
    if (!canAfford) { setShowBuyCredits(true); return; }

    if (isDowngrade) {
      const currentLabel = `${PROMOTION_TIERS[currentTier!].emoji} ${tTier(currentTier!)}`;
      const newLabel = `${tierConfig.emoji} ${tTier(selectedTier)}`;
      const messages: string[] = [];
      if (isTierDowngrade) {
        messages.push(`Você está trocando de ${currentLabel} para ${newLabel}, um nível inferior ao atual.`);
      }
      if (isShorterPeriod) {
        messages.push(`A validade da promoção atual (${daysRemaining(currentEndDate!)} dias restantes) será reduzida para ${selectedWeeks * 7} dias a partir de agora.`);
      }
      messages.push('Os créditos já utilizados na promoção atual não são reembolsados. Deseja continuar?');

      Alert.alert(
        '⚠️ Confirmar alteração da promoção',
        messages.join('\n\n'),
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sim, confirmar', style: 'destructive', onPress: () => doPromote() },
        ],
      );
      return;
    }

    doPromote();
  }

  async function doPromote() {
    if (!event) return;

    setLoading(true);
    setUploadProgress(0);
    try {
      const userId = getCurrentUserId();
      const progresses = new Array(photoUris.length).fill(0);
      const updateTotal = () => {
        const avg = progresses.reduce((s, p) => s + p, 0) / Math.max(photoUris.length, 1);
        setUploadProgress(Math.round(avg));
      };
      const uploadedUrls = await Promise.all(
        photoUris.map((uri, i) =>
          uploadPromotionPhoto(userId, event.id, uri, (pct) => {
            progresses[i] = pct;
            updateTotal();
          }),
        ),
      );
      const normalizedLink = eventLink.trim()
        ? (eventLink.trim().startsWith('http') ? eventLink.trim() : `https://${eventLink.trim()}`)
        : null;

      const result = await createPromotion({
        userId, eventId: event.id, tier: selectedTier,
        photoUrl: uploadedUrls[0] ?? null, photoUrls: uploadedUrls,
        skipCreditCheck: isAdmin,
        packageId: selectedPackage, weeks: selectedWeeks, activeDays,
        link: normalizedLink,
      });
      if (!isAdmin) {
        onCreditsUpdated(result.newCredits);
      }
      Alert.alert(
        t('promo_success_title'),
        tf('promo_success_msg', { tier: `${tierConfig.emoji} ${tTier(tierConfig.id)}`, days: selectedWeeks * 7 }),
        [{ text: t('promo_great'), onPress: () => { onPromoted(); handleClose(); } }],
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível promover o evento.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSelectedTier('bronze');
    setSelectedPackage('full');
    setSelectedWeeks(1);
    setSingleDayDow(new Date().getDay());
    setPhotoUris([]);
    setEventLink('');
    setUploadProgress(0);
    onClose();
  }

  if (!event) return null;

  // Barra de saldo visual (0–100%)
  const balancePct  = isAdmin ? 100 : Math.min(100, (userCredits / Math.max(totalCredits, 1)) * 100);
  const balanceColor = canAfford ? '#22C55E' : '#EF4444';

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.safe}>

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <View style={[styles.header, { paddingTop: Math.max(top, 16) }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>🚀 Promover Evento</Text>
            {/* Saldo sempre visível no header */}
            <View style={[styles.balanceChip, { borderColor: balanceColor + '60', backgroundColor: balanceColor + '15' }]}>
              <Text style={[styles.balanceChipText, { color: balanceColor }]}>
                🪙 {isAdmin ? '∞' : userCredits}
              </Text>
              {!isAdmin && (
                <Text style={[styles.balanceChipSub, { color: balanceColor }]}>
                  disponív{userCredits !== 1 ? 'eis' : 'el'}
                </Text>
              )}
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {/* ── Evento ────────────────────────────────────────────────────── */}
            <View style={styles.eventCard}>
              <Text style={styles.eventCardLabel}>EVENTO SELECIONADO</Text>
              <Text style={styles.eventCardTitle} numberOfLines={2}>{event.title}</Text>
              {event.address && (
                <Text style={styles.eventCardAddress} numberOfLines={1}>📍 {event.address}</Text>
              )}
              {alreadyPromoted && (
                <View style={styles.alreadyBadge}>
                  <Text style={styles.alreadyBadgeText}>
                    {PROMOTION_TIERS[event.promotionTier!].emoji} Promoção ativa · {daysRemaining(event.promotionEndDate!)} dias restantes
                  </Text>
                </View>
              )}
            </View>

            {/* ══════════════════════════════════════════════════════════════════
                PASSO 1 — Nível de destaque
            ══════════════════════════════════════════════════════════════════ */}
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>1</Text></View>
              <Text style={styles.stepTitle}>Escolha o nível de destaque</Text>
            </View>

            <View style={styles.tiersRow}>
              {(Object.values(PROMOTION_TIERS)).map((tier) => {
                const isSelected  = selectedTier === tier.id;
                const priceNow    = PROMOTION_PRICING[tier.id][selectedPackage] * selectedWeeks;
                const canAffordTier = isAdmin || userCredits >= priceNow;

                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[
                      styles.tierCard,
                      isSelected && { borderColor: TIER_BORDER[tier.id], backgroundColor: TIER_BG[tier.id] },
                      !isSelected && styles.tierCardDefault,
                    ]}
                    onPress={() => setSelectedTier(tier.id)}
                    activeOpacity={0.8}
                  >
                    {/* Checkmark selecionado */}
                    {isSelected && (
                      <View style={[styles.tierCheckmark, { backgroundColor: TIER_BORDER[tier.id] }]}>
                        <Text style={styles.tierCheckmarkText}>✓</Text>
                      </View>
                    )}

                    {/* Ícone animado para Ouro */}
                    <Animated.View style={[
                      styles.tierIcon,
                      { backgroundColor: tier.pinColor + '25', borderColor: tier.pinColor },
                      isSelected && tier.animated && { transform: [{ scale: pulseAnim }] },
                    ]}>
                      <Text style={styles.tierIconEmoji}>{tier.emoji}</Text>
                    </Animated.View>

                    <Text style={[styles.tierName, isSelected && { color: TIER_BORDER[tier.id] }]}>
                      {tTier(tier.id)}
                    </Text>

                    <Text style={styles.tierBenefit}>{TIER_KEY_BENEFIT[tier.id]}</Text>

                    {/* Preço para a configuração atual */}
                    <View style={[
                      styles.tierPriceBadge,
                      { backgroundColor: isSelected ? TIER_BORDER[tier.id] + '20' : '#F3F4F6' },
                    ]}>
                      <Text style={[styles.tierPriceText, isSelected && { color: TIER_BORDER[tier.id] }]}>
                        🪙 {priceNow} cr{priceNow !== 1 ? '' : ''}
                      </Text>
                      <Text style={[styles.tierPriceSub, isSelected && { color: TIER_BORDER[tier.id] + 'AA' }]}>
                        total agora
                      </Text>
                    </View>

                    {!canAffordTier && !isAdmin && (
                      <Text style={styles.tierInsufficient}>Créditos insuficientes</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Benefícios completos do tier selecionado */}
            <View style={[styles.tierBenefitsCard, { borderColor: TIER_BORDER[selectedTier] + '60', backgroundColor: TIER_BG[selectedTier] }]}>
              <Text style={[styles.tierBenefitsTitle, { color: TIER_BORDER[selectedTier] }]}>
                {tierConfig.emoji} O que você ganha com {tTier(selectedTier)}
              </Text>
              <View style={styles.tierBenefitsList}>
                {tierConfig.description.map((d, i) => (
                  <View key={i} style={styles.tierBenefitRow}>
                    <Text style={[styles.tierBenefitCheck, { color: TIER_BORDER[selectedTier] }]}>✓</Text>
                    <Text style={styles.tierBenefitText}>{t(d)}</Text>
                  </View>
                ))}
                <View style={styles.tierBenefitRow}>
                  <Text style={[styles.tierBenefitCheck, { color: TIER_BORDER[selectedTier] }]}>📷</Text>
                  <Text style={styles.tierBenefitText}>Até {tierConfig.maxPhotos} foto{tierConfig.maxPhotos !== 1 ? 's' : ''} de divulgação</Text>
                </View>
              </View>
            </View>

            {/* ══════════════════════════════════════════════════════════════════
                PASSO 2 — Pacote de dias
            ══════════════════════════════════════════════════════════════════ */}
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>2</Text></View>
              <Text style={styles.stepTitle}>Escolha os dias de exibição</Text>
            </View>

            <View style={styles.packageGrid}>
              {(Object.values(PROMOTION_PACKAGES)).map((pkg) => {
                const isSelPkg  = selectedPackage === pkg.id;
                const pkgPrice  = PROMOTION_PRICING[selectedTier][pkg.id];
                const daysLabel = pkg.id === 'single'
                  ? '1 dia à escolha'
                  : pkg.defaultActiveDays.map((d) => WEEKDAY_LABELS[d]).join(' · ');

                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[styles.packageCard, isSelPkg && styles.packageCardSelected]}
                    onPress={() => setSelectedPackage(pkg.id)}
                    activeOpacity={0.8}
                  >
                    {isSelPkg && (
                      <View style={styles.packageCheckmark}>
                        <Text style={styles.packageCheckmarkText}>✓</Text>
                      </View>
                    )}
                    <Text style={styles.packageEmoji}>{pkg.emoji}</Text>
                    <Text style={[styles.packageName, isSelPkg && styles.packageNameSelected]}>
                      {pkg.label}
                    </Text>
                    <Text style={styles.packageDays}>{daysLabel}</Text>
                    {/* Preço por semana para este pacote com o tier escolhido */}
                    <View style={[styles.packagePricePill, isSelPkg && styles.packagePricePillSelected]}>
                      <Text style={[styles.packagePriceText, isSelPkg && styles.packagePriceTextSelected]}>
                        🪙 {pkgPrice}/sem
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Seletor de dia (aparece só para Dia Único) */}
            {selectedPackage === 'single' && (
              <View style={styles.singleDayBox}>
                <Text style={styles.singleDayLabel}>Qual dia da semana?</Text>
                <View style={styles.singleDayChips}>
                  {WEEKDAY_LABELS.map((label, dow) => (
                    <TouchableOpacity
                      key={dow}
                      style={[styles.dowChip, singleDayDow === dow && styles.dowChipSelected]}
                      onPress={() => setSingleDayDow(dow)}
                    >
                      <Text style={[styles.dowChipText, singleDayDow === dow && styles.dowChipTextSel]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                PASSO 3 — Período
            ══════════════════════════════════════════════════════════════════ */}
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>3</Text></View>
              <Text style={styles.stepTitle}>Por quantas semanas?</Text>
            </View>

            <View style={styles.weeksGrid}>
              {[1, 2, 3, 4, 6, 8].map((w) => {
                const wPrice  = calcPackageCredits(selectedTier, selectedPackage, w);
                const isSel   = selectedWeeks === w;
                const canAfW  = isAdmin || userCredits >= wPrice;
                return (
                  <TouchableOpacity
                    key={w}
                    style={[styles.weekCard, isSel && styles.weekCardSelected, !canAfW && !isAdmin && styles.weekCardInsufficient]}
                    onPress={() => setSelectedWeeks(w)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.weekCardNum, isSel && styles.weekCardNumSel]}>{w}</Text>
                    <Text style={[styles.weekCardUnit, isSel && styles.weekCardUnitSel]}>
                      {w === 1 ? 'semana' : 'semanas'}
                    </Text>
                    <Text style={[styles.weekCardPrice, isSel && styles.weekCardPriceSel]}>
                      🪙 {wPrice}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ══════════════════════════════════════════════════════════════════
                PASSO 4 — Fotos (opcional)
            ══════════════════════════════════════════════════════════════════ */}
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>4</Text></View>
              <View style={styles.stepTitleRow}>
                <Text style={styles.stepTitle}>Fotos de divulgação</Text>
                <Text style={styles.stepOptional}>opcional</Text>
              </View>
            </View>

            <Text style={styles.photoHint}>
              Fotos aumentam o engajamento. Seu plano {tTier(selectedTier)} permite até {maxPhotos} foto{maxPhotos !== 1 ? 's' : ''}.
            </Text>

            <View style={styles.photoGrid}>
              {Array.from({ length: maxPhotos }).map((_, i) => {
                const uri = photoUris[i];
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.photoSlot, uri && styles.photoSlotFilled]}
                    onPress={() => handlePickPhoto(i)}
                    activeOpacity={0.8}
                  >
                    {uri ? (
                      <>
                        <Image source={{ uri }} style={styles.photoSlotImage} />
                        <TouchableOpacity
                          style={styles.photoSlotRemove}
                          onPress={() => handleRemovePhoto(i)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.photoSlotRemoveText}>✕</Text>
                        </TouchableOpacity>
                        {i === 0 && (
                          <View style={styles.photoCoverBadge}>
                            <Text style={styles.photoCoverText}>Capa</Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <>
                        <Text style={styles.photoSlotIcon}>📷</Text>
                        <Text style={styles.photoSlotLabel}>{i === 0 ? 'Foto capa' : `Foto ${i + 1}`}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ══════════════════════════════════════════════════════════════════
                PASSO 5 — Link do evento (opcional)
            ══════════════════════════════════════════════════════════════════ */}
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>5</Text></View>
              <View style={styles.stepTitleRow}>
                <Text style={styles.stepTitle}>Link do evento</Text>
                <Text style={styles.stepOptional}>opcional</Text>
              </View>
            </View>

            <Text style={styles.photoHint}>
              Adicione um link para o site, ingresso ou redes sociais do evento. Aparece no card para todos os usuários.
            </Text>
            <TextInput
              style={styles.linkInput}
              placeholder="https://..."
              placeholderTextColor="#94A3B8"
              value={eventLink}
              onChangeText={setEventLink}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={300}
            />

            {/* ══════════════════════════════════════════════════════════════════
                RESUMO DO PEDIDO
            ══════════════════════════════════════════════════════════════════ */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>RESUMO DO PEDIDO</Text>

              {/* Comparação com a promoção atual — evita downgrade acidental */}
              {alreadyPromoted && (
                <View style={styles.compareBox}>
                  <Text style={styles.compareTitle}>Promoção atual</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Nível atual</Text>
                    <Text style={styles.summaryRowValue}>
                      {PROMOTION_TIERS[currentTier!].emoji} {tTier(currentTier!)} · {daysRemaining(currentEndDate!)} dias restantes
                    </Text>
                  </View>
                  {isDowngrade && (
                    <View style={styles.downgradeWarning}>
                      <Text style={styles.downgradeWarningText}>
                        ⚠️ {isTierDowngrade && 'A nova seleção é um nível inferior ao atual. '}
                        {isShorterPeriod && 'A validade será reduzida em relação à promoção atual. '}
                        Confirme antes de prosseguir.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Configuração escolhida */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>{alreadyPromoted ? 'Novo nível' : 'Nível'}</Text>
                <Text style={styles.summaryRowValue}>{tierConfig.emoji} {tTier(selectedTier)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Pacote</Text>
                <Text style={styles.summaryRowValue}>{pkgConfig.emoji} {pkgConfig.label}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Dias ativos</Text>
                <Text style={styles.summaryRowValue}>
                  {activeDays.map((d) => WEEKDAY_LABELS[d]).join(', ')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Período</Text>
                <Text style={styles.summaryRowValue}>{selectedWeeks} {selectedWeeks === 1 ? 'semana' : 'semanas'} · {selectedWeeks * 7} dias</Text>
              </View>

              <View style={styles.summaryDivider} />

              {/* Custo */}
              <View style={styles.summaryCostRow}>
                <Text style={styles.summaryCostLabel}>Custo total</Text>
                <View style={styles.summaryCostRight}>
                  <Text style={styles.summaryCostValue}>🪙 {isAdmin ? '0' : totalCredits}</Text>
                  <Text style={styles.summaryCostSub}>{isAdmin ? 'Admin gratuito' : `${totalCredits === 1 ? 'crédito' : 'créditos'}`}</Text>
                </View>
              </View>

              {/* Barra de saldo */}
              {!isAdmin && (
                <>
                  <View style={styles.balanceBar}>
                    <View style={[styles.balanceBarFill, { width: `${balancePct}%`, backgroundColor: balanceColor }]} />
                  </View>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>
                      Seu saldo: <Text style={{ fontWeight: '800', color: '#1a1a1a' }}>🪙 {userCredits}</Text>
                    </Text>
                    {canAfford ? (
                      <Text style={styles.balanceAfter}>
                        Após: <Text style={{ fontWeight: '800', color: '#22C55E' }}>🪙 {remaining}</Text>
                      </Text>
                    ) : (
                      <Text style={styles.balanceShort}>
                        Faltam <Text style={{ fontWeight: '800', color: '#EF4444' }}>🪙 {Math.abs(remaining)}</Text>
                      </Text>
                    )}
                  </View>
                </>
              )}
            </View>

            {/* Botão comprar créditos (se não puder pagar) */}
            {!canAfford && (
              <TouchableOpacity style={styles.buyMoreBtn} onPress={() => setShowBuyCredits(true)}>
                <Text style={styles.buyMoreIcon}>🪙</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.buyMoreTitle}>Comprar mais créditos</Text>
                  <Text style={styles.buyMoreSub}>
                    Você precisa de mais {Math.abs(remaining)} crédito{Math.abs(remaining) !== 1 ? 's' : ''} para esta promoção
                  </Text>
                </View>
                <Text style={styles.buyMoreArrow}>›</Text>
              </TouchableOpacity>
            )}

            {/* Botão principal */}
            <TouchableOpacity
              style={[styles.promoteBtn, { backgroundColor: canAfford ? '#FF5722' : '#CBD5E1' }]}
              onPress={handlePromote}
              disabled={!canAfford || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.loadingText}>
                    {uploadProgress > 0 && uploadProgress < 100
                      ? `Enviando fotos… ${uploadProgress}%`
                      : 'Ativando promoção…'}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.promoteBtnText}>
                    {canAfford
                      ? `🚀 Promover por 🪙 ${isAdmin ? 0 : totalCredits} crédito${totalCredits !== 1 ? 's' : ''}`
                      : '🪙 Comprar créditos primeiro'}
                  </Text>
                  {canAfford && (
                    <Text style={styles.promoteBtnSub}>
                      {tTier(selectedTier)} · {pkgConfig.label} · {selectedWeeks} sem
                    </Text>
                  )}
                </>
              )}
            </TouchableOpacity>

          </ScrollView>
        </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <BuyCreditsScreen
        visible={showBuyCredits}
        onClose={() => setShowBuyCredits(false)}
        onPurchased={async () => {
          const userId = getCurrentUserId();
          const newCredits = await getUserCredits(userId);
          onCreditsUpdated(newCredits);
          setShowBuyCredits(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  // ─── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 20, color: '#64748B', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },

  balanceChip: {
    alignItems: 'center', borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 10, paddingVertical: 5, minWidth: 60,
  },
  balanceChipText: { fontSize: 14, fontWeight: '900' },
  balanceChipSub: { fontSize: 9, fontWeight: '600', marginTop: 1, opacity: 0.8 },

  content: {
    padding: 16, paddingBottom: 48, gap: 0,
    // Em tablets/telas largas, evita que o conteúdo fique esticado de ponta a ponta
    width: '100%', maxWidth: 480, alignSelf: 'center',
  },

  // ─── Evento ──────────────────────────────────────────────────────────────────
  eventCard: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  eventCardLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 5 },
  eventCardTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginBottom: 3 },
  eventCardAddress: { fontSize: 12, color: '#94A3B8' },
  alreadyBadge: {
    marginTop: 8, backgroundColor: '#DCFCE7', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  alreadyBadgeText: { fontSize: 12, color: '#15803D', fontWeight: '700' },

  // ─── Steps ───────────────────────────────────────────────────────────────────
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 20 },
  stepBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FF5722', alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 13, fontWeight: '900', color: '#fff' },
  stepTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', flex: 1 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  stepOptional: {
    fontSize: 10, fontWeight: '700', color: '#94A3B8',
    backgroundColor: '#F1F5F9', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },

  // ─── Tiers ───────────────────────────────────────────────────────────────────
  tiersRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tierCard: {
    flex: 1, borderRadius: 16, borderWidth: 2, padding: 10,
    alignItems: 'center', position: 'relative',
  },
  tierCardDefault: { borderColor: '#E2E8F0', backgroundColor: '#fff' },
  tierCheckmark: {
    position: 'absolute', top: 7, right: 7,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  tierCheckmarkText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  tierIcon: {
    width: 50, height: 50, borderRadius: 25, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 7,
  },
  tierIconEmoji: { fontSize: 22 },
  tierName: { fontSize: 14, fontWeight: '900', color: '#334155', marginBottom: 4, textAlign: 'center' },
  tierBenefit: { fontSize: 9, color: '#64748B', textAlign: 'center', marginBottom: 8, lineHeight: 13 },
  tierPriceBadge: {
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6,
    alignItems: 'center', width: '100%',
  },
  tierPriceText: { fontSize: 13, fontWeight: '900', color: '#475569' },
  tierPriceSub: { fontSize: 9, color: '#94A3B8', fontWeight: '600', marginTop: 1 },
  tierInsufficient: { fontSize: 9, color: '#EF4444', fontWeight: '700', marginTop: 4, textAlign: 'center' },

  // ─── Benefícios do tier selecionado ──────────────────────────────────────────
  tierBenefitsCard: {
    borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 4,
  },
  tierBenefitsTitle: { fontSize: 12, fontWeight: '800', marginBottom: 10 },
  tierBenefitsList: { gap: 6 },
  tierBenefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tierBenefitCheck: { fontSize: 12, fontWeight: '900', marginTop: 1 },
  tierBenefitText: { fontSize: 12, color: '#475569', flex: 1, lineHeight: 17 },

  // ─── Pacotes ─────────────────────────────────────────────────────────────────
  packageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  packageCard: {
    width: '47.5%', borderRadius: 14, borderWidth: 2, borderColor: '#E2E8F0',
    padding: 12, alignItems: 'center', backgroundColor: '#fff',
    position: 'relative',
  },
  packageCardSelected: { borderColor: '#FF5722', backgroundColor: '#FFF5F2' },
  packageCheckmark: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FF5722', alignItems: 'center', justifyContent: 'center',
  },
  packageCheckmarkText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  packageEmoji: { fontSize: 26, marginBottom: 5 },
  packageName: { fontSize: 13, fontWeight: '800', color: '#334155', textAlign: 'center', marginBottom: 3 },
  packageNameSelected: { color: '#FF5722' },
  packageDays: { fontSize: 10, color: '#94A3B8', textAlign: 'center', marginBottom: 8, fontWeight: '600' },
  packagePricePill: {
    backgroundColor: '#F1F5F9', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  packagePricePillSelected: { backgroundColor: '#FF5722' },
  packagePriceText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  packagePriceTextSelected: { color: '#fff' },

  // ─── Seletor dia único ────────────────────────────────────────────────────────
  singleDayBox: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    padding: 12, marginBottom: 8,
  },
  singleDayLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 10 },
  singleDayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dowChip: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  dowChipSelected: { borderColor: '#FF5722', backgroundColor: '#FF5722' },
  dowChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  dowChipTextSel: { color: '#fff' },

  // ─── Semanas ──────────────────────────────────────────────────────────────────
  weeksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  weekCard: {
    width: '30%', borderRadius: 14, borderWidth: 2, borderColor: '#E2E8F0',
    padding: 10, alignItems: 'center', backgroundColor: '#fff',
  },
  weekCardSelected: { borderColor: '#FF5722', backgroundColor: '#FFF5F2' },
  weekCardInsufficient: { opacity: 0.4 },
  weekCardNum: { fontSize: 22, fontWeight: '900', color: '#334155' },
  weekCardNumSel: { color: '#FF5722' },
  weekCardUnit: { fontSize: 10, color: '#94A3B8', fontWeight: '600', marginBottom: 4 },
  weekCardUnitSel: { color: '#FF572280' },
  weekCardPrice: { fontSize: 11, fontWeight: '800', color: '#94A3B8' },
  weekCardPriceSel: { color: '#FF5722' },

  // ─── Link ────────────────────────────────────────────────────────────────────
  linkInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#1a1a1a',
    backgroundColor: '#fff', marginBottom: 4,
  },

  // ─── Fotos ────────────────────────────────────────────────────────────────────
  photoHint: { fontSize: 12, color: '#64748B', marginBottom: 10, lineHeight: 17 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  photoSlot: {
    width: '47.5%', aspectRatio: 16 / 9,
    borderRadius: 10, borderWidth: 2, borderStyle: 'dashed',
    borderColor: '#CBD5E1', backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoSlotFilled: { borderStyle: 'solid', borderColor: 'transparent' },
  photoSlotImage: { width: '100%', height: '100%', position: 'absolute' },
  photoSlotRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  photoSlotRemoveText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  photoCoverBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  photoCoverText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  photoSlotIcon: { fontSize: 22, marginBottom: 3 },
  photoSlotLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },

  // ─── Resumo ───────────────────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0',
    padding: 16, marginTop: 20, marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 12,
  },
  // ─── Comparação com promoção atual ───────────────────────────────────────────
  compareBox: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  compareTitle: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.6, marginBottom: 4 },
  downgradeWarning: {
    marginTop: 6, backgroundColor: '#FEF2F2', borderRadius: 8,
    borderWidth: 1, borderColor: '#FECACA', padding: 8,
  },
  downgradeWarningText: { fontSize: 12, color: '#B91C1C', fontWeight: '700', lineHeight: 17 },

  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  summaryRowLabel: { fontSize: 13, color: '#64748B' },
  summaryRowValue: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', maxWidth: '60%', textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },

  summaryCostRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  summaryCostLabel: { fontSize: 14, fontWeight: '700', color: '#334155' },
  summaryCostRight: { alignItems: 'flex-end' },
  summaryCostValue: { fontSize: 22, fontWeight: '900', color: '#1a1a1a' },
  summaryCostSub: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },

  balanceBar: {
    height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', marginBottom: 6, overflow: 'hidden',
  },
  balanceBarFill: { height: '100%', borderRadius: 3 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceLabel: { fontSize: 12, color: '#64748B' },
  balanceAfter: { fontSize: 12, color: '#64748B' },
  balanceShort: { fontSize: 12, color: '#64748B' },

  // ─── Comprar créditos ─────────────────────────────────────────────────────────
  buyMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#FED7AA', marginBottom: 12,
  },
  buyMoreIcon: { fontSize: 26 },
  buyMoreTitle: { fontSize: 14, fontWeight: '800', color: '#C2410C' },
  buyMoreSub: { fontSize: 12, color: '#92400E', marginTop: 2 },
  buyMoreArrow: { fontSize: 22, color: '#F97316', fontWeight: '700' },

  // ─── Botão principal ──────────────────────────────────────────────────────────
  promoteBtn: {
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#FF5722', shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  promoteBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  promoteBtnSub: { fontSize: 11, color: '#ffffff99', marginTop: 3, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
