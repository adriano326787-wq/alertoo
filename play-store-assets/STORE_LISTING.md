# Alertoo — Conteúdo para o Google Play Console

Cole os blocos abaixo nos respectivos campos do Play Console.
Limites oficiais do Google estão indicados ao lado de cada item.

---

## 1. App details

**App name** (máx 30 caracteres)
```
Alertoo
```

**Short description** (máx 80 caracteres)
```
Alertas de trânsito em tempo real e descoberta de eventos perto de você.
```
> 71 caracteres

---

## 2. Full description (máx 4000 caracteres)

```
Alertoo é o app brasileiro de avisos colaborativos de trânsito e descoberta
de eventos perto de você. Veja em tempo real onde tem blitz, acidente,
alagamento, obra — e o que está rolando de bom na sua cidade hoje.

🗺️ MAPA EM TEMPO REAL
• Veja blitz da Lei Seca, acidentes, alagamentos e obras perto de você.
• Pins coloridos por categoria — entenda tudo em 1 segundo.
• Bares, restaurantes, shows e festivais também aparecem no mapa.

🚦 REPORTE EM 1 TOQUE
• Reporte uma blitz ou um acidente em segundos, sem cadastro complicado.
• Sua localização é usada apenas com o app aberto — nunca em segundo plano.
• Ajude outros motoristas e ganhe pontos no ranking da semana.

🎉 EVENTOS PERTO DE VOCÊ
• Descubra bares, shows, festivais e festas na sua região.
• Filtre por categoria, distância ou horário.
• Salve seus favoritos e receba lembretes.

✅ COMUNIDADE QUE FUNCIONA
• Confirme ou negue alertas — eventos com muitas negações somem do mapa.
• Comente, curta e compartilhe.
• Sistema de reputação premia quem ajuda mais (Iniciante → Vigia → Lenda).

🥇 PROMOVA SEU EVENTO OU NEGÓCIO
• Pacotes Bronze, Prata e Ouro a partir de R$ 4,99.
• Apareça em destaque com foto, animação e tag colorida.
• Promova bares, restaurantes, eventos privados e mais.
• Ganhe créditos grátis assistindo a anúncios.

🧭 ROTA DIRETA NO GPS
• Toque em qualquer evento e abra direto no Google Maps ou Waze.
• Saiba a hora, a distância e o que esperar antes de sair de casa.

🔒 PRIVACIDADE EM PRIMEIRO LUGAR
• Sua localização nunca é coletada em segundo plano.
• Não vendemos dados — nem temos como.
• Em conformidade com a LGPD (Brasil) e GDPR (Europa).
• Política de privacidade transparente: https://lei-seca---eventos.web.app/privacidade

💬 IDIOMAS
Português, Inglês, Espanhol, Francês — escolha no app.

📱 100% GRATUITO
O Alertoo é gratuito. As promoções pagas servem para divulgar seu negócio
ou evento — o uso normal do app, criação de alertas, comentários e mapa
são totalmente sem custo.

🌎 FUNCIONA EM TODO O BRASIL
Foco inicial em Niterói e Rio de Janeiro, mas o Alertoo funciona em
qualquer cidade do país. Comece a usar e seja o primeiro da sua região!

—

Tem sugestão? Encontrou um bug? Fale com a gente:
adrianosethi@hotmail.com

Política de privacidade:
https://lei-seca---eventos.web.app/privacidade
```

> ~2050 caracteres (caberia bem mais, mas concisão converte melhor)

---

## 3. Release notes (máx 500 caracteres por idioma)

### pt-BR
```
🎉 Primeira versão pública do Alertoo!

• Mapa colaborativo de blitz, acidentes, alagamentos e obras
• Descoberta de bares, shows e festivais perto de você
• Sistema de reputação e ranking semanal
• Promoção paga para negócios e eventos (Bronze, Prata, Ouro)
• Disponível em português, inglês, espanhol e francês
• Conforme LGPD e GDPR — sua privacidade em primeiro lugar
```

### en-US
```
🎉 First public release of Alertoo!

• Live map of police checkpoints, accidents, floods, road works
• Discover bars, concerts and festivals near you
• Reputation system and weekly leaderboard
• Paid promotion for businesses and events (Bronze, Silver, Gold)
• Available in Portuguese, English, Spanish and French
• LGPD & GDPR compliant — privacy first
```

---

## 4. Categorização

| Campo | Valor |
|---|---|
| Application type | App |
| Category | **Maps & Navigation** (recomendado) ou **Travel & Local** |
| Tags | maps, traffic, alerts, community, events |
| Email do desenvolvedor | adrianosethi@hotmail.com |
| Website | https://lei-seca---eventos.web.app |
| Telefone (opcional) | (preencher se desejar) |

---

## 5. Content rating questionnaire — respostas sugeridas

| Pergunta | Resposta |
|---|---|
| Violência | Nenhuma |
| Conteúdo sexual | Nenhuma |
| Linguagem vulgar | Leve (usuários podem postar comentários) |
| Substâncias controladas | Referências (Lei Seca menciona álcool) |
| Apostas | Nenhuma |
| User-generated content | ✅ Sim — com moderação por votação |
| Compartilha localização | ✅ Sim — apenas em foreground |
| Permite interação | ✅ Sim — comentários e votos |
| Compartilha conteúdo do usuário | Apenas dentro do app, com outros usuários |
| Acesso digital | App padrão |

**Classificação esperada:** Livre (Brasil) / PEGI 3-7 / ESRB Everyone 10+

---

## 6. Target audience

| Campo | Valor |
|---|---|
| Faixa etária alvo | **13+** (Teen) |
| Direcionado a crianças? | ❌ Não |
| Anúncios? | ✅ Sim — Google AdMob |

---

## 7. Data safety (Política → Segurança de dados)

Veja `DATA_SAFETY.md` para mapeamento completo. Resumo:

✅ Coleta:
- Localização aproximada e precisa (apenas em foreground, opcional)
- Nome, e-mail, foto de perfil (opcionais)
- Fotos (eventos/promoções que o usuário publica)
- Histórico de compras (créditos de promoção)
- Logs de erro, diagnóstico (Sentry)

❌ Não coleta:
- Contatos, mensagens, áudio, calendário, arquivos pessoais
- Localização em segundo plano

🔒 Segurança:
- HTTPS/TLS em todas as comunicações
- Senhas gerenciadas pelo Firebase Authentication
- Cartões processados pelo Mercado Pago (PCI-DSS)
- Possibilidade de excluir conta a qualquer momento

---

## 8. Assets visuais — checklist

| Asset | Tamanho | Arquivo |
|---|---|---|
| App icon | 512×512 px (PNG, sem transparência) | `assets/icon.png` (já em 1024×1024 — Play redimensiona) |
| Feature graphic | 1024×500 px | `play-store-assets/feature-graphic-1024x500.png` |
| Phone screenshots | 1080×1920 px (mín 2, máx 8) | `play-store-assets/screenshots/01..05` |
| Tablet screenshots (opcional) | 1200×1920 px | — |
| TV banner (não aplicável) | — | — |
| Promo video (opcional) | YouTube URL | — |

---

## 9. App Bundle

| Item | Valor |
|---|---|
| Caminho do AAB | `android/app/build/outputs/bundle/release/app-release.aab` |
| Tamanho | ~34 MB |
| versionCode | 1 |
| versionName | 1.0.0 |
| Mín SDK | (definido pelo Expo SDK 54 — Android 7.0+) |
| Target SDK | (Expo SDK 54 — Android 15) |
| Assinado com | Keystore de produção `alertoo-release.keystore` |

---

## 10. Privacy & Permissions justification

### Foreground location (cole no campo "Justification")
```
Alertoo uses your location only while the app is open to:
(1) display nearby road alerts and events on a map,
(2) let you report incidents within a 1 km radius of your current location,
(3) send local notifications about nearby events.

The location is never collected in the background and never sent to third
parties. The app shows clear in-context permission prompts and works even
if the user denies the location permission (degraded experience).
```

### Background location
❌ Not requested.

### AD_ID (Advertising ID)
```
Used only by Google AdMob to serve relevant ads.
Users can reset or limit this ID via Android Settings → Google → Ads.
```

---

## 11. Pricing & distribution

| Campo | Valor |
|---|---|
| Free / Paid | **Free** (com compras dentro do app) |
| Países | **Todos** (recomendado) ou apenas Brasil para teste |
| Compras dentro do app | ✅ Sim — pacotes de créditos R$ 4,99 a R$ 59,99 |
| Contém anúncios | ✅ Sim |

---

## 12. Próximos passos

1. Acesse https://play.google.com/console
2. **Create app** → cole "Alertoo" + idioma "Português (Brasil)"
3. **App content** → preencha cada seção com este documento
4. **Main store listing** → cole textos + suba os assets visuais
5. **Production** → **Create new release** → suba o AAB
6. **Review release** → **Start rollout to production**

Antes de submeter, faça um **Internal testing** com 1-2 contas de teste
para garantir que tudo funciona em produção (Google Sign-In, pagamentos,
AdMob).
