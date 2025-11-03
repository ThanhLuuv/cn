import { db } from './firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, serverTimestamp, increment } from 'firebase/firestore';

export const ensureUserDoc = async (uid: string, payload: any) => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...payload, createdAt: Date.now(), updatedAt: Date.now() });
  }
};

export const fetchSentencesByTopic = async (topic: string, limitCount = 20) => {
  const q = query(collection(db, 'sentences'), where('topic', '==', topic));
  const s = await getDocs(q);
  return s.docs.slice(0, limitCount).map(d => ({ id: d.id, ...d.data() }));
};

// Save user sentence progress
export const saveUserSentenceProgress = async (uid: string, sentenceId: string, score: number, metrics?: { accuracy?: number; fluency?: number; prosody?: number; completeness?: number }) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const ref = doc(db, 'users', uid, 'user_sentences', sentenceId);
  const snap = await getDoc(ref);
  const existing = snap.data();
  await setDoc(ref, {
    sentenceId,
    score,
    accuracy: metrics?.accuracy,
    fluency: metrics?.fluency,
    prosody: metrics?.prosody,
    completeness: metrics?.completeness,
    date: today,
    timesPracticed: (existing?.timesPracticed || 0) + 1,
    lastPracticedAt: serverTimestamp(),
    createdAt: existing?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  // Increment today's attempt counter
  const statsRef = doc(db, 'users', uid, 'stats', today);
  await setDoc(statsRef, { date: today, attempts: increment(1), updatedAt: serverTimestamp(), createdAt: serverTimestamp() }, { merge: true });
};

// Fetch user progress for sentences
export const fetchUserProgress = async (uid: string, sentenceIds: string[]) => {
  if (!sentenceIds.length) return [];
  const progressDocs = await Promise.all(sentenceIds.map(id => getDoc(doc(db, 'users', uid, 'user_sentences', id))));
  return progressDocs.map(d => d.exists() ? { sentenceId: d.id, ...d.data() } : null).filter(Boolean) as any[];
};

// Fetch yesterday's practiced sentences (doc ID is sentenceId)
export const fetchYesterdaySentences = async (uid: string) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  const q = query(
    collection(db, 'users', uid, 'user_sentences'),
    where('date', '==', dateStr)
  );
  const s = await getDocs(q);
  const results = s.docs.map(d => ({ sentenceId: d.id, ...d.data() } as any));
  // Sort by score ascending (worst first) for review priority
  return results.sort((a, b) => (a.score || 0) - (b.score || 0));
};

// Fetch topic name by key
export const fetchTopicName = async (topicKey: string): Promise<string | null> => {
  try {
    if (!topicKey) return null;
    const topicsQuery = query(collection(db, 'topics'), where('key', '==', topicKey));
    const snapshot = await getDocs(topicsQuery);
    if (!snapshot.empty) {
      const topicData = snapshot.docs[0].data();
      const name = topicData.name;
      console.log(`Fetched topic name for "${topicKey}":`, name);
      return name || null;
    }
    console.warn(`Topic "${topicKey}" not found in Firestore`);
    return null;
  } catch (e) {
    console.error('Failed to fetch topic name:', e);
    return null;
  }
};


