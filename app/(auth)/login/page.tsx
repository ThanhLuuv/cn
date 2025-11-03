'use client';

import { loginWithGoogle, loginWithEmail } from '@/lib/auth';
import { ensureUserDoc } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const r = useRouter();
  const { loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    try {
      setSubmitting(true);
      const cred = await loginWithEmail(email, password);
      const u = cred.user;
      if (u?.uid) await ensureUserDoc(u.uid, { email: u.email ?? '' });
      r.push('/');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 className="animate-spin" width={28} height={28} color={'var(--sub)'} />
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-8">
      <div className="mx-auto grid min-h-[80dvh] place-items-center">
        <section
          className="w-full max-w-md rounded-3xl p-6 shadow-xl sm:p-8"
          style={{ background: 'var(--card)', borderRadius: 'var(--radius)' }}
          aria-label="Đăng nhập"
        >
          <h1 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ color: 'var(--text)' }}>Chào mừng trở lại</h1>
          <p className="mt-1 text-center text-sm" style={{ color: 'var(--sub)' }}>Đăng nhập để tiếp tục luyện phát âm</p>

          <form className="mt-6 grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <label className="grid gap-1 text-sm">
              <span style={{ color: 'var(--sub)' }}>Email</span>
              <input
                className="w-full rounded-xl border bg-white/70 p-3 outline-none ring-0 transition focus:border-black focus:bg-white"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span style={{ color: 'var(--sub)' }}>Mật khẩu</span>
              <input
                className="w-full rounded-xl border bg-white/70 p-3 outline-none ring-0 transition focus:border-black focus:bg-white"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                required
              />
            </label>

            <button
              onClick={submit}
              className="mt-2 w-full rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-70"
              style={{ background: 'var(--accent)', boxShadow: '0 6px 0 var(--accent-dark)' }}
              type="submit"
              disabled={submitting}
            >
              {submitting ? <span className="inline-flex items-center justify-center gap-2"><Loader2 className="animate-spin" width={18} height={18} /> Đang đăng nhập...</span> : 'Đăng nhập'}
            </button>
            <button
              onClick={async () => {
                try {
                  setSubmitting(true);
                  const cred = await loginWithGoogle();
                  const u = cred.user;
                  if (u?.uid) await ensureUserDoc(u.uid, { email: u.email ?? '', name: u.displayName ?? '' });
                  r.push('/');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full rounded-xl border px-4 py-3 text-sm font-medium transition hover:bg-white disabled:opacity-70"
              type="button"
              disabled={submitting}
            >
              {submitting ? <span className="inline-flex items-center justify-center gap-2"><Loader2 className="animate-spin" width={18} height={18} /> Đang xử lý...</span> : 'Đăng nhập với Google'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm" style={{ color: 'var(--sub)' }}>
            Chưa có tài khoản?{' '}
            <Link href="/signup" className="font-semibold underline underline-offset-4" style={{ color: 'var(--speaker)' }}>Đăng ký</Link>
          </div>
        </section>
      </div>
    </main>
  );
}


