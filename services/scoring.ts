export function scoreByPinyin(target: string, recognized: string): number {
  const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  const a = norm(target).split(' ');
  const b = norm(recognized).split(' ');
  if (!a.length || !b.length) return 0;
  let hit = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) hit++;
  return +(hit / a.length).toFixed(2);
}


