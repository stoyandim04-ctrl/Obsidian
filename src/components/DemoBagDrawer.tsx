import { useEffect, useRef } from "react";
import { formatPrice, PRODUCT } from "../data/product";
import { MAX_QTY, MIN_QTY, pricedLines, subtotalCents, type BagState } from "../state/bag";
import "./DemoBagDrawer.css";

interface Props {
  open: boolean;
  bag: BagState;
  onClose: () => void;
  onQty: (sku: string, qty: number) => void;
  onRemove: (sku: string) => void;
}

/**
 * Modal drawer on a native <dialog>: showModal() makes the rest of the page inert,
 * traps focus and closes on Escape. Focus is returned by the parent to the trigger.
 */
export function DemoBagDrawer({ open, bag, onClose, onQty, onRemove }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lines = pricedLines(bag);
  const subtotal = subtotalCents(bag);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.classList.add("has-modal");
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onDialogClose = () => {
      document.documentElement.classList.remove("has-modal");
      onClose();
    };
    d.addEventListener("close", onDialogClose);
    return () => d.removeEventListener("close", onDialogClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialog}
      className="bag"
      aria-labelledby="bag-title"
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close(); // backdrop click
      }}
    >
      <div className="bag__panel">
        <header className="bag__head">
          <h2 id="bag-title" className="bag__title">
            Demo bag
          </h2>
          <button type="button" className="bag__close" onClick={() => dialog.current?.close()} aria-label="Close demo bag">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
        </header>

        <p className="bag__disclosure">
          Portfolio demonstration by 13:33. OBSIDIAN is a fictional product: there is no checkout, no orders and no
          payments. Prices are illustrative.
        </p>

        {lines.length === 0 ? (
          <p className="bag__empty">Your demo bag is empty.</p>
        ) : (
          <ul className="bag__lines">
            {lines.map((l) => {
              const name = `${PRODUCT.name}, ${l.variant.label}`;
              return (
                <li key={l.sku} className="bag-line">
                  <div className="bag-line__info">
                    <p className="bag-line__name">{PRODUCT.name}</p>
                    <p className="bag-line__meta">
                      Eau de Parfum · {l.variant.label} · {formatPrice(l.variant.priceCents)} each
                    </p>
                  </div>
                  <div className="bag-line__controls">
                    <div className="qty" role="group" aria-label={`Quantity for ${name}`}>
                      <button
                        type="button"
                        className="qty__btn"
                        onClick={() => onQty(l.sku, l.qty - 1)}
                        disabled={l.qty <= MIN_QTY}
                        aria-label={`Decrease quantity of ${name}`}
                      >
                        −
                      </button>
                      <output className="qty__value" aria-label={`Quantity ${l.qty}`}>
                        {l.qty}
                      </output>
                      <button
                        type="button"
                        className="qty__btn"
                        onClick={() => onQty(l.sku, l.qty + 1)}
                        disabled={l.qty >= MAX_QTY}
                        aria-label={`Increase quantity of ${name}`}
                      >
                        +
                      </button>
                    </div>
                    <p className="bag-line__total">{formatPrice(l.lineCents)}</p>
                    <button type="button" className="bag-line__remove" onClick={() => onRemove(l.sku)} aria-label={`Remove ${name}`}>
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="bag__foot">
          <div className="bag__subtotal">
            <span className="label">Subtotal (demo)</span>
            <span className="bag__subtotal-value">{formatPrice(subtotal)}</span>
          </div>
          <p className="concept-note">Portfolio demo — no orders or payments.</p>
          <button type="button" className="btn btn--primary btn--block" onClick={() => dialog.current?.close()}>
            Continue exploring
          </button>
        </footer>
      </div>
    </dialog>
  );
}
