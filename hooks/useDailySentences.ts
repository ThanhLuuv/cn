'use client';

import { useEffect, useState } from 'react';
import { fetchSentencesByTopic } from '@/lib/firestore';

export function useDailySentences(topic: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // tạm thời lấy 10 câu theo topic (5 mới + 5 cũ xử lý ở services/scheduler.ts)
      const data = await fetchSentencesByTopic(topic, 30);
      setItems(data);
      setLoading(false);
    })();
  }, [topic]);

  return { items, loading };
}


