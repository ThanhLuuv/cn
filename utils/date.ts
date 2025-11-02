export const toYMD = (d = new Date()) => d.toISOString().slice(0, 10);
export const isSameYMD = (a: Date, b: Date) => toYMD(a) === toYMD(b);


