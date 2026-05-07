import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types/user';

const USERS = 'users';

export async function getOrCreateUserProfile(
  uid: string,
  defaults: Partial<Pick<UserProfile, 'displayName' | 'email' | 'phone' | 'photoURL'>>
): Promise<UserProfile> {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return docToProfile(snap.id, snap.data());
  }

  const newDoc = {
    displayName: defaults.displayName ?? 'Usuário',
    email: defaults.email ?? null,
    phone: defaults.phone ?? null,
    photoURL: defaults.photoURL ?? null,
    points: 0,
    eventsReported: 0,
    commentsPosted: 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, newDoc);
  return { uid, ...newDoc, createdAt: Date.now() };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  return docToProfile(snap.id, snap.data());
}

export async function awardPoints(
  uid: string,
  points: number,
  statField?: 'eventsReported' | 'commentsPosted'
): Promise<void> {
  const update: Record<string, any> = { points: increment(points) };
  if (statField) update[statField] = increment(1);
  await updateDoc(doc(db, USERS, uid), update);
}

function docToProfile(uid: string, d: Record<string, any>): UserProfile {
  return {
    uid,
    displayName: d.displayName ?? 'Usuário',
    email: d.email ?? null,
    phone: d.phone ?? null,
    photoURL: d.photoURL ?? null,
    points: d.points ?? 0,
    eventsReported: d.eventsReported ?? 0,
    commentsPosted: d.commentsPosted ?? 0,
    createdAt: (d.createdAt as Timestamp)?.toMillis() ?? Date.now(),
  };
}
