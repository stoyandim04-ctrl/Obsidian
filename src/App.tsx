import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { SiteHeader } from "./components/SiteHeader";
import { ScrollFilm } from "./components/ScrollFilm";
import { NOTES, NOTES_CHAPTERS, NOTES_REMAP, REVEAL, REVEAL_CHAPTERS } from "./data/films";
import { ProductSelection } from "./components/ProductSelection";
import { ClosingScene } from "./components/ClosingScene";
import { SiteFooter } from "./components/SiteFooter";
import { DemoBagDrawer } from "./components/DemoBagDrawer";
import { MotionProvider } from "./media/motion";
import { addItem, bagStore, EMPTY_BAG, itemCount, removeItem, setQty, subtotalCents } from "./state/bag";
import { formatPrice, PRODUCT, variantBySku, type Variant } from "./data/product";

export default function App() {
  const bag = useSyncExternalStore(bagStore.subscribe, bagStore.get, () => EMPTY_BAG);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const bagButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const count = itemCount(bag);

  const say = (msg: string) => {
    // clear first so repeated identical messages are still announced
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(msg));
  };

  const openBag = (trigger: HTMLElement | null) => {
    returnFocus.current = trigger;
    setOpen(true);
  };

  const onAdd = (v: Variant, trigger: HTMLButtonElement) => {
    const next = addItem(bag, v.sku);
    bagStore.set(next);
    say(`${PRODUCT.name}, ${v.label} added to demo bag. ${itemCount(next)} ${itemCount(next) === 1 ? "item" : "items"}, subtotal ${formatPrice(subtotalCents(next))}.`);
    openBag(trigger);
  };

  const onClose = useCallback(() => {
    setOpen(false);
    const el = returnFocus.current ?? bagButton.current;
    requestAnimationFrame(() => el?.focus());
  }, []);

  const onQty = (sku: string, qty: number) => {
    const next = setQty(bag, sku, qty);
    bagStore.set(next);
    const line = next.lines.find((l) => l.sku === sku);
    say(`Quantity ${line?.qty ?? qty}. Subtotal ${formatPrice(subtotalCents(next))}.`);
  };

  const onRemove = (sku: string) => {
    const next = removeItem(bag, sku);
    bagStore.set(next);
    say(`${PRODUCT.name}, ${variantBySku(sku)?.label ?? ""} removed. Subtotal ${formatPrice(subtotalCents(next))}.`);
    if (next.lines.length === 0) requestAnimationFrame(() => document.querySelector<HTMLElement>(".bag__close")?.focus());
  };

  return (
    <MotionProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader bagCount={count} onOpenBag={() => openBag(bagButton.current)} bagButtonRef={bagButton} />
      <main id="main" tabIndex={-1}>
        <ScrollFilm
          id="top"
          label="OBSIDIAN No. 01 — the object: the bottle turns, the cap lifts, the atomizer releases a mist of amber droplets."
          desktop={REVEAL.desktop}
          mobile={REVEAL.mobile}
          length={6}
          chapters={REVEAL_CHAPTERS}
          anchors={[{ id: "object", at: 0.2 }]}
          priority
        />
        <ScrollFilm
          id="fragrance"
          label="The fragrance in three acts: droplets fall and become bergamot and pepper, then iris and cedarwood, then amber resin and vetiver."
          desktop={NOTES.desktop}
          mobile={NOTES.mobile}
          length={7}
          chapters={NOTES_CHAPTERS}
          remap={NOTES_REMAP}
        />
        <ProductSelection onAdd={onAdd} />
        <ClosingScene />
      </main>
      <SiteFooter />
      <DemoBagDrawer open={open} bag={bag} onClose={onClose} onQty={onQty} onRemove={onRemove} />
      <div className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </div>
    </MotionProvider>
  );
}
