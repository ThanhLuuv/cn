'use client';

import { useUserProgress } from '@/hooks/useUserProgress';
import { StatsGrid } from './StatsGrid';
import { TodayPanel } from './TodayPanel';
import { WeeklyMiniChart } from './WeeklyMiniChart';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import TopHeader from './TopHeader';

export default function DashboardClient() {
  const { user, loading: authLoading } = useAuth();
  const { loading, error, totalPracticed, avgScore, todayCount, todayAvgScore, streak, last7 } = useUserProgress();

  const LoadingSkeleton = () => (
    <div className="mx-auto max-w-5xl px-3 py-3 sm:p-6 animate-pulse">
      <div className="h-7 w-48 rounded" style={{ background: 'rgba(0,0,0,.08)' }} />
      <div className="mt-2 h-4 w-80 rounded" style={{ background: 'rgba(0,0,0,.06)' }} />
      <div className="mt-6 grid gap-3 sm:gap-4 sm:grid-cols-3">
        {[0,1,2].map(i => (
          <div key={i} className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--card)' }}>
            <div className="h-10 w-10 rounded-xl" style={{ background: 'rgba(0,0,0,.08)' }} />
            <div className="mt-3 h-4 w-24 rounded" style={{ background: 'rgba(0,0,0,.08)' }} />
            <div className="mt-2 h-6 w-20 rounded" style={{ background: 'rgba(0,0,0,.10)' }} />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-2xl" style={{ background: 'var(--card)' }} />
        <div className="h-28 rounded-2xl" style={{ background: 'var(--card)' }} />
      </div>
    </div>
  );

  if (authLoading) {
    return <LoadingSkeleton />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Bạn chưa đăng nhập</h2>
        <p className="mt-2" style={{ color: 'var(--sub)' }}>Hãy đăng nhập để xem tiến trình học tập.</p>
        <div className="mt-6">
          <Link href="/login" className="rounded-xl px-4 py-2 text-white" style={{ background: 'var(--accent)' }}>Đăng nhập</Link>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return <div className="mx-auto max-w-3xl p-6 text-red-700">Lỗi: {error}</div>;
  }

  const stats = [
    { label: 'Streak', value: `${streak} ngày`, icon: 'fire' as const, hint: streak > 0 ? 'Giữ lửa nào!' : 'Bắt đầu hôm nay' },
    { label: 'Điểm trung bình', value: avgScore.toFixed(2), icon: 'star' as const, hint: '0..1' },
    { label: 'Tổng câu đã luyện', value: String(totalPracticed), icon: 'sum' as const },
  ];

  return (
    <div className="mx-auto max-w-5xl p-0">
      <TopHeader />
      <div className="px-3 py-3 sm:p-6">
        <div className="mb-3 flex justify-end">
          <Link href="/practice" className="w-full rounded-xl px-4 py-2 text-center text-white sm:w-auto" style={{ background: 'var(--accent)' }}>Bắt đầu ngay</Link>
        </div>
        <StatsGrid stats={stats} />

        <div className="mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2">
        <TodayPanel completed={todayCount} total={10} avg={todayAvgScore} />
        <WeeklyMiniChart days={last7} />
      </div>

        <div className="mt-6 flex justify-end">
          <Link href="/progress" className="text-sm underline underline-offset-4" style={{ color: 'var(--speaker)' }}>Xem chi tiết</Link>
        </div>
      </div>
    </div>
  );
}


