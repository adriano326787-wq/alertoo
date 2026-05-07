import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─── Admins fixos (sempre funcionam, independente do Firestore) ───────────────
const HARDCODED_ADMINS = [
  'adrianosethi@hotmail.com',
];
// ─────────────────────────────────────────────────────────────────────────────

let cachedIsAdmin: boolean | null = null;

export async function checkIsAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  if (cachedIsAdmin !== null) return cachedIsAdmin;

  const emailLower = email.toLowerCase();

  // 1. Verifica lista hardcoded primeiro (funciona sem Firestore)
  if (HARDCODED_ADMINS.map((e) => e.toLowerCase()).includes(emailLower)) {
    cachedIsAdmin = true;
    // Garante que o documento existe no Firestore em background
    ensureAdminDoc(email).catch(() => {});
    return true;
  }

  // 2. Verifica no Firestore (para admins adicionados pelo Console)
  try {
    const snap = await getDoc(doc(db, 'config', 'admins'));
    if (snap.exists()) {
      const emails: string[] = snap.data()?.emails ?? [];
      cachedIsAdmin = emails.map((e) => e.toLowerCase()).includes(emailLower);
      return cachedIsAdmin;
    }
  } catch {
    // Firestore indisponível ou sem permissão — usa apenas hardcoded
  }

  cachedIsAdmin = false;
  return false;
}

export function clearAdminCache() {
  cachedIsAdmin = null;
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
