type Sentence = { id: string; topic: string; pinyin: string; zh: string; vi: string; };
type Progress = { sentenceId: string; score: number; date: string; };

export function pickDailySet(all: Sentence[], history: Progress[]): { new5: Sentence[]; review5: Sentence[] } {
  // 1) 5 mới: câu chưa có trong history
  const learnedIds = new Set(history.map(h => h.sentenceId));
  const fresh = all.filter(s => !learnedIds.has(s.id)).slice(0, 5);
  // 2) 5 ôn: câu điểm thấp nhất gần đây
  const byWorst = [...history].sort((a, b) => a.score - b.score).slice(0, 5);
  const review = byWorst.map(h => all.find(s => s.id === h.sentenceId)).filter(Boolean) as Sentence[];
  return { new5: fresh, review5: review };
}


