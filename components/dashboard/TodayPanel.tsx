export function TodayPanel({ completed, total, avg }: { completed: number; total: number; avg: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((completed / Math.max(1, total)) * 100)));
  return (
    <section className="rounded-2xl p-3 sm:p-5 shadow-sm" style={{ background: 'var(--card)' }} aria-label="Hôm nay">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Hôm nay</h3>
          <p className="text-sm" style={{ color: 'var(--sub)' }}>Tiến độ {completed}/{total} • Điểm TB {avg.toFixed(2)}</p>
        </div>
      </div>
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full" style={{ background: 'rgba(0,0,0,.07)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--speaker)' }} />
      </div>
    </section>
  );
}


