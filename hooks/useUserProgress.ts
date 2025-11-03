'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { toYMD } from '@/utils/date';

type DayStat = { date: string; count: number; avg: number };

export function useUserProgress() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<Array<{ date: string; score: number }>>([]);
  const [attemptsToday, setAttemptsToday] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setDocs([]); setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
        const colRef = collection(db, 'users', user.uid, 'user_sentences');
        const snap = await getDocs(colRef);
        if (cancelled) return;
        const rows = snap.docs.map(d => d.data() as any).map(v => ({
          date: typeof v.date === 'string' ? v.date : toYMD(new Date(v.lastPracticedAt ?? Date.now())),
          score: typeof v.score === 'number' ? v.score : 0,
        }));
        setDocs(rows);

        // Load attempts for today from stats doc
        try {
          const todayKey = toYMD();
          const sref = doc(db, 'users', user.uid, 'stats', todayKey);
          const sdoc = await getDoc(sref);
          const attempts = (sdoc.data() as any)?.attempts || 0;
          setAttemptsToday(attempts);
        } catch {}
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load progress');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const r of docs) {
      const key = r.date;
      const v = map.get(key) ?? { sum: 0, count: 0 };
      v.sum += r.score;
      v.count += 1;
      map.set(key, v);
    }
    const arr: DayStat[] = Array.from(map.entries()).map(([date, v]) => ({ date, count: v.count, avg: v.count ? v.sum / v.count : 0 }));
    arr.sort((a, b) => a.date.localeCompare(b.date));
    return arr;
  }, [docs]);

  const totals = useMemo(() => {
    const totalPracticed = docs.length;
    const avgScore = totalPracticed ? docs.reduce((s, r) => s + r.score, 0) / totalPracticed : 0;
    const today = toYMD();
    const todayGroup = grouped.find(g => g.date === today);
    const todayCount = attemptsToday || (todayGroup?.count ?? 0);
    const todayAvgScore = todayGroup?.avg ?? 0;
    // Basic streak: consecutive days ending today with at least one practice
    let streak = 0;
    const daysSet = new Set(grouped.map(g => g.date));
    const d = new Date();
    for (;;) {
      const key = toYMD(d);
      if (daysSet.has(key)) { streak++; d.setDate(d.getDate() - 1); } else { break; }
    }
    return { totalPracticed, avgScore, todayCount, todayAvgScore, streak };
  }, [docs, grouped, attemptsToday]);

  const last7 = useMemo(() => {
    // Last 7 calendar days including today
    const out: DayStat[] = [];
    const byDate = new Map(grouped.map(g => [g.date, g] as const));
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const key = toYMD(d);
      const g = byDate.get(key);
      out.unshift({ date: key.slice(5), count: g?.count ?? 0, avg: g?.avg ?? 0 });
      d.setDate(d.getDate() - 1);
    }
    return out;
  }, [grouped]);

  return { loading, error, user, grouped, last7, ...totals };
}


