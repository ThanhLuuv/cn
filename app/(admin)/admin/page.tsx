'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp, doc, setDoc, query, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { slugify } from '@/utils/slug';
import { useAuth } from '@/hooks/useAuth';

export default function AdminPage() {
  const { user } = useAuth();
  const [topicName, setTopicName] = useState('');
  const [topicKey, setTopicKey] = useState('');

  const [topic, setTopic] = useState('');
  const [zh, setZh] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [vi, setVi] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [rate, setRate] = useState<number>(0.8);

  const createTopic = async () => {
    if (!user) { alert('Chưa đăng nhập'); return; }
    const key = topicKey || slugify(topicName);
    try {
      console.log('Creating topic:', key, 'name:', topicName, 'UID:', user.uid);
      await addDoc(collection(db, 'topics'), { key, name: topicName, createdAt: serverTimestamp() });
      setTopicName(''); setTopicKey('');
      alert('Đã tạo chủ đề');
    } catch (e: any) {
      console.error('createTopic error:', e, 'Code:', e?.code, 'Message:', e?.message);
      alert('Lỗi: ' + (e?.message || e?.code || 'Unknown') + '. Code: ' + e?.code);
    }
  };

  const synthAndUpload = async () => {
    setBusy(true);
    try {
      // Create unique key: prefer pinyin slug, fallback to hash of zh text, or timestamp
      let key: string;
      if (pinyin) {
        key = slugify(pinyin);
      } else if (zh) {
        // Use simple hash of zh text for uniqueness
        const hash = zh.split('').reduce((acc: number, char: string) => {
          const code = char.charCodeAt(0);
          return ((acc << 5) - acc) + code;
        }, 0);
        key = `zh-${Math.abs(hash).toString(36)}`;
      } else {
        key = slugify(vi || '') || `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
      // Ensure key is not empty
      if (!key || key.trim() === '') {
        key = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
      const path = `audio_samples/${topic || 'misc'}/${key}.mp3`;
      const r = await fetch('/api/admin/tts-upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: zh || pinyin || vi, path, languageCode: 'zh-CN', speakingRate: rate }) });
      if (!r.ok) throw new Error('TTS lỗi');
      const data = await r.json();
      setAudioUrl(data.url);
    } catch (e: any) {
      alert(e?.message || 'Không thể tạo audio');
    } finally {
      setBusy(false);
    }
  };

  const saveSentence = async () => {
    if (!audioUrl) { alert('Hãy tạo audio trước'); return; }
    if (!user) { alert('Chưa đăng nhập'); return; }
    try {
      console.log('Saving sentence:', zh, 'UID:', user.uid);
      await addDoc(collection(db, 'sentences'), { topic, zh, pinyin, vi, audioUrl, level: 1, createdAt: Date.now() });
      setZh(''); setPinyin(''); setVi('');
      alert('Đã lưu câu');
    } catch (e: any) {
      console.error('saveSentence error:', e, 'Code:', e?.code, 'Message:', e?.message);
      alert('Lỗi: ' + (e?.message || e?.code || 'Unknown') + '. Code: ' + e?.code);
    }
  };

  const bootstrapAdmin = async () => {
    if (!user?.uid) { alert('Chưa đăng nhập'); return; }
    try {
      console.log('Bootstrapping admin for UID:', user.uid);
      await setDoc(doc(db, 'admins', user.uid), { createdAt: serverTimestamp(), email: user.email });
      alert('Đã thêm bạn vào admins. Hãy thử lại.');
    } catch (e: any) {
      console.error('bootstrapAdmin error:', e, 'Code:', e?.code, 'Message:', e?.message);
      alert('Lỗi: ' + (e?.message || e?.code || 'Unknown') + '. Code: ' + e?.code);
    }
  };

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h2 className="text-2xl font-bold">Admin</h2>
      {user && (
        <div className="mb-4 rounded border bg-yellow-50 p-2 text-sm">
          <div>UID: {user.uid}</div>
          <button onClick={bootstrapAdmin} className="mt-1 rounded bg-yellow-200 px-2 py-1 text-xs">Tự thêm vào admins (nếu chưa có)</button>
        </div>
      )}
      <section className="mt-4 rounded-2xl border p-4">
        <h3 className="font-semibold">Thêm chủ đề</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input className="rounded border p-2" placeholder="Tên chủ đề" value={topicName} onChange={e => setTopicName(e.target.value)} />
          <input className="rounded border p-2" placeholder="Key (tùy chọn)" value={topicKey} onChange={e => setTopicKey(e.target.value)} />
        </div>
        <button onClick={createTopic} className="mt-3 rounded bg-black px-4 py-2 text-white">Tạo chủ đề</button>
      </section>

      <section className="mt-6 rounded-2xl border p-4">
        <h3 className="font-semibold">Import JSON (topics + sentences)</h3>
        <p className="text-sm text-gray-600">Cấu trúc: [{'{'} key, name, sentences: [ {'{'} zh, pinyin, vi {'}'} ] {'}'}]</p>
        <input type="file" accept="application/json" className="mt-3" onChange={async (e) => {
          const inputEl = e.currentTarget as HTMLInputElement;
          const file = inputEl.files?.[0];
          if (!file) return;
          if (!user) { alert('Chưa đăng nhập'); return; }
          setImportBusy(true);
          try {
            const text = await file.text();
            const json = JSON.parse(text);
            console.log('Importing', json.length, 'topics, UID:', user.uid);
            for (const t of json) {
              const tKey = t.key || slugify(t.name);
              console.log('Creating topic:', tKey, t.name);
              try {
                await addDoc(collection(db, 'topics'), { key: tKey, name: t.name, createdAt: serverTimestamp() });
              } catch (e: any) {
                console.error('Error creating topic:', tKey, 'Code:', e?.code, 'Message:', e?.message);
                throw e;
              }
              for (const s of t.sentences) {
                // Create unique key: prefer pinyin slug, fallback to hash of zh text, or timestamp
                let key: string;
                if (s.pinyin) {
                  key = slugify(s.pinyin);
                } else if (s.zh) {
                  // Use simple hash of zh text for uniqueness
                  const hash = s.zh.split('').reduce((acc: number, char: string) => {
                    const code = char.charCodeAt(0);
                    return ((acc << 5) - acc) + code;
                  }, 0);
                  key = `zh-${Math.abs(hash).toString(36)}`;
                } else {
                  key = slugify(s.vi || '') || `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                }
                // Ensure key is not empty
                if (!key || key.trim() === '') {
                  key = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                }
                const path = `audio_samples/${tKey}/${key}.mp3`;
                console.log('TTS + R2:', path);
                const r = await fetch('/api/admin/tts-upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: s.zh || s.pinyin || s.vi, path, languageCode: 'zh-CN', speakingRate: rate }) });
                if (!r.ok) {
                  let errData: any = {};
                  try {
                    errData = await r.json();
                  } catch {
                    errData = { error: await r.text() };
                  }
                  console.error('TTS error:', errData);
                  throw new Error(`TTS failed: ${r.status} - ${errData.error || 'Unknown'}${errData.detail ? ' - ' + errData.detail : ''}${errData.hint ? ' (' + errData.hint + ')' : ''}`);
                }
                const data = await r.json();
                const url = data.url || s.audioUrl || '';
                console.log('Saving sentence:', s.zh);
                try {
                  await addDoc(collection(db, 'sentences'), { topic: tKey, zh: s.zh, pinyin: s.pinyin, vi: s.vi, audioUrl: url, level: 1, createdAt: Date.now() });
                } catch (e: any) {
                  console.error('Error saving sentence:', s.zh, 'Code:', e?.code, 'Message:', e?.message);
                  throw e;
                }
              }
            }
            alert('Import xong');
          } catch (err: any) {
            console.error('Import error:', err, 'Code:', err?.code, 'Message:', err?.message);
            alert('Lỗi: ' + (err?.message || err?.code || 'Unknown') + '. Code: ' + err?.code);
          } finally {
            setImportBusy(false);
            if (inputEl) inputEl.value = '';
          }
        }} />
        {importBusy && <div className="mt-2 text-sm">Đang import...</div>}
      </section>

      <section className="mt-6 rounded-2xl border p-4">
        <h3 className="font-semibold">Thêm câu</h3>
        <div className="mt-3 grid gap-2">
          <input className="rounded border p-2" placeholder="Topic (key)" value={topic} onChange={e => setTopic(e.target.value)} />
          <input className="rounded border p-2" placeholder="中文 (zh)" value={zh} onChange={e => setZh(e.target.value)} />
          <input className="rounded border p-2" placeholder="Pinyin" value={pinyin} onChange={e => setPinyin(e.target.value)} />
          <input className="rounded border p-2" placeholder="Việt" value={vi} onChange={e => setVi(e.target.value)} />
          <label className="mt-1 text-sm text-gray-600">Tốc độ (0.6 - 1.0)
            <input type="number" step="0.05" min="0.6" max="1.2" className="ml-2 w-24 rounded border p-1" value={rate} onChange={e => setRate(Number(e.target.value))} />
          </label>
          <div className="flex items-center gap-3">
            <button onClick={synthAndUpload} disabled={busy} className="rounded bg-black px-4 py-2 text-white disabled:opacity-60">{busy ? 'Đang tạo audio...' : 'Tạo audio & Upload R2'}</button>
            {audioUrl && <a className="text-sm underline" href={audioUrl} target="_blank" rel="noreferrer">Nghe audio</a>}
          </div>
          <button onClick={saveSentence} className="mt-2 rounded border px-4 py-2">Lưu câu</button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-yellow-300 bg-yellow-50 p-4 dark:bg-yellow-900/10">
        <h3 className="font-semibold">Cập nhật R2 URLs</h3>
        <p className="mt-2 text-sm text-gray-600">Cập nhật tất cả URL cũ sang domain mới</p>
        <button
          onClick={async () => {
            if (!confirm('Cập nhật tất cả R2 URLs từ domain cũ sang mới?')) return;
            if (!user) { alert('Chưa đăng nhập'); return; }
            try {
              const OLD_URL = 'https://pub-6178945914f04b039aa677fb633b90c4.r2.dev';
              const NEW_URL = 'https://pub-6d6ab55d3a4e4d238a8598295cbf8540.r2.dev';
              
              console.log('Fetching sentences...');
              const q = query(collection(db, 'sentences'));
              const snapshot = await getDocs(q);
              
              let updated = 0;
              let skipped = 0;
              const errors: string[] = [];
              
              for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                const audioUrl = data.audioUrl || '';
                
                if (!audioUrl || !audioUrl.includes(OLD_URL)) {
                  skipped++;
                  continue;
                }
                
                const newUrl = audioUrl.replace(OLD_URL, NEW_URL);
                console.log(`Updating ${docSnap.id}: ${audioUrl.substring(0, 50)}...`);
                
                try {
                  await updateDoc(doc(db, 'sentences', docSnap.id), { audioUrl: newUrl });
                  updated++;
                } catch (e: any) {
                  errors.push(`${docSnap.id}: ${e?.message}`);
                  console.error('Error updating', docSnap.id, e);
                }
              }
              
              alert(`✅ Đã cập nhật ${updated} câu, bỏ qua ${skipped} câu${errors.length ? `\nLỗi: ${errors.length} câu` : ''}`);
              if (errors.length) console.error('Errors:', errors);
            } catch (e: any) {
              console.error('Update error:', e);
              alert('❌ Lỗi: ' + (e?.message || 'Unknown'));
            }
          }}
          className="mt-3 rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
        >
          Cập nhật URLs
        </button>
      </section>
    </main>
  );
}


