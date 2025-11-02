export const normalizePinyin = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();


