/**
 * Engajamento adaptativo com pop-ups — usuário que sempre confirma/reporta
 * mantém a frequência normal de prompts; quem sempre ignora/fecha vai
 * recebendo prompts cada vez mais raramente (sem desaparecer totalmente).
 *
 * Score fica em AsyncStorage (decisão local, sem round-trip de rede pra
 * cada prompt) e é espelhado no Firestore (fire-and-forget, só analytics —
 * não é lido de volta por aqui).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { captureError } from './sentry';
import {
  nextEngagementScore,
  adaptiveCooldownMs,
  DEFAULT_ENGAGEMENT_SCORE,
  PromptOutcome,
} from '../utils/promptEngagementScoring';

const SCORE_KEY = '@alertoo_prompt_engagement_score';

let cachedScore: number | null = null;

export async function getEngagementScore(): Promise<number> {
  if (cachedScore !== null) return cachedScore;
  try {
    const raw = await AsyncStorage.getItem(SCORE_KEY);
    cachedScore = raw ? Number(raw) : DEFAULT_ENGAGEMENT_SCORE;
    if (!isFinite(cachedScore)) cachedScore = DEFAULT_ENGAGEMENT_SCORE;
  } catch {
    cachedScore = DEFAULT_ENGAGEMENT_SCORE;
  }
  return cachedScore;
}

export async function recordPromptOutcome(outcome: PromptOutcome): Promise<void> {
  try {
    const current = await getEngagementScore();
    const next = nextEngagementScore(current, outcome);
    cachedScore = next;
    await AsyncStorage.setItem(SCORE_KEY, String(next));

    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(doc(db, 'users', uid), { promptEngagementScore: next }, { merge: true })
        .catch((e) => captureError(e, { where: 'promptEngagement.mirrorToFirestore' }));
    }
  } catch (e) {
    captureError(e, { where: 'promptEngagement.recordPromptOutcome' });
  }
}

/** Cooldown base ajustado pelo score de engajamento atual do usuário. */
export async function getAdaptiveCooldownMs(baseCooldownMs: number): Promise<number> {
  const score = await getEngagementScore();
  return adaptiveCooldownMs(baseCooldownMs, score);
}
