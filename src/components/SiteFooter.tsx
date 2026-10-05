import { MotionPreferenceControls } from "./MotionPreferenceControls";
import "./SiteFooter.css";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <div className="footer__brand">
          <p className="wordmark footer__wordmark" aria-hidden="true">
            OBSIDIAN
          </p>
          <p className="footer__credit">OBSIDIAN — an original fragrance website concept by 13:33.</p>
          <p className="concept-note">Fictional brand and product. Portfolio demonstration. No orders or payments.</p>
        </div>
        <nav className="footer__nav" aria-label="Footer">
          <a className="text-link" href="#fragrance">
            The Fragrance
          </a>
          <a className="text-link" href="#object">
            The Object
          </a>
          <a className="text-link" href="#discover">
            Discover
          </a>
          <a className="text-link" href="#top">
            Back to top
          </a>
        </nav>
        <div className="footer__meta">
          <MotionPreferenceControls />
          <p className="concept-note">
            Typefaces: Cormorant Garamond and Hanken Grotesk (SIL Open Font License). Imagery: original renders and
            generated still lifes made for this concept.
          </p>
        </div>
      </div>
    </footer>
  );
}
