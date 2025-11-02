'use client';

import { useEffect, useRef, useState } from 'react';

export function useSpeech(lang: string = 'zh-CN') {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript as string;
      setText(t);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
  }, [lang]);

  const start = () => { recRef.current?.start?.(); setListening(true); };
  const stop = () => { recRef.current?.stop?.(); setListening(false); };

  return { text, listening, start, stop };
}


