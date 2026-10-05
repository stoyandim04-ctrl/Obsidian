import { useRef } from "react";
import { Picture } from "./Picture";
import { Reveal } from "./Reveal";
import { useMotion } from "../media/motion";
import { useInView } from "../media/hooks";
import media from "../data/media.json";
import "./ClosingScene.css";

const HAS_LIGHT_PASS = "closing-desktop-b" in media;

export function ClosingScene() {
  const { enabled } = useMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const animate = HAS_LIGHT_PASS && enabled && inView;
  return (
    <section ref={ref} className="closing" aria-labelledby="closing-title">
      <div className="closing__media">
        <Picture
          name="closing-desktop"
          mobile={{ name: "closing-mobile", media: "(max-width: 899px)" }}
          alt="The OBSIDIAN bottle on a low dark-stone plinth, outlined by a single warm beam of light."
          sizes="100vw"
        />
        {HAS_LIGHT_PASS && (
          <div className={`closing__light${animate ? " is-animating" : ""}`} aria-hidden="true">
            <Picture name="closing-desktop-b" mobile={{ name: "closing-mobile-b", media: "(max-width: 899px)" }} alt="" sizes="100vw" />
          </div>
        )}
      </div>
      <div className="wrap closing__content">
        <Reveal className="closing__text">
          <p className="label label--accent">OBSIDIAN — No. 01</p>
          <h2 id="closing-title" className="h2">
            Presence, distilled.
          </h2>
          <a className="btn btn--primary" href="#discover">
            Discover No. 01
          </a>
        </Reveal>
      </div>
    </section>
  );
}
