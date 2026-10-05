import { useEffect, useRef, useState } from "react";
import { Picture } from "./Picture";
import { LoopVideo } from "./LoopVideo";
import { MotionPreferenceControls } from "./MotionPreferenceControls";
import { useMotion } from "../media/motion";
import { useInView, useMediaQuery } from "../media/hooks";
import "./HeroScene.css";

const BASE = import.meta.env.BASE_URL;
const VIDEO = {
  desktop: { src: "hero-loop-desktop", poster: `${BASE}media/hero-desktop-1440.jpg` },
  mobile: { src: "hero-loop-mobile", poster: `${BASE}media/hero-mobile-900.jpg` },
};

/** Wait for the page to finish loading and the main thread to go idle before fetching heavy media. */
function whenIdle(cb: () => void): () => void {
  let cancelled = false;
  let idle = 0;
  const run = () => {
    if (cancelled) return;
    const ric = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 300));
    idle = ric(() => !cancelled && cb());
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", run);
    window.cancelIdleCallback?.(idle);
  };
}

export function HeroScene() {
  const { enabled } = useMotion();
  const desktop = useMediaQuery("(min-width: 600px)"); // landscape composition from tablet width up
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const inView = useInView(section);
  const [ready, setReady] = useState(false); // allowed to attach a source
  const variant = desktop ? VIDEO.desktop : VIDEO.mobile;
  // keyed by source so switching composition (resize across the breakpoint) starts clean
  const [playingSrc, setPlayingSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const playing = playingSrc === variant.src;
  const failed = failedSrc === variant.src;

  // Defer the video until the first screen (text, controls, poster) is done.
  useEffect(() => {
    if (!enabled) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    return whenIdle(() => setReady(true));
  }, [enabled]);

  // Play only when allowed, loaded and on screen; pause otherwise.
  useEffect(() => {
    const v = video.current;
    if (!v || !ready || failed) return;
    if (enabled && inView) {
      const p = v.play();
      p?.catch(() => setPlayingSrc(null)); // autoplay rejected: the poster stays, the toggle offers manual play
    } else {
      v.pause();
    }
  }, [enabled, inView, ready, failed, variant.src]);

  const showVideo = ready && !failed;

  return (
    <section ref={section} className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__media">
        <Picture
          name="hero-desktop"
          mobile={{ name: "hero-mobile", media: "(max-width: 599px)" }}
          alt="OBSIDIAN No. 01 — a smoked black glass perfume bottle with a satin black cap and a fine brass ring, lit by a warm edge light."
          sizes="100vw"
          priority
          className="hero__poster"
        />
        {showVideo && (
          <LoopVideo
            key={variant.src}
            ref={video}
            name={variant.src}
            poster={variant.poster}
            className={`hero__video${playing && enabled ? " is-playing" : ""}`}
            onPlaying={() => setPlayingSrc(variant.src)}
            onPause={() => setPlayingSrc(null)}
            onError={() => setFailedSrc(variant.src)}
          />
        )}
      </div>

      <div className="hero__content wrap">
        <div className="hero__text">
          <p className="label label--accent hero__eyebrow">OBSIDIAN — No. 01</p>
          <h1 id="hero-title" className="display hero__title">
            Leave an impression.
          </h1>
          <p className="lead hero__lead">A fragrance concept in dark glass. Bergamot, iris and amber, imagined in contrast.</p>
        </div>
        <div className="hero__ctas">
            <a className="btn btn--primary" href="#discover">
              Discover No. 01
            </a>
            <a className="btn hero__secondary" href="#fragrance">
              Explore the fragrance
            </a>
        </div>
      </div>

      <div className="hero__foot wrap">
        <p className="concept-note">Concept project by 13:33</p>
        <MotionPreferenceControls />
      </div>
    </section>
  );
}
