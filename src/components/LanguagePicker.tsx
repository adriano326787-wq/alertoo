import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LangCode, setManualLang, getCurrentLang } from '../utils/i18n';
import { useT } from '../hooks/useT';

const LANGUAGES: { code: LangCode; flag: string; label: string; native: string }[] = [
  { code: 'pt', flag: '🇧🇷', label: 'Português', native: 'Português' },
  { code: 'en', flag: '🇺🇸', label: 'English',   native: 'English'   },
  { code: 'es', flag: '🇪🇸', label: 'Español',   native: 'Español'   },
  { code: 'fr', flag: '🇫🇷', label: 'Français',  native: 'Français'  },
];

export function LanguagePicker() {
  const t = useT();
  const current = getCurrentLang();

  async function handleSelect(code: LangCode) {
    if (code === current) return;
    await setManualLang(code);
    // useT() já está subscrito ao langVersion — bumpLangVersion é chamado
    // em appStore.setUserCountryCode, mas aqui precisamos acionar manualmente
    const { useAppStore } = require('../store/appStore');
    useAppStore.getState().bumpLangVersion();
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>🌐 {t('lang_title')}</Text>
      <View style={styles.grid}>
        {LANGUAGES.map((lang) => {
          const active = current === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.btn, active && styles.btnActive]}
              onPress={() => handleSelect(lang.code)}
              activeOpacity={0.75}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={[styles.native, active && styles.nativeActive]}>
                {lang.native}
              </Text>
              {active && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  btnActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  flag: {
    fontSize: 22,
    marginBottom: 4,
  },
  native: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  nativeActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  activeDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
});
