'use client';

import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, KeyRound, LogOut, Mail } from 'lucide-react';

function Avatar({ name, photoURL }: { name: string; photoURL?: string | null }) {
  const initials = (name || '').trim().split(/\s+/).slice(0,2).map(s => s[0]?.toUpperCase() ?? '').join('') || 'U';
  return (
    <div className="h-9 w-9 overflow-hidden rounded-full">
      {photoURL ? (
        <img src={photoURL} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-sm font-bold" style={{ background: 'rgba(0,0,0,.12)', color: 'var(--text)' }}>
          {initials}
        </div>
      )}
    </div>
  );
}

export default function TopHeader({ topic, showBack, title }: { topic?: string; showBack?: boolean; title?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const name = user?.displayName || user?.email || 'Người dùng';

  const onBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <header className="flex items-center justify-between gap-3 border-b px-3 py-2 sm:px-4 sm:py-3" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
      <div className="flex items-center gap-2">
        {showBack && (
          <button aria-label="Quay lại" onClick={onBack} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white">
            <ArrowLeft width={18} height={18} color={'var(--text)'} />
          </button>
        )}
        {title ? (
          <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{title}</div>
        ) : (
          <>
            <div className="text-sm" style={{ color: 'var(--sub)' }}>Xin chào</div>
            <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{name}</div>
          </>
        )}
        {!title && topic && (
          <div className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(0,0,0,.06)', color: 'var(--text)' }}>
            {topic}
          </div>
        )}
      </div>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(v => !v)} aria-expanded={open} className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-white focus:outline-none">
          <Avatar name={name} photoURL={user?.photoURL} />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border bg-white shadow-lg" style={{ borderColor: 'var(--divider)' }}>
            <div className="px-4 py-3 text-sm" style={{ color: 'var(--text)' }}>
              <div className="font-bold">{name}</div>
              <div className="mt-1 flex items-center gap-2 truncate font-normal" style={{ color: 'var(--sub)' }}>
                <Mail width={14} height={14} color={'var(--sub)'} /> {user?.email}
              </div>
            </div>
            <div className="h-px" style={{ background: 'var(--divider)' }} />
            <button
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-normal hover:bg-[#f7f4f1]"
              onClick={() => { setOpen(false); /* router.push('/profile') */ }}
            >
              <User width={16} height={16} color={'var(--text)'} /> Thông tin cá nhân
            </button>
            <button
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-normal hover:bg-[#f7f4f1]"
              onClick={async () => {
                if (!user?.email) return;
                try {
                  await sendPasswordResetEmail(auth, user.email);
                  alert('Đã gửi email đổi mật khẩu tới ' + user.email);
                } catch (e: any) {
                  alert('Không thể gửi email đổi mật khẩu: ' + (e?.message ?? 'Lỗi'));
                } finally {
                  setOpen(false);
                }
              }}
            >
              <KeyRound width={16} height={16} color={'var(--text)'} /> Đổi mật khẩu
            </button>
            <div className="h-px" style={{ background: 'var(--divider)' }} />
            <button
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-normal hover:bg-[#f7f4f1]"
              onClick={async () => { await logout(); router.push('/login'); }}
            >
              <LogOut width={16} height={16} color={'var(--text)'} /> Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}


