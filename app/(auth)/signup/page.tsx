'use client';

import { signupWithEmail } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ensureUserDoc } from '@/lib/firestore';

export default function SignupPage() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    const cred = await signupWithEmail(email, password);
    const u = cred.user;
    if (u?.uid) await ensureUserDoc(u.uid, { email: u.email ?? '' });
    r.push('/');
  };

  return (
    <main className="w-full px-4 py-8">
      <div className="mx-auto grid min-h-[80dvh] place-items-center">
        <section
          className="w-full max-w-md rounded-3xl p-6 shadow-xl sm:p-8"
          style={{ background: 'var(--card)', borderRadius: 'var(--radius)' }}
          aria-label="Đăng ký"
        >
          <h1 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ color: 'var(--text)' }}>Tạo tài khoản</h1>
          <p className="mt-1 text-center text-sm" style={{ color: 'var(--sub)' }}>Bắt đầu chuỗi ngày học phát âm của bạn</p>

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
              className="mt-2 w-full rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              style={{ background: 'var(--accent)', boxShadow: '0 6px 0 var(--accent-dark)' }}
              type="submit"
            >
              Tạo tài khoản
            </button>
          </form>

          <div className="mt-5 text-center text-sm" style={{ color: 'var(--sub)' }}>
            Đã có tài khoản?{' '}
            <Link href="/login" className="font-semibold underline underline-offset-4" style={{ color: 'var(--speaker)' }}>Đăng nhập</Link>
          </div>
        </section>
      </div>
    </main>
  );
}


