# Web — Landing + Universal Links

Esta pasta contém os arquivos que precisam ser hospedados em `https://alertoo.app` para:

1. **Smart redirect** — link compartilhado abre o app se instalado, senão Play Store
2. **Android App Links** — `https://alertoo.app/evento/*` abre nativamente no app (sem confirmação do usuário)
3. **iOS Universal Links** — mesmo comportamento no iPhone
4. **Open Graph preview** — WhatsApp/Twitter/Telegram mostram card rico ao compartilhar

## 📁 Estrutura

```
web/
├── index.html                        ← landing + smart redirect
├── .well-known/
│   ├── assetlinks.json               ← Android App Links verification
│   └── apple-app-site-association    ← iOS Universal Links (criar quando publicar iOS)
└── README.md                         ← este arquivo
```

## 🚀 Deploy (Vercel — recomendado, free tier)

1. Compre o domínio `alertoo.app` (ex: Namecheap, Registro.br)
2. `npm i -g vercel` e `vercel` na pasta `web/`
3. Conecte o domínio no Vercel (Settings → Domains)
4. **Importante**: garanta que `/.well-known/assetlinks.json` é servido com `Content-Type: application/json`

### Alternativa — Netlify
```bash
cd web
npx netlify-cli deploy --prod
```

### Alternativa — GitHub Pages
1. Cria um repo `alertoo-web`
2. Push da pasta `web/` para `main`
3. Settings → Pages → Branch: main
4. Configure `CNAME` apontando pra `alertoo.app`

## 🔐 Atualizar `assetlinks.json` com keystore de PRODUÇÃO

O arquivo atual tem o SHA-256 da **debug keystore**:
```
FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
```

Quando gerar a release keystore própria, extraia o SHA-256 com:
```bash
keytool -list -v -keystore alertoo-release.keystore -alias alertoo
```

E **adicione** ao array `sha256_cert_fingerprints` em `assetlinks.json` (pode ter múltiplos — debug + release):
```json
"sha256_cert_fingerprints": [
  "FA:C6:17:...:9C",  ← debug (já está)
  "AB:CD:EF:...:12"   ← release (adicionar)
]
```

## 🧪 Validar Android App Links

Após hospedar, valide com:
- https://developers.google.com/digital-asset-links/tools/generator
- Cole `https://alertoo.app` + package `com.alertoo.app` + SHA-256
- Tool dá link de validação ao vivo

Ou via ADB:
```bash
adb shell pm verify-app-links --re-verify com.alertoo.app
adb shell pm get-app-links com.alertoo.app
```

## 📊 Open Graph image

Crie uma imagem `og-image.png` (1200×630px) com o logo + tagline e hospede em `/og-image.png`. Editáveis em Figma/Canva.
