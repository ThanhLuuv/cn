export function ScoreBadge({ score }: { score: number }) {
  const color = score >= 0.8 ? 'bg-green-600' : score >= 0.5 ? 'bg-yellow-600' : 'bg-red-600';
  return (
    <span className={`rounded px-2 py-0.5 text-xs text-white ${color}`}>{score.toFixed(2)}</span>
  );
}


