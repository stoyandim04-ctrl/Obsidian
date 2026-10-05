import { describe, expect, it } from "vitest";
import { addItem, EMPTY_BAG, itemCount, parseBag, removeItem, setQty, subtotalCents, MAX_QTY } from "./bag";

const S50 = "obsidian-no01-50";
const S100 = "obsidian-no01-100";

describe("bag arithmetic", () => {
  it("adds, merges and totals in integer cents", () => {
    let b = addItem(EMPTY_BAG, S50);
    b = addItem(b, S50);
    b = addItem(b, S100);
    expect(itemCount(b)).toBe(3);
    expect(subtotalCents(b)).toBe(2 * 14000 + 21000);
  });

  it("clamps quantity to 1–9", () => {
    let b = addItem(EMPTY_BAG, S50, 20);
    expect(b.lines[0].qty).toBe(MAX_QTY);
    b = setQty(b, S50, 0);
    expect(b.lines[0].qty).toBe(1);
    b = setQty(b, S50, 4.7);
    expect(b.lines[0].qty).toBe(4);
    expect(subtotalCents(b)).toBe(56000);
  });

  it("removes lines", () => {
    const b = removeItem(addItem(addItem(EMPTY_BAG, S50), S100), S50);
    expect(b.lines.map((l) => l.sku)).toEqual([S100]);
    expect(subtotalCents(b)).toBe(21000);
  });

  it("ignores unknown SKUs", () => {
    expect(addItem(EMPTY_BAG, "fake-sku")).toBe(EMPTY_BAG);
  });
});

describe("persisted data validation", () => {
  it("recovers from malformed JSON and shapes", () => {
    expect(parseBag("{not json")).toEqual(EMPTY_BAG);
    expect(parseBag(null)).toEqual(EMPTY_BAG);
    expect(parseBag({ lines: "x" })).toEqual(EMPTY_BAG);
    expect(parseBag(JSON.stringify([1, 2]))).toEqual(EMPTY_BAG);
  });

  it("drops invalid lines and never trusts stored prices", () => {
    const raw = JSON.stringify({
      lines: [
        { sku: S50, qty: 2, priceCents: 1 },
        { sku: "x", qty: 1 },
        { sku: S100, qty: -3 },
        { sku: S100, qty: "2" },
        { sku: S100, qty: 1.5 },
        { sku: S50, qty: 50 },
      ],
    });
    const b = parseBag(raw);
    expect(b.lines).toEqual([{ sku: S50, qty: MAX_QTY }]);
    expect(subtotalCents(b)).toBe(MAX_QTY * 14000);
  });
});
