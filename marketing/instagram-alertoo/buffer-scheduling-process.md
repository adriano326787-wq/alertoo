# Processo: Agendamento de Posts no Buffer via Claude

## Visão Geral

Este documento descreve o processo automatizado para agendar posts do Alertoo no Buffer usando o Claude (Cowork mode) com a extensão Claude in Chrome.

---

## Pré-requisitos

- **Buffer** aberto em `publish.buffer.com` com o canal Instagram `alertoo.app` selecionado
- **Extensão Claude in Chrome** conectada ao navegador
- **Imagens prontas** em `images/post-01.png` ... `post-30.png`
- **Legendas prontas** em `feed-posts.md`

---

## Processo Passo a Passo

### Para cada post (repetir):

1. **Abrir o composer**
   - Clicar em "+ New Post" (canto superior direito do Buffer)

2. **Localizar o campo de texto via `find`**
   ```
   find: "composer textbox Start writing"
   → retorna ref_XXXX
   ```

3. **Clicar no campo e digitar a legenda**
   ```
   left_click ref_XXXX
   type: [legenda completa com hashtags]
   ```

4. **Localizar o input de arquivo via `find`**
   ```
   find: "file input select to upload"
   → retorna ref_YYYY
   ```

5. **Fazer upload da imagem**
   ```
   file_upload:
     ref: ref_YYYY
     path: C:\Users\adria\road-events\marketing\instagram-alertoo\images\post-XX.png
   ```

6. **Localizar o botão de agendar via `find`**
   ```
   find: "Schedule Post button"
   → retorna ref_ZZZZ
   ```
   > ⚠️ Sempre buscar ref novo — após agendar o DOM é atualizado e refs anteriores ficam inválidos.

7. **Clicar em Schedule Post**
   ```
   left_click ref_ZZZZ
   ```

8. **Confirmar agendamento** — banner "Your post has been added to your queue" aparece.

---

## Limite do Plano Free

- **Buffer Free:** máximo de **10 posts na fila** simultaneamente
- Quando a fila enche (Queue 10), não é possível adicionar mais
- Solução: aguardar posts serem publicados para liberar slots, ou fazer upgrade para o plano Essentials (~$6/mês)

---

## Erros Conhecidos e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| Click redireciona para Analytics | Coordenadas fixas clicando em link errado | Usar `find` + `ref` em vez de coordenadas |
| "Please include an image" | Instagram exige imagem | Sempre fazer upload antes de clicar Schedule |
| Ref inválido após agendar | DOM atualizado após cada post | Buscar novo ref com `find` a cada iteração |
| "0 Posts left" | Limite do plano Free atingido | Aguardar publicações ou fazer upgrade |

---

## Canal Buffer

- **Profile:** alertoo.app — Instagram "Sao Paulo"
- **Channel ID:** `6a3f2e2f5ab6d2f106785cd0`
- **URL:** `https://publish.buffer.com/channels/6a3f2e2f5ab6d2f106785cd0/schedule`

---

## Status dos Posts (atualizado em 27/06/2026)

| Posts | Status |
|-------|--------|
| #01 — #10 | ✅ Agendados (sessão anterior) |
| #11 — #12 | ✅ Agendados (sessão atual) |
| #13 — #30 | ⏳ Aguardando slots na fila |
| Stories #01 — #30 | ⏳ Não agendados ainda |

---

## Comando para Retomar

Quando houver slots disponíveis, pedir ao Claude:
> "claude, adicione mais X posts no buffer a partir do post #13"

As imagens e legendas já estão prontas — basta continuar de onde parou.
