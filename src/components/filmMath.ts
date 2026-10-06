/** Pure scroll-film maths, shared by ScrollFilm and its tests. */
import type { Chapter } from "./ScrollFilm";

/** Copy fade length at either end of a chapter window (fraction of the film's scroll). */
export const FADE = 0.035;

/** Atlas j of A holds frames j, j+A, j+2A …; returns [atlas, slot] for frame i of n. */
export function atlasSlot(i: number, n: number, perAtlas: number): [number, number] {
  const atlases = Math.ceil(n / perAtlas);
  return [i % atlases, Math.floor(i / atlases)];
}

/** Load order: coarse to fine, so any scroll position gets a nearby frame quickly. */
export function loadOrder(n: number): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  const push = (i: number) => {
    if (i >= 0 && i < n && !seen.has(i)) {
      seen.add(i);
      order.push(i);
    }
  };
  push(0);
  push(n - 1);
  for (const step of [32, 16, 8, 4, 2, 1]) for (let i = 0; i < n; i += step) push(i);
  return order;
}

export function chapterOpacity(c: Pick<Chapter, "from" | "to" | "pinStart">, p: number): number {
  if (c.pinStart && p <= c.to - FADE) return 1;
  if (p < c.from - FADE || p > c.to + FADE) return 0;
  if (p < c.from + FADE) return (p - (c.from - FADE)) / (2 * FADE);
  if (p > c.to - FADE) return ((c.to + FADE) - p) / (2 * FADE);
  return 1;
}

export function remapProgress(p: number, keys?: [number, number][]): number {
  if (!keys?.length) return p;
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p0, f0] = keys[i - 1];
    const [p1, f1] = keys[i];
    if (p <= p1) {
      const u = p1 > p0 ? (p - p0) / (p1 - p0) : 1;
      const e = u * u * (3 - 2 * u);
      return f0 + (f1 - f0) * e;
    }
  }
  return keys[keys.length - 1][1];
}
