const DAY_MS = 24 * 60 * 60 * 1000;

/** 'AAAA-MM-DD' → Date em UTC (meia-noite), como o PostgreSQL guarda colunas DATE. */
export const parseDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

/** Date → 'AAAA-MM-DD' */
export const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export const todayUtc = () => parseDate(new Date().toISOString().slice(0, 10));

export const daysBetween = (start: Date, end: Date) =>
  Math.round((end.getTime() - start.getTime()) / DAY_MS);
