import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─── Admins fixos (sempre funcionam, independente do Firestore) ───────────────
const HARDCODED_ADMINS = [
  'adrianosethi@hotmail.com',
];
// ─────────────────────────────────────────────────────────────────────────────

// Cache isolado por UID — evita vazamento de permissão entre sessões de usuários diferentes
let _cachedUid: string | null = null;
let _cachedIsAdmin: boolean | null = null;

export async function checkIsAdmin(email: string | null | undefined, uid?: string | null): Promise<boolean> {
  if (!email) return false;
  // Invalida o cache se o UID mudou (novo login após logout)
  if (uid && uid !== _cachedUid) {
    _cachedIsAdmin = null;
    _cachedUid = uid;
  }
  if (_cachedIsAdmin !== null) return _cachedIsAdmin;

  const emailLower = email.toLowerCase();

  // 1. Verifica lista hardcoded primeiro (funciona sem Firestore)
  if (HARDCODED_ADMINS.map((e) => e.toLowerCase()).includes(emailLower)) {
    _cachedIsAdmin = true;
    // Garante que o documento existe no Firestore em background
    ensureAdminDoc(email).catch(() => {});
    return true;
  }

  // 2. Verifica no Firestore (para admins adicionados pelo Console)
  try {
    const snap = await getDoc(doc(db, 'config', 'admins'));
    if (snap.exists()) {
      const emails: string[] = snap.data()?.emails ?? [];
      _cachedIsAdmin = emails.map((e) => e.toLowerCase()).includes(emailLower);
      return _cachedIsAdmin;
    }
  } catch {
    // Firestore indisponível ou sem permissão — usa apenas hardcoded
  }

  _cachedIsAdmin = false;
  return false;
}

export function clearAdminCache() {
  _cachedIsAdmin = null;
  _cachedUid = null;
}

// Cria/atualiza o documento config/admins com os admins hardcoded
async function ensureAdminDoc(email: string) {
  const ref = doc(db, 'config', 'admins');
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, { emails: HARDCODED_ADMINS });
  } else {
    const existing: string[] = snap.data()?.emails ?? [];
    if (!existing.map((e) => e.toLowerCase()).includes(email.toLowerCase())) {
      await setDoc(ref, { emails: [...existing, email] }, { merge: true });
    }
  }
}
