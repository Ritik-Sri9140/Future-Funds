export function inr(v: number): string {
  if (!isFinite(v)) return '—';
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(Math.round(v));
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(1)}L`;
  return `${sign}₹${a.toLocaleString('en-IN')}`;
}

export const inrFull = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;
export const pct = (v: number, d = 0) => (isFinite(v) ? `${v.toFixed(d)}%` : '—');
export const uid = () => Math.random().toString(36).slice(2, 10);

export function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shiftLocalDay(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return localDay(d);
}
