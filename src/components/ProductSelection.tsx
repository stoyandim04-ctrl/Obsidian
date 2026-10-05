import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { Picture } from "./Picture";
import { DEFAULT_SIZE, formatPrice, PRODUCT, VARIANTS, variantBySize, type SizeId, type Variant } from "../data/product";
import { webglAvailable } from "../viewer/BottleViewer";
import "./ProductSelection.css";

const ProductViewer = lazy(() => import("./ProductViewer"));

interface Props {
  onAdd: (v: Variant, trigger: HTMLButtonElement) => void;
}

export function ProductSelection({ onAdd }: Props) {
  const [size, setSize] = useState<SizeId>(DEFAULT_SIZE);
  const [viewing, setViewing] = useState(false);
  const rotateBtn = useRef<HTMLButtonElement>(null);
  const canRotate = useMemo(() => typeof window !== "undefined" && webglAvailable(), []);
  const variant = variantBySize(size);

  const closeViewer = () => {
    setViewing(false);
    requestAnimationFrame(() => rotateBtn.current?.focus());
  };

  return (
    <section id="discover" className="product" aria-labelledby="product-title">
      <div className="wrap grid product__grid">
        <div className="product__visual">
          <div className="product__frame">
            {VARIANTS.map((v) => (
              <div key={v.size} className={`product__image${v.size === size ? " is-current" : ""}`} aria-hidden={v.size !== size}>
                <Picture
                  name={`product-${v.size}`}
                  alt={v.size === size ? `OBSIDIAN No. 01 bottle, front label reading ${v.label}.` : ""}
                  sizes="(min-width: 900px) 50vw, 100vw"
                />
              </div>
            ))}
            {viewing && (
              <Suspense fallback={<p className="product__loading" role="status">Loading 3D view…</p>}>
                <ProductViewer size={size} onClose={closeViewer} />
              </Suspense>
            )}
          </div>
        </div>

        <div className="product__panel">
          <div className="section-head">
            <p className="label label--accent">Discover</p>
            <h2 id="product-title" className="h3 product__name">
              {PRODUCT.name}
            </h2>
            <p className="product__descriptor">{PRODUCT.descriptor}</p>
          </div>

          <fieldset className="sizes">
            <legend className="label">Size</legend>
            <div className="sizes__options">
              {VARIANTS.map((v) => (
                <label key={v.size} className="size-option">
                  <input
                    type="radio"
                    name="size"
                    value={v.size}
                    checked={v.size === size}
                    onChange={() => setSize(v.size)}
                  />
                  <span className="size-option__box">
                    <span className="size-option__label">{v.label}</span>
                    <span className="size-option__price">{formatPrice(v.priceCents)}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="concept-note sizes__note">Illustrative demo prices — this product is not for sale.</p>
          </fieldset>

          <div className="product__buy">
            <p className="product__price" aria-live="polite">
              <span className="visually-hidden">Selected: {variant.label}, </span>
              {formatPrice(variant.priceCents)}
              <span className="product__price-tag"> demo price</span>
            </p>
            <button type="button" className="btn btn--primary btn--block" onClick={(e) => onAdd(variant, e.currentTarget)}>
              Add to demo bag
            </button>
            {canRotate && (
              <button
                ref={rotateBtn}
                type="button"
                className="btn btn--block"
                aria-pressed={viewing}
                onClick={() => (viewing ? closeViewer() : setViewing(true))}
              >
                {viewing ? "Back to photograph" : "Rotate object"}
              </button>
            )}
          </div>

          <p className="product__disclosure">
            <strong>Portfolio demo — no orders or payments.</strong> OBSIDIAN is a fictional brand created by 13:33 to show
            cinematic product presentation. Nothing here can be bought, and no personal data is collected.
          </p>
        </div>
      </div>
    </section>
  );
}
