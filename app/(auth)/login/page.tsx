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
              {submitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" width={18} height={18} />
                  Đang xử lý...
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  {/* Google G icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12   s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24   s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,19.013,13,24,13c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657   C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.197l-6.196-5.238C29.211,35.091,26.715,36,24,36   c-5.202,0-9.616-3.317-11.283-7.946l-6.522,5.025C9.5,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.236-2.231,4.166-4.094,5.566   c0.001-0.001,0.002-0.001,0.003-0.002l6.196,5.238C36.896,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  Đăng nhập với Google
                </span>
              )}
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


