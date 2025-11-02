import { Flame, Star, Sigma } from 'lucide-react';

type Stat = { label: string; value: string; hint?: string; color?: string; icon?: 'fire' | 'star' | 'sum' };

export function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-2.5 sm:gap-4 sm:grid-cols-3">
      {stats.map((s, i) => (
        <div
          key={i}
          className="rounded-2xl p-3 sm:p-5 shadow-sm"
          style={{ background: 'var(--card)' }}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: 'rgba(14,111,121,.12)' }}>
              {s.icon === 'fire' && <Flame width={20} height={20} color={'var(--danger)'} />}
              {s.icon === 'star' && <Star width={20} height={20} color={'var(--speaker)'} />}
              {s.icon === 'sum' && <Sigma width={20} height={20} color={'var(--text)'} />}
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--sub)' }}>{s.label}</div>
              <div className="text-2xl font-extrabold" style={{ color: 'var(--text)' }}>{s.value}</div>
              {s.hint && <div className="text-xs" style={{ color: 'var(--sub)' }}>{s.hint}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


