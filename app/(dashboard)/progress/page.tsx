'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import TopHeader from '@/components/dashboard/TopHeader';
import { collection, query, orderBy, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchTopicName } from '@/lib/firestore';

type ProgressItem = {
  sentenceId: string;
  score: number;
  accuracy?: number;
  fluency?: number;
  prosody?: number;
  completeness?: number;
  date: string;
  timesPracticed: number;
  lastPracticedAt: any;
  sentence?: {
    zh: string;
    pinyin: string;
    vi: string;
    topic: string;
  };
};

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(authLoading);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'users', user.uid, 'user_sentences'),
          orderBy('lastPracticedAt', 'desc')
        );
        const snap = await getDocs(q);
        const items: ProgressItem[] = [];
        
        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          // Fetch sentence details
          let sentenceData = null;
          try {
            const sentDoc = await getDoc(doc(db, 'sentences', docSnap.id));
            if (sentDoc.exists()) {
              sentenceData = sentDoc.data();
              // Resolve topic key to human-friendly name if available
              if (sentenceData?.topic) {
                try {
                  const name = await fetchTopicName(sentenceData.topic as string);
                  if (name) sentenceData.topic = name;
                } catch {}
              }
            }
          } catch (e) {
            throw e;
          }

          items.push({
            sentenceId: docSnap.id,
            score: data.score || 0,
            accuracy: data.accuracy,
            fluency: data.fluency,
            prosody: data.prosody,
            completeness: data.completeness,
            date: data.date || '',
            timesPracticed: data.timesPracticed || 1,
            lastPracticedAt: data.lastPracticedAt,
            sentence: sentenceData ? {
              zh: sentenceData.zh || '',
              pinyin: sentenceData.pinyin || '',
              vi: sentenceData.vi || '',
              topic: sentenceData.topic || '',
            } : undefined,
          });
        }

        setProgress(items);
      } catch (e: any) {
        throw e;
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <>
        <TopHeader title="Lịch sử luyện tập" showBack />
        <main className="grid min-h-[calc(100dvh-64px)] place-items-center">
          <Loader2 className="animate-spin" width={28} height={28} color={'var(--sub)'} />
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <TopHeader title="Lịch sử luyện tập" showBack />
        <main className="mx-auto max-w-3xl p-6">
          <p className="text-center text-gray-600">Bạn chưa đăng nhập.</p>
        </main>
      </>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  return (
    <>
      <TopHeader title="Lịch sử luyện tập" showBack />
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        {progress.length === 0 ? (
          <p className="text-center text-gray-600">Bạn chưa luyện tập câu nào.</p>
        ) : (
          <div className="space-y-3">
            {progress.map((item) => (
              <div
                key={item.sentenceId}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {item.sentence ? (
                  <>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-lg font-semibold">{item.sentence.zh}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{item.sentence.pinyin}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-500">{item.sentence.vi}</div>
                      </div>
                      <div className={`rounded-lg px-3 py-2 text-center ${getScoreBg(item.score)}`}>
                        <div className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                          {Math.round(item.score)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">điểm</div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      {item.accuracy != null && (
                        <div className="rounded bg-gray-50 px-2 py-1 dark:bg-gray-700/50">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Độ chính xác</div>
                          <div className="font-semibold">{Math.round(item.accuracy)}</div>
                        </div>
                      )}
                      {item.fluency != null && (
                        <div className="rounded bg-gray-50 px-2 py-1 dark:bg-gray-700/50">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Độ trôi chảy</div>
                          <div className="font-semibold">{Math.round(item.fluency)}</div>
                        </div>
                      )}
                      {item.prosody != null && (
                        <div className="rounded bg-gray-50 px-2 py-1 dark:bg-gray-700/50">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Ngữ điệu</div>
                          <div className="font-semibold">{Math.round(item.prosody)}</div>
                        </div>
                      )}
                      {item.completeness != null && (
                        <div className="rounded bg-gray-50 px-2 py-1 dark:bg-gray-700/50">
                          <div className="text-xs text-gray-600 dark:text-gray-400">Độ hoàn thành</div>
                          <div className="font-semibold">{Math.round(item.completeness)}</div>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Ngày: {item.date || 'N/A'}</span>
                      <span>Luyện: {item.timesPracticed} lần</span>
                      <span className="text-xs">Chủ đề: {item.sentence.topic || 'N/A'}</span>
                      <button
                        className="ml-auto rounded border px-3 py-1 text-xs font-medium hover:bg-white dark:hover:bg-gray-700"
                        onClick={() => {
                          try { localStorage.setItem('retrySentenceId', item.sentenceId); } catch {}
                          router.push('/practice');
                        }}
                      >
                        Luyện lại
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500">
                    Câu ID: {item.sentenceId} (đã xóa hoặc không tìm thấy)
                    <div className="mt-1 text-sm">Điểm: {Math.round(item.score)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
