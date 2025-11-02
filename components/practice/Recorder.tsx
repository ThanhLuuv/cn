'use client';

import { useSpeech } from '@/hooks/useSpeech';

export function Recorder({ lang = 'zh-CN' }: { lang?: string }) {
  const { text, listening, start, stop } = useSpeech(lang);
  return (
    <div className="flex items-center gap-3">
      {!listening ? (
        <button onClick={start} className="rounded bg-black px-3 py-1 text-white">Ghi âm</button>
      ) : (
        <button onClick={stop} className="rounded border px-3 py-1">Dừng</button>
      )}
      <span className="text-sm text-gray-600">Bạn nói: <b>{text}</b></span>
    </div>
  );
}


