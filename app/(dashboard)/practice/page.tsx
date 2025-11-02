'use client';

import { useDailyPractice } from '@/hooks/useDailyPractice';
import PronunciationCard from '@/components/practice/PronunciationCard';
import TopHeader from '@/components/dashboard/TopHeader';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchTopicName } from '@/lib/firestore';

export default function PracticePage() {
  const { items, loading, error } = useDailyPractice();
  const [topic, setTopic] = useState<string>('Luyện tập');
  
  // Fetch topic name in Vietnamese when items change
  useEffect(() => {
    if (items && items.length > 0) {
      const firstTopicKey = items[0]?.topic;
      console.log('Practice items loaded, first topic key:', firstTopicKey);
      if (firstTopicKey) {
        fetchTopicName(firstTopicKey).then(name => {
          console.log('Topic name fetched:', name);
          if (name) {
            setTopic(name);
          } else {
            // Fallback: format topic key nicely
            const pretty = firstTopicKey.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
            setTopic(pretty);
          }
        }).catch((e) => {
          console.error('Failed to fetch topic name:', e);
          // Keep default if fetch fails
        });
      }
    }
  }, [items]);
  
  if (loading) {
    return (
      <>
        <TopHeader title="Luyện tập" showBack />
        <main className="grid min-h-[calc(100dvh-64px)] place-items-center">
          <Loader2 className="animate-spin" width={28} height={28} color={'var(--sub)'} />
        </main>
      </>
    );
  }

  if (error || !items?.length) {
    return (
      <>
        <TopHeader title="Luyện tập" showBack />
        <main className="mx-auto max-w-3xl p-6">
          <p className="text-center text-gray-600">
            {error || 'Chưa có câu để luyện tập. Vui lòng thêm câu trong trang admin.'}
          </p>
        </main>
      </>
    );
  }

  const mapped = items.map((s: any) => ({ 
    id: s.id, 
    zh: s.zh, 
    pinyin: s.pinyin, 
    vi: s.vi,
    audioUrl: s.audioUrl, 
    topic: s.topic 
  }));

  return (
    <>
      <TopHeader title={topic} showBack />
      <PronunciationCard items={mapped} onResolveTopic={(t) => {
        // Update topic name when PronunciationCard resolves topic
        // t is topic key, fetch Vietnamese name
        if (typeof t === 'string' && t) {
          fetchTopicName(t).then(name => {
            if (name) {
              setTopic(name);
            } else {
              // Fallback: format topic key nicely
              const pretty = t.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
              setTopic(pretty);
            }
          }).catch(() => {
            // Keep current topic if fetch fails
          });
        }
      }} />
    </>
  );
}


