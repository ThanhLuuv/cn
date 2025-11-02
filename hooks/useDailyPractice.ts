'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { fetchSentencesByTopic, fetchYesterdaySentences, fetchUserProgress } from '@/lib/firestore';
import { pickDailySet } from '@/services/scheduler';

export function useDailyPractice() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(authLoading);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch sentences from all topics
        const topics = ['greetings', 'introductions', 'daily-life', 'shopping', 'food'];
        const allSentences: any[] = [];
        for (const topic of topics) {
          try {
            const sents = await fetchSentencesByTopic(topic, 100);
            allSentences.push(...sents);
          } catch (e) {
            // Skip if topic doesn't exist
          }
        }

        // Fetch yesterday's progress
        const yesterdayProgress = await fetchYesterdaySentences(user.uid);
        const yesterdayIds = new Set(yesterdayProgress.map(p => p.sentenceId));

        // Get 5 from yesterday (worst scored first)
        const review5 = yesterdayProgress.slice(0, 5)
          .map(p => allSentences.find(s => s.id === p.sentenceId))
          .filter(Boolean) as any[];

        // Get all progress to identify new sentences
        const allProgress = await fetchUserProgress(user.uid, allSentences.map(s => s.id));
        const learnedIds = new Set(allProgress.map(p => p.sentenceId));
        const newSentences = allSentences.filter(s => !learnedIds.has(s.id));
        
        // Shuffle and pick random new ones
        const shuffled = [...newSentences].sort(() => Math.random() - 0.5);
        const new5 = shuffled.slice(0, 5);

        // Combine: review first, then fill with new to get 10 total
        const finalSet: any[] = [...review5];
        // Add new sentences that aren't already in review
        const reviewIds = new Set(review5.map(s => s.id));
        for (const newSent of new5) {
          if (finalSet.length >= 10) break;
          if (!reviewIds.has(newSent.id)) {
            finalSet.push(newSent);
          }
        }
        // If still not enough, add more new sentences
        if (finalSet.length < 10) {
          for (const newSent of shuffled) {
            if (finalSet.length >= 10) break;
            if (!reviewIds.has(newSent.id) && !finalSet.find(s => s.id === newSent.id)) {
              finalSet.push(newSent);
            }
          }
        }
        
        // Shuffle the final set so it's not always review first
        const shuffledFinal = [...finalSet].sort(() => Math.random() - 0.5);

        setItems(shuffledFinal);
      } catch (e: any) {
        console.error('useDailyPractice error:', e);
        setError(e?.message || 'Failed to load practice sentences');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  return { items, loading, error };
}

