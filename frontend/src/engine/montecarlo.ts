function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SimInput {
  start: number;
  monthly: number;
  stepUp: number;
  months: number;
  ret: number;
  vol: number;
  target: number;
  runs: number;
  seed?: number;
  withBands?: boolean;
}

export interface Band { year: number; p10: number; p50: number; p90: number }

export function simulateGoal(i: SimInput): { prob: number; bands: Band[]; median: number } {
  const rand = mulberry32(i.seed ?? 42);
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  if (i.months <= 0) {
    return { prob: i.start >= i.target ? 1 : 0, bands: [{ year: 0, p10: i.start, p50: i.start, p90: i.start }], median: i.start };
  }
  const mu = i.ret / 1200;
  const sd = i.vol / 100 / Math.sqrt(12);
  const years = Math.ceil(i.months / 12);
  const byYear: number[][] = Array.from({ length: years + 1 }, () => []);
  const finals: number[] = [];
  let hits = 0;

  for (let r = 0; r < i.runs; r++) {
    let v = i.start;
    let a = i.monthly;
    if (i.withBands) byYear[0].push(v);
    for (let m = 0; m < i.months; m++) {
      if (m > 0 && m % 12 === 0) a *= 1 + i.stepUp / 100;
      v = Math.max(0, (v + a) * (1 + mu + sd * gauss()));
      if (i.withBands && (m + 1) % 12 === 0) byYear[(m + 1) / 12].push(v);
    }
    if (i.withBands && i.months % 12 !== 0) byYear[years].push(v);
    finals.push(v);
    if (v >= i.target) hits++;
  }

  const q = (arr: number[], p: number) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
  };
  const bands = i.withBands ? byYear.map((arr, year) => ({ year, p10: q(arr, 0.1), p50: q(arr, 0.5), p90: q(arr, 0.9) })) : [];
  return { prob: hits / i.runs, bands, median: q(finals, 0.5) };
}
