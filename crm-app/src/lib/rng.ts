/** Deterministic PRNG (mulberry32) so demo data is stable across reloads/builds. */
export function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

export function pickSome<T>(rand: () => number, arr: readonly T[], min: number, max: number): T[] {
  const n = min + Math.floor(rand() * (max - min + 1));
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(rand() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function range(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

export function intRange(rand: () => number, min: number, max: number): number {
  return Math.floor(range(rand, min, max + 1));
}
