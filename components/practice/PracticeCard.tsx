type Props = { idx: number; zh: string; pinyin: string; vi: string; topic: string; children?: React.ReactNode };

export function PracticeCard({ idx, zh, pinyin, vi, topic, children }: Props) {
  return (
    <div className="rounded border p-4">
      <div className="text-sm text-gray-500">#{idx} • {topic}</div>
      <div className="mt-1 text-xl">{zh}</div>
      <div className="text-gray-700">{pinyin}</div>
      <div className="text-gray-500">{vi}</div>
      <div className="mt-3 flex items-center gap-3">{children}</div>
    </div>
  );
}


