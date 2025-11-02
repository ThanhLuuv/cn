type Day = { date: string; count: number; avg: number };

export function WeeklyMiniChart({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map(d => d.count));
  return (
    <section className="rounded-2xl p-3 sm:p-5 shadow-sm" style={{ background: 'var(--card)' }} aria-label="7 ngày qua">
      <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>7 ngày qua</h3>
      <div className="mt-4 grid grid-cols-7 items-end gap-2">
        {days.map((d, i) => {
          const h = Math.round((d.count / max) * 84) + 8; // min 8px
          const color = d.avg >= 0.8 ? 'var(--danger)' : d.avg >= 0.5 ? 'var(--speaker)' : 'var(--accent)';
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-6 rounded-md" style={{ height: h, background: color }} />
              <div className="text-[10px]" style={{ color: 'var(--sub)' }}>{d.date.slice(5)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


