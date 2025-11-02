'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import dynamic from 'next/dynamic';
const DashboardClient = dynamic(() => import('@/components/dashboard/DashboardClient'), { ssr: false });
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 className="animate-spin" width={28} height={28} color={'var(--sub)'} />
      </main>
    );
  }

  if (!user) return null; // will redirect to /login

  return <DashboardClient />;
}


