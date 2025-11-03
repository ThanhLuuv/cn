'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Volume2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { webmBlobToWav } from '@/utils/audio';
import { useAuth } from '@/hooks/useAuth';
import { saveUserSentenceProgress } from '@/lib/firestore';

type Item = { id?: string; zh: string; pinyin: string; vi?: string; audioUrl?: string; topic?: string };

export default function PronunciationCard({ items, onResolveTopic }: { items: Item[]; onResolveTopic?: (topic: string) => void }) {
  const { user } = useAuth();
  const data = useMemo(() => items && items.length ? items : [
    { zh: '你好，很高兴再次见到你。', pinyin: 'Nǐ hǎo, hěn gāoxìng zàicì jiàndào nǐ.', topic: 'Greetings and Introductions' },
    { zh: '很高兴认识你。', pinyin: 'Hěn gāoxìng rènshì nǐ.', topic: 'Greetings and Introductions' },
    { zh: '你最近怎么样？', pinyin: 'Nǐ zuìjìn zěnme yàng?', topic: 'Greetings and Introductions' },
  ], [items]);

  // Limit daily practice to first 10 items; wrap within these 10
  const dailyData = useMemo(() => {
    const MAX = 10;
    return data.slice(0, MAX);
  }, [data]);

  const [idx, setIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [timerText, setTimerText] = useState('0:00');
  const [azureScore, setAzureScore] = useState<number | null>(null);
  const [azureBusy, setAzureBusy] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [metrics, setMetrics] = useState<{ pron?: number; accuracy?: number; fluency?: number; completeness?: number; prosody?: number } | null>(null);
  const [wordResults, setWordResults] = useState<Array<{ Word: string; AccuracyScore?: number; ErrorType?: string }>>([]);
  const [confetti, setConfetti] = useState<Array<{ left:number; top:number; dx:number; dy:number; rot:number; color:string; delay:number; dur:number }>>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);

  const current = dailyData[idx];

  useEffect(() => {
    if (onResolveTopic) {
      const t = dailyData[0]?.topic || 'Practice';
      onResolveTopic(t);
    }
  }, [dailyData, onResolveTopic]);

  useEffect(() => {
    if (azureScore != null) setShowOverlay(true);
  }, [azureScore]);

  useEffect(() => {
    if (!showOverlay) return;
    // Play success sound
    try { const a = new Audio('/audio/success-sound.mp3'); a.play().catch(() => {}); } catch {}
    // Generate confetti squares
    const colors = ['#22c55e', '#eab308', '#ef4444', '#0ea5e9', '#a855f7'];
    const items = Array.from({ length: 28 }).map(() => {
      const left = Math.random() * 100; // percent
      const top = 40 + Math.random() * 20; // around center
      const angle = Math.random() * Math.PI * 2;
      const radius = 120 + Math.random() * 140;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius * -1; // go outward/upward
      const rot = (Math.random() * 360 - 180);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const delay = Math.floor(Math.random() * 200);
      const dur = 900 + Math.floor(Math.random() * 700);
      return { left, top, dx, dy, rot, color, delay, dur };
    });
    setConfetti(items);
  }, [showOverlay]);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const startTimer = () => {
    startTsRef.current = Date.now();
    setTimerText('0:00');
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setTimerText(fmt(Date.now() - startTsRef.current));
    }, 200);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const releaseMic = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    try { if (rec.state && rec.state !== 'inactive') rec.stop(); } catch {}
    try { rec.stream?.getTracks?.().forEach((t: MediaStreamTrack) => t.stop()); } catch {}
    mediaRecorderRef.current = null;
  };

  const playAudio = async () => {
    if (!current?.audioUrl) return;
    // Ensure microphone is fully released first (Safari routes audio to earpiece if mic active)
    releaseMic();
    const audio = new Audio(current.audioUrl);
    // Make sure iOS Safari plays through speaker and inline
    (audio as any).playsInline = true;
    audio.setAttribute('playsinline', 'true');
    await audio.play().catch(() => {});
  };

  const toggleRecord = async () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === 'recording') {
      mr.stop();
      setIsRecording(false);
      stopTimer();
      return;
    }
    try {
      // Stop any previous streams before requesting a new one
      releaseMic();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e: BlobEvent) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        try {
          const mime = (recorder as any).mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mime });
          const wav = await webmBlobToWav(blob, 16000);
          setAzureBusy(true);
          const fd = new FormData();
          fd.append('audio', new Blob([wav], { type: 'audio/wav' }), 'audio.wav');
          fd.append('reference', current.zh || current.pinyin || '');
          fd.append('locale', 'zh-CN');
          const r = await fetch('/api/azure/assess', { method: 'POST', body: fd });
          if (r.ok) {
            const data = await r.json();
            const best = data?.NBest?.[0] || {};
            // Support both response shapes: flat scores on best, or nested in PronunciationAssessment
            const pa = best?.PronunciationAssessment || {};
            const score =
              (typeof best.PronScore === 'number' ? best.PronScore : null) ??
              (typeof best.PronunciationScore === 'number' ? best.PronunciationScore : null) ??
              (typeof pa.PronScore === 'number' ? pa.PronScore : null) ??
              (typeof pa.PronunciationScore === 'number' ? pa.PronunciationScore : null) ??
              (typeof best.AccuracyScore === 'number' ? best.AccuracyScore : null) ??
              (typeof pa.AccuracyScore === 'number' ? pa.AccuracyScore : null);
            const accuracy = (typeof best.AccuracyScore === 'number' ? best.AccuracyScore : (typeof pa.AccuracyScore === 'number' ? pa.AccuracyScore : undefined));
            const fluency = (typeof best.FluencyScore === 'number' ? best.FluencyScore : (typeof pa.FluencyScore === 'number' ? pa.FluencyScore : undefined));
            const completeness = (typeof best.CompletenessScore === 'number' ? best.CompletenessScore : (typeof pa.CompletenessScore === 'number' ? pa.CompletenessScore : undefined));
            const prosody = (typeof best.ProsodyScore === 'number' ? best.ProsodyScore : (typeof pa.ProsodyScore === 'number' ? pa.ProsodyScore : undefined));
            setMetrics({ pron: score ?? undefined, accuracy, fluency, completeness, prosody });
            if (Array.isArray(best.Words)) setWordResults(best.Words as any);
            if (typeof score === 'number') { 
              setAzureScore(score); 
              setShowOverlay(true);
              // Save progress to Firestore
              if (user?.uid && current.id) {
                saveUserSentenceProgress(user.uid, current.id, score, { accuracy, fluency, prosody, completeness }).catch(e => {
                  console.error('Failed to save progress:', e);
                });
              }
            }
            else setAzureScore(null);
          } else {
            // Handle error response
            let errorMsg = 'Không thể chấm điểm phát âm';
            try {
              const errData = await r.json();
              if (r.status === 429) {
                errorMsg = 'Quá nhiều yêu cầu. Vui lòng đợi một chút rồi thử lại.';
              } else if (errData.hint) {
                errorMsg = errData.hint;
              } else if (errData.detail) {
                errorMsg = errData.detail;
              }
            } catch {
              errorMsg = `Lỗi ${r.status}: Không thể kết nối đến dịch vụ chấm điểm`;
            }
            alert(errorMsg);
            setAzureScore(null);
          }
        } catch (e: any) {
          console.error('Recording/assessment error:', e);
          alert('Lỗi khi xử lý audio: ' + (e?.message || 'Unknown error'));
          setAzureScore(null);
        } finally {
          setAzureBusy(false);
          // Fully stop input to prevent Safari output ducking
          releaseMic();
        }
      };
      recorder.start();
      setIsRecording(true);
      startTimer();
    } catch (e) {
      alert('Microphone permission denied or unavailable.');
    }
  };

  useEffect(() => () => { stopTimer(); releaseMic(); }, []);
  
  // Reset timer và recording state khi chuyển câu
  useEffect(() => {
    stopTimer();
    setIsRecording(false);
    setTimerText('0:00');
    setAzureBusy(false);
    // Fully release microphone when switching items
    releaseMic();
  }, [idx]);

  return (
    <main className="prn-wrap" role="main">
      <div className="container">
        <section className="card" aria-label="Pronunciation Card">
          <div className="message">
          <div>
            <h1 className="en" id="text-en">{current.vi || current.pinyin}</h1>
            <p className="ipa" id="text-ipa">{current.pinyin}</p>
          </div>
          <button className="speak-btn" id="btn-play" aria-label="Play audio" onClick={playAudio}>
            <Volume2 color={'var(--speaker)'} width={26} height={26} />
          </button>
        </div>

        <div className="controls">
          <div className="mic-wrap">
            <button
              className={`mic pulse${isRecording ? ' recording' : ''}`}
              id="btn-mic"
              aria-label="Record"
              onClick={azureBusy ? undefined : toggleRecord}
              disabled={azureBusy}
              style={azureBusy ? { opacity: 0.85, pointerEvents: 'none' } : undefined}
            >
              {azureBusy ? (
                <Loader2 width={48} height={48} color={'#fff'} className="animate-spin" />
              ) : (
                <Mic width={60} height={60} color={'#fff'} />
              )}
            </button>
          </div>
          <div className="timer" id="timer">{timerText}</div>
        </div>

        <div className="nav">
          <button className="icon-btn" id="btn-prev" aria-label="Previous" onClick={() => setIdx((idx - 1 + dailyData.length) % dailyData.length)}>
            <ChevronLeft color={'var(--text)'} width={24} height={24} />
          </button>
          <button className="icon-btn" id="btn-next" aria-label="Next" onClick={() => setIdx((idx + 1) % dailyData.length)}>
            <ChevronRight color={'var(--text)'} width={24} height={24} />
          </button>
        </div>
        </section>
      </div>
      {showOverlay && (
        <div
          className="fixed inset-0 z-50 grid place-items-center backdrop-blur-lg backdrop-saturate-150"
          style={{ background: 'rgba(0,0,0,.7)' }}
          onClick={() => {
            setShowOverlay(false);
            setAzureScore(null);
            setMetrics(null);
            setWordResults([]);
            setConfetti([]);
            // Chuyển sang câu tiếp theo trong bộ 10 câu của ngày
            setIdx((idx + 1) % dailyData.length);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-4 max-w-md text-center">
            <img src="/img/cup.png" alt="Trophy" className="mx-auto mb-2 h-16 w-auto sm:h-24" />
            <div className="text-6xl sm:text-7xl font-extrabold" style={{ color: '#22c55e' }}>{azureScore != null ? Math.round(azureScore) : ''}</div>
            {metrics && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-md bg-white/10 px-3 py-2">
                  <div className="text-xs text-white/80">Độ chính xác</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">{metrics.accuracy != null ? Math.round(metrics.accuracy) : '-'}</div>
                </div>
                <div className="rounded-md bg-white/10 px-3 py-2">
                  <div className="text-xs text-white/80">Độ trôi chảy</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">{metrics.fluency != null ? Math.round(metrics.fluency) : '-'}</div>
                </div>
                <div className="rounded-md bg-white/10 px-3 py-2">
                  <div className="text-xs text-white/80">Ngữ điệu</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">{metrics.prosody != null ? Math.round(metrics.prosody) : '-'}</div>
                </div>
                <div className="rounded-md bg-white/10 px-3 py-2">
                  <div className="text-xs text-white/80">Độ hoàn thành</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">{metrics.completeness != null ? Math.round(metrics.completeness) : '-'}</div>
                </div>
              </div>
            )}
            {wordResults?.length ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-lg">
                {wordResults.map((w, i) => {
                  const sc = w?.AccuracyScore ?? 0;
                  const err = (w as any)?.ErrorType as string | undefined;
                  let color = '#ef4444'; // red
                  if (err === 'Omission' || sc === 0) color = '#9ca3af'; // gray
                  else if (sc >= 80) color = '#22c55e'; // green
                  else if (sc >= 50) color = '#eab308'; // yellow
                  return <span key={i} style={{ color }}>{w.Word}</span>;
                })}
              </div>
            ) : null}
            <div className="mt-5 text-sm text-white/80">Nhấn bất kỳ để tiếp tục</div>
          </div>
          <div className="confetti-layer">
            {confetti.map((c, i) => (
              <span
                key={i}
                className="confetti-square"
                style={{
                  left: `${c.left}%`,
                  top: `${c.top}%`,
                  background: c.color,
                  // @ts-ignore css vars
                  '--dx': `${c.dx}px`, '--dy': `${c.dy}px`, '--rot': `${c.rot}deg`, '--delay': `${c.delay}ms`, '--dur': `${c.dur}ms`,
                } as any}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}


