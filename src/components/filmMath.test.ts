import { describe, expect, it } from "vitest";
import { atlasSlot, chapterOpacity, loadOrder, remapProgress } from "./filmMath";

describe("loadOrder", () => {
  it("visits every frame exactly once, first and last frame first", () => {
    for (const n of [1, 2, 30, 120, 264]) {
      const o = loadOrder(n);
      expect(o).toHaveLength(n);
      expect(new Set(o).size).toBe(n);
      expect(o[0]).toBe(0);
      if (n > 1) expect(o[1]).toBe(n - 1);
    }
  });
  it("is coarse to fine: the first 10 frames are spread across the film", () => {
    const o = loadOrder(264).slice(0, 10);
    expect(Math.max(...o)).toBe(263);
    expect(o.filter((i) => i > 128).length).toBeGreaterThanOrEqual(4);
  });
});

describe("remapProgress", () => {
  const keys: [number, number][] = [[0, 0], [0.2, 0.5], [0.3, 0.5], [1, 1]];
  it("passes through without keys", () => expect(remapProgress(0.37)).toBe(0.37));
  it("hits the keys and holds on flat segments", () => {
    expect(remapProgress(0, keys)).toBe(0);
    expect(remapProgress(0.2, keys)).toBeCloseTo(0.5);
    expect(remapProgress(0.25, keys)).toBeCloseTo(0.5);
    expect(remapProgress(1, keys)).toBe(1);
  });
  it("is monotonic", () => {
    let prev = -1;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const v = remapProgress(p, keys);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });
});

describe("chapterOpacity", () => {
  const c = { from: 0.4, to: 0.6 };
  it("is 0 outside, 1 inside, and fades at the edges", () => {
    expect(chapterOpacity(c, 0.2)).toBe(0);
    expect(chapterOpacity(c, 0.5)).toBe(1);
    expect(chapterOpacity(c, 0.4)).toBeCloseTo(0.5);
    expect(chapterOpacity(c, 0.8)).toBe(0);
  });
  it("keeps a pinned first chapter fully visible from the very top", () => {
    expect(chapterOpacity({ from: 0, to: 0.1, pinStart: true }, 0)).toBe(1);
  });
});

describe("atlasSlot", () => {
  it("maps every frame to a unique (atlas, slot) within bounds", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 264; i++) {
      const [a, s] = atlasSlot(i, 264, 4);
      expect(a).toBeLessThan(66);
      expect(s).toBeLessThan(4);
      seen.add(`${a}:${s}`);
    }
    expect(seen.size).toBe(264);
  });
});
