export const TZ = 'America/Guayaquil';

export function todayStr(): string {
  const d = new Date();
  const y = new Intl.DateTimeFormat('es-EC', { year: 'numeric', timeZone: TZ }).format(d);
  const m = new Intl.DateTimeFormat('es-EC', { month: '2-digit', timeZone: TZ }).format(d);
  const day = new Intl.DateTimeFormat('es-EC', { day: '2-digit', timeZone: TZ }).format(d);
  return `${y}-${m}-${day}`;
}

export function addDaysStr(baseISO: string, delta: number): string {
  const [y, m, d] = baseISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m - 1), d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const y2 = dt.getUTCFullYear();
  const m2 = `${dt.getUTCMonth() + 1}`.padStart(2, '0');
  const d2 = `${dt.getUTCDate()}`.padStart(2, '0');
  return `${y2}-${m2}-${d2}`;
}

