export type UserDoc = {
  uid: string;
  name?: string;
  email: string;
  streak: number;
  lastStudyDate?: string;
  topicsLearned?: string[];
  createdAt: number;
  updatedAt: number;
};

export type SentenceDoc = {
  id: string;
  topic: string;
  vi: string;
  pinyin: string;
  zh: string;
  audioUrl?: string;
  level?: number;
  createdAt?: number;
};

export type UserSentenceProgress = {
  sentenceId: string;
  date: string; // YYYY-MM-DD
  score: number; // 0..1
  timesPracticed?: number;
  lastPracticedAt?: number;
};


