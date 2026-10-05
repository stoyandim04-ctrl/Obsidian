/** Single source of truth for the fictional product. Prices are illustrative demo values. */

export type SizeId = "50" | "100";

export interface Variant {
  sku: string;
  size: SizeId;
  label: string;
  /** Illustrative demo price in integer euro cents. */
  priceCents: number;
}

export const PRODUCT = {
  name: "OBSIDIAN No. 01",
  descriptor: "Eau de Parfum · Fragrance concept",
} as const;

export const VARIANTS: readonly Variant[] = [
  { sku: "obsidian-no01-50", size: "50", label: "50 mL", priceCents: 14000 },
  { sku: "obsidian-no01-100", size: "100", label: "100 mL", priceCents: 21000 },
] as const;

export const DEFAULT_SIZE: SizeId = "50";

export function variantBySku(sku: string): Variant | undefined {
  return VARIANTS.find((v) => v.sku === sku);
}

export function variantBySize(size: SizeId): Variant {
  const v = VARIANTS.find((x) => x.size === size);
  if (!v) throw new Error(`Unknown size ${size}`);
  return v;
}

const euro = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(cents: number): string {
  return euro.format(cents / 100);
}

export const SCENT_CHAPTERS = [
  {
    id: "opening",
    act: "Opening",
    title: "The first spark.",
    notes: "Bergamot · Black pepper",
    body: "Bright citrus meets a dry, sharp edge.",
    image: "scent-opening",
    alt: "A curl of bergamot peel and a few black peppercorns on dark volcanic stone in warm raking light.",
    tone: "dark",
  },
  {
    id: "heart",
    act: "Heart",
    title: "The quiet centre.",
    notes: "Iris · Cedarwood",
    body: "Soft floral texture, grounded in wood.",
    image: "scent-heart",
    alt: "A pale iris petal beside a curled cedarwood shaving on warm ivory stone in soft window light.",
    tone: "light",
  },
  {
    id: "base",
    act: "Base",
    title: "What remains.",
    notes: "Amber accord · Vetiver",
    body: "Warmth and earthy depth close the composition.",
    image: "scent-base",
    alt: "Warm light glowing through a piece of amber-coloured resin beside dry vetiver roots on dark stone.",
    tone: "dark",
  },
] as const;
