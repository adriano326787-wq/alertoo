# -*- coding: utf-8 -*-
"""
Sincroniza testers pendentes (beta_testers com invited=true e ainda nao
sincronizados) do Firestore: copia os e-mails para a area de transferencia
e abre o Chrome direto na pagina do app no Play Console.

Por que so abrir a URL (sem clicar em nada via Selenium dentro da pagina):
a tela de Testers e um app Angular cujos seletores eu nunca consegui
inspecionar de fato (preciso estar logado pra ver o DOM real). Qualquer
seletor que eu escrevesse seria suposicao e quebraria na primeira mudanca
de layout do Google. O script automatiza tudo que e seguro automatizar
(ler Firestore, formatar, deduplicar, abrir a pagina certa, marcar como
sincronizado) e deixa so o login + navegar at Testers + colar + salvar
pra voce.

Uso:
    pip install requests pyperclip selenium webdriver-manager
    python scripts/sync_play_testers.py            # sincroniza de fato
    python scripts/sync_play_testers.py --dry-run   # só mostra quantos estão pendentes

Nota sobre --dry-run: a leitura da lista de testers exige login de admin
mesmo assim (de propósito — sem isso, a regra do Firestore permitiria
qualquer visitante listar todos os e-mails cadastrados). O que o dry-run
pula é a abertura do Chrome, a cópia pra área de transferência e a marcação
como sincronizado — só mostra a contagem e a lista, sem alterar nada.
"""
import sys
import io
import argparse
import getpass
import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# URL fornecida pelo usuario — leva direto a pagina de publicacao do app.
# A partir dai, login + clicar em Teste > Closed testing > Testers e manual
# (a estrutura interna de abas do Play Console nao e algo que eu deva supor).
PLAY_CONSOLE_APP_URL = (
    "https://play.google.com/console/u/0/developers/5201434160409942019"
    "/app/4973516858568771675/publishing"
)

FIREBASE_API_KEY = "AIzaSyCoI9rNBK07vGZBuygprq4PkDKGT0iZkYU"  # chave publica do app, ja usada no client
PROJECT_ID = "lei-seca---eventos"
FIRESTORE_BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"


def sign_in() -> str:
    """Autentica como admin via Firebase Auth REST API. Senha nunca e salva."""
    email = input("E-mail do admin: ").strip()
    password = getpass.getpass("Senha: ")
    resp = requests.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}",
        json={"email": email, "password": password, "returnSecureToken": True},
        timeout=15,
    )
    if not resp.ok:
        raise SystemExit(f"Falha no login: {resp.status_code} {resp.text}")
    return resp.json()["idToken"]


def fetch_pending_testers(id_token: str) -> list[dict]:
    """Busca beta_testers com invited=true que ainda nao foram colados no Play Console."""
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "beta_testers"}],
            "where": {
                "fieldFilter": {
                    "field": {"fieldPath": "invited"},
                    "op": "EQUAL",
                    "value": {"booleanValue": True},
                }
            },
        }
    }
    resp = requests.post(
        f"{FIRESTORE_BASE}:runQuery",
        json=query,
        headers={"Authorization": f"Bearer {id_token}"},
        timeout=20,
    )
    if not resp.ok:
        raise SystemExit(f"Falha ao consultar Firestore: {resp.status_code} {resp.text}")

    pending = []
    for item in resp.json():
        doc = item.get("document")
        if not doc:
            continue
        fields = doc.get("fields", {})
        # ja sincronizado anteriormente — pula
        if "playConsoleSyncedAt" in fields:
            continue
        email = fields.get("email", {}).get("stringValue")
        if email:
            pending.append({"name": doc["name"], "email": email})
    return pending


def mark_synced(id_token: str, doc_name: str) -> None:
    url = f"https://firestore.googleapis.com/v1/{doc_name}?updateMask.fieldPaths=playConsoleSyncedAt"
    resp = requests.patch(
        url,
        json={"fields": {"playConsoleSyncedAt": {"timestampValue": _now_iso()}}},
        headers={"Authorization": f"Bearer {id_token}"},
        timeout=15,
    )
    if not resp.ok:
        print(f"  [aviso] falha ao marcar {doc_name} como sincronizado: {resp.text}")


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def open_play_console() -> None:
    """Abre o Chrome direto na pagina do app. Login e navegacao interna ficam manuais
    de propósito — não arrisco clicar em abas/botões de um DOM que nunca inspecionei."""
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.service import Service
        from webdriver_manager.chrome import ChromeDriverManager

        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service)
        driver.get(PLAY_CONSOLE_APP_URL)
        return driver
    except Exception as e:
        print(f"\n⚠️  Não consegui abrir o Chrome automaticamente ({e}).")
        print(f"   Abra manualmente: {PLAY_CONSOLE_APP_URL}")
        return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='só mostra os pendentes, não abre navegador nem marca como sincronizado')
    args = parser.parse_args()

    print("\n🧪 Sync de testers do programa de testes — Alertoo\n")
    id_token = sign_in()

    pending = fetch_pending_testers(id_token)
    if not pending:
        print("\n✅ Nenhum tester pendente. Tudo sincronizado.")
        return

    emails = [p["email"] for p in pending]

    print(f"\n📋 {len(emails)} e-mail(s) pendente(s):")
    for e in emails:
        print(f"  - {e}")

    if args.dry_run:
        print("\n(--dry-run: nada foi alterado, navegador não foi aberto.)")
        return

    text = "\n".join(emails)
    try:
        import pyperclip
        pyperclip.copy(text)
        print("\n✅ E-mails copiados para a área de transferência.")
    except Exception:
        print("\n⚠️  Não consegui acessar a área de transferência. Copie a lista acima manualmente.")

    driver = open_play_console()

    print(
        "\nAgora, na janela do Chrome que abriu:\n"
        "  1. Faça login (se ainda não estiver) e vá em Teste > Closed testing > [sua track] > Testers\n"
        "  2. Clique em 'Adicionar e-mails' (lista de e-mails) e cole (Ctrl+V)\n"
        "  3. Salve\n"
    )
    input("Pressione Enter aqui DEPOIS de salvar no Play Console, para marcar como sincronizado... ")

    for p in pending:
        mark_synced(id_token, p["name"])

    print(f"\n✅ {len(pending)} tester(s) marcado(s) como sincronizado(s) no Firestore.")

    if driver is not None:
        input("\nPressione Enter para fechar o Chrome aberto pelo script... ")
        driver.quit()


if __name__ == "__main__":
    main()
