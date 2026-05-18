# Guia de publicação no Google Play — Alertoo

Checklist sequencial para subir o app pela primeira vez. Tudo o que está marcado como ⚠️ exige ação manual fora deste repositório.

## 1. Pré-build (código)

- [x] Bugs críticos corrigidos (`mapZoom`, `EntertainmentScreen`, Firebase persistence, notificações)
- [x] MP token movido para Cloud Function (`functions/src/index.ts`)
- [x] Memory leaks nas animações dos markers
- [x] `minifyEnabled = true` + ProGuard rules
- [x] Keystore de release configurada em `build.gradle`
- [x] Permissões desnecessárias removidas (`SYSTEM_ALERT_WINDOW`)
- [x] `READ_EXTERNAL_STORAGE` migrada para `READ_MEDIA_IMAGES` (Android 13+)

## 2. Deploy da Cloud Function ⚠️

```bash
cd C:\Users\adria\road-events\functions
npm install
firebase login
firebase use lei-seca---eventos

# Configurar o segredo (apenas uma vez)
firebase functions:secrets:set MP_ACCESS_TOKEN
# (cole o token de PRODUÇÃO do Mercado Pago)

# Deploy
firebase deploy --only functions
```

Após o deploy, **remova** qualquer linha `EXPO_PUBLIC_MP_ACCESS_TOKEN` do seu `.env` e do EAS:
```bash
eas secret:delete --name EXPO_PUBLIC_MP_ACCESS_TOKEN
```

## 3. Gerar keystore de release ⚠️

Siga: `android/keystore/README.md`

## 4. Restringir Google Maps API key ⚠️

Siga: `android/GOOGLE_MAPS_API_KEY_SETUP.md`

## 5. Configurar EAS

```bash
npm install -g eas-cli
eas login
eas build:configure
```

## 6. Build de produção

```bash
eas build --platform android --profile production
```

Quando terminar, baixe o `.aab` gerado.

## 7. Play Console — primeira publicação ⚠️

1. https://play.google.com/console → **Create app**
2. **App details:**
   - Nome: `Alertoo`
   - Idioma padrão: Português (Brasil)
   - Tipo: App
   - Free / Paid: Free
3. **Privacy policy URL:** publique o `PRIVACY_POLICY.md` (ex: GitHub Pages ou Termly) e cole a URL
4. **App content:**
   - **Data safety** → preencher conforme `DATA_SAFETY.md`
   - **Ads** → Sim, contém anúncios
   - **Content rating** → questionário (Teen)
   - **Target audience** → 13+
5. **Store listing:**
   - Ícone (já configurado em `assets/icon.png`)
   - Feature graphic 1024x500
   - 2-8 screenshots
   - Descrição curta (80 chars) + descrição completa
6. **Release:**
   - **Production** → **Create new release**
   - Upload do `.aab`
   - Release notes
   - **Review release** → **Start rollout to production**

## 8. Submit via EAS (alternativa)

```bash
eas submit --platform android --profile production
```

Lê o `eas.json` e sobe o `.aab` automaticamente. Requer `google-play-service-account.json` (criar em https://console.cloud.google.com/iam-admin/serviceaccounts).

## 9. Pós-publicação

- [ ] Configurar Firebase Crashlytics (já incluído via firebase package)
- [ ] Monitorar Play Console > **Vitals** (ANR / Crash rate < 1.09%)
- [ ] Configurar alertas no GCP Billing
- [ ] Próximo release: incrementar `versionCode` em `app.config.js` (campo `versionCode` em `android`) — o EAS faz isso automaticamente com `autoIncrement: true`
