# Data Safety Form — Google Play Console

Use este documento para preencher a seção **"Data safety"** no Play Console (Política → Segurança de dados).

---

## 🔍 Data collection

**Does your app collect or share any of the required user data types?** ✅ Yes

### Data types collected

#### 📍 Location
- ✅ **Approximate location** — Coletada (Required • Optional → **Optional**)
  - Finalidade: App functionality • Analytics
  - Compartilhada com terceiros? **No**
  - Coletada de forma efêmera? **No** (persistida no Firestore para reverse geocoding)
- ✅ **Precise location** — Coletada (Required • Optional → **Optional**)
  - Finalidade: App functionality
  - Compartilhada com terceiros? **No**
  - Coletada de forma efêmera? **Yes** (usada apenas em foreground, não persistida)

#### 👤 Personal info
- ✅ **Name** — Coletada (Optional)
- ✅ **Email address** — Coletada (Required)
- ✅ **User IDs** — Coletada (Required • Firebase UID)
  - Finalidade: Account management

#### 📷 Photos and videos
- ✅ **Photos** — Coletada (Optional)
  - Finalidade: App functionality (foto de perfil + foto de promoção)
  - Compartilhada? **No**

#### 💳 Financial info
- ✅ **Purchase history** — Coletada (Required)
  - Finalidade: App functionality
  - Compartilhada com Mercado Pago? **Yes** (processamento)

#### 📱 App info and performance
- ✅ **Crash logs** — Coletada (Required)
- ✅ **Diagnostics** — Coletada (Required)

#### 📊 App activity
- ✅ **App interactions** — Coletada (Optional, para analytics)
- ✅ **In-app search history** — Não coletada
- ✅ **User-generated content** — Coletada (Required: eventos e comentários criados)

---

## 🔒 Security practices

- ✅ **Data is encrypted in transit** (HTTPS/TLS para todas as APIs)
- ✅ **You can request that data be deleted** (botão "Excluir conta" no app)
- ✅ **Committed to Play Families Policy** → Marcar **Not applicable** (app não é direcionado a crianças)
- ✅ **Independent security review** → **No** (a menos que faça auditoria externa)

---

## 📝 Permissions Declaration

### Background location
❌ **NÃO solicitado** — confirmar no manifest.

### Foreground location
✅ Justificativa para o Play:
> "Alertoo uses your location only while the app is open to: (1) display nearby road alerts and events on a map, (2) let you report incidents within a 1 km radius of your current location, and (3) send local notifications about nearby events. The location is never collected in the background and never sent to third parties."

### SYSTEM_ALERT_WINDOW (overlay)
🚨 **Atenção:** Se essa permissão não for essencial, **remova do AndroidManifest.xml**. Caso seja necessária:
> Justificativa: "Required by [biblioteca X] to display Y."

Se vier de uma lib que você não usa diretamente, é melhor adicionar ao manifest:
```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"/>
```

---

## 💸 Ads

✅ **Yes** — App contains ads (Google AdMob)

### Target audience
- Idade mínima: **13+**
- Conteúdo: **Teen** (eventos podem mencionar bebidas)

---

## ⚙️ Como preencher

1. Acesse: https://play.google.com/console
2. Selecione **Alertoo** → **Policy and programs** → **App content** → **Data safety**
3. Clique em **Manage** e siga o questionário
4. Preencha cada seção conforme este documento
5. Salve como rascunho e revise antes de **Submit**

---

## 🎯 Content rating questionnaire

Recomendado: marcar
- **Violence**: None
- **Sexual content**: None
- **Profanity**: Mild (usuários podem postar comentários)
- **Controlled substances**: References (eventos como "Lei Seca" mencionam álcool)
- **Gambling**: None
- **User-generated content**: ✅ Yes (com moderação)

Classificação esperada: **PEGI 12 / ESRB Teen / Brasil 12 anos**
