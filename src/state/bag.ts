/**
 * Demo bag state — pure functions + a small external store.
 * Persisted to localStorage only. Prices are never persisted: they are always
 * re-derived from the catalogue so tampered storage cannot change them.
 */
import { variantBySku, type Variant } from "../data/product";

export const STORAGE_KEY = "obsidian.demoBag.v1";
export const MIN_QTY = 1;
export const MAX_QTY = 9;

export interface BagLine {
  sku: string;
  qty: number;
}

export interface BagState {
  lines: BagLine[];
}

export const EMPTY_BAG: BagState = { lines: [] };

export function clampQty(n: number): number {
  if (!Number.isFinite(n)) return MIN_QTY;
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.trunc(n)));
}

/** Validate anything read from storage; malformed input degrades to an empty or partial bag. */
export function parseBag(raw: unknown): BagState {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return EMPTY_BAG;
    }
  }
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { lines?: unknown }).lines)) return EMPTY_BAG;
  const seen = new Map<string, number>();
  for (const item of (raw as { lines: unknown[] }).lines) {
    if (!item || typeof item !== "object") continue;
    const { sku, qty } = item as { sku?: unknown; qty?: unknown };
    if (typeof sku !== "string" || !variantBySku(sku)) continue;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < MIN_QTY) continue;
    seen.set(sku, clampQty((seen.get(sku) ?? 0) + qty));
  }
  return { lines: [...seen].map(([sku, qty]) => ({ sku, qty })) };
}

export function addItem(state: BagState, sku: string, qty = 1): BagState {
  if (!variantBySku(sku)) return state;
  const existing = state.lines.find((l) => l.sku === sku);
  if (existing) {
    return { lines: state.lines.map((l) => (l.sku === sku ? { ...l, qty: clampQty(l.qty + qty) } : l)) };
  }
  return { lines: [...state.lines, { sku, qty: clampQty(qty) }] };
}

export function setQty(state: BagState, sku: string, qty: number): BagState {
  return { lines: state.lines.map((l) => (l.sku === sku ? { ...l, qty: clampQty(qty) } : l)) };
}

export function removeItem(state: BagState, sku: string): BagState {
  return { lines: state.lines.filter((l) => l.sku !== sku) };
}

export function itemCount(state: BagState): number {
  return state.lines.reduce((n, l) => n + l.qty, 0);
}

export interface PricedLine extends BagLine {
  variant: Variant;
  lineCents: number;
}

export function pricedLines(state: BagState): PricedLine[] {
  return state.lines.flatMap((l) => {
    const variant = variantBySku(l.sku);
    return variant ? [{ ...l, variant, lineCents: variant.priceCents * l.qty }] : [];
  });
}

export function subtotalCents(state: BagState): number {
  return pricedLines(state).reduce((sum, l) => sum + l.lineCents, 0);
}

// ---------------------------------------------------------------- store

type Listener = () => void;

function read(): BagState {
  try {
    return parseBag(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_BAG;
  }
}

function write(state: BagState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode, blocked): the bag still works for this visit */
  }
}

let current: BagState | null = null;
const listeners = new Set<Listener>();

export const bagStore = {
  get(): BagState {
    if (current === null) current = typeof window === "undefined" ? EMPTY_BAG : read();
    return current;
  },
  set(next: BagState) {
    current = next;
    write(next);
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener) {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        current = read();
        l();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  },
};
