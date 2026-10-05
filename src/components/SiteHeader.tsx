import { useEffect, useRef, useState, type RefObject } from "react";
import "./SiteHeader.css";

const LINKS = [
  { href: "#fragrance", label: "The Fragrance" },
  { href: "#object", label: "The Object" },
  { href: "#discover", label: "Discover" },
];

interface Props {
  bagCount: number;
  onOpenBag: () => void;
  bagButtonRef: RefObject<HTMLButtonElement | null>;
}

export function SiteHeader({ bagCount, onOpenBag, bagButtonRef }: Props) {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtn.current?.focus();
      }
    };
    const onResize = () => window.innerWidth >= 900 && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  return (
    <header className={`site-header${solid || menuOpen ? " is-solid" : ""}`}>
      <div className="site-header__bar wrap">
        <a className="wordmark" href="#top" aria-label="OBSIDIAN — back to top">
          OBSIDIAN
        </a>
        <nav className="site-nav" aria-label="Primary">
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="site-header__actions">
          <button
            ref={bagButtonRef}
            type="button"
            className="bag-button"
            onClick={onOpenBag}
            aria-haspopup="dialog"
            aria-label={`Demo bag, ${bagCount} ${bagCount === 1 ? "item" : "items"}`}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4.5 7h11l-.9 10.5H5.4L4.5 7Z" stroke="currentColor" strokeWidth="1.2" />
              <path d="M7.5 7V5.5a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span className="bag-button__label">Bag</span>
            <span className="bag-button__count" aria-hidden="true">
              {bagCount}
            </span>
          </button>
          <button
            ref={menuBtn}
            type="button"
            className="menu-button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      <nav id="mobile-menu" className="mobile-menu" aria-label="Primary" hidden={!menuOpen}>
        <ul className="wrap">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setMenuOpen(false)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
