import { useEffect, useRef, useState } from "react";
import { Picture } from "./Picture";
import { LoopVideo } from "./LoopVideo";
import { useMotion } from "../media/motion";
import { useInView, useMediaQuery } from "../media/hooks";
import { Reveal } from "./Reveal";
import { SCENT_CHAPTERS } from "../data/product";
import "./ScentChapters.css";

export function ScentChapters() {
  return (
    <section id="fragrance" className="scent" aria-labelledby="scent-title">
      <div className="wrap scent__intro">
        <div className="section-head">
          <p className="label label--accent">The Fragrance</p>
          <h2 id="scent-title" className="h2">
            A composition in three acts.
          </h2>
        </div>
        <p className="concept-note scent__disclaimer">
          Fictional creative notes for a concept — not an ingredient list, formula or performance claim.
        </p>
      </div>

      {SCENT_CHAPTERS.map((c, i) => (
        <article
          key={c.id}
          className={`scent__row scent__row--${c.tone}${i % 2 ? " scent__row--flip" : ""}`}
          aria-labelledby={`scent-${c.id}`}
        >
          <div className="wrap grid scent__grid">
            <Reveal className="scent__image">
              <Picture name={c.image} alt={c.alt} sizes="(min-width: 900px) 56vw, 100vw" />
              {"video" in c && <AmbientVideo src={c.video} />}
            </Reveal>
            <Reveal className="scent__text">
              <p className="label scent__act">
                <span className="scent__index">{String(i + 1).padStart(2, "0")}</span> {c.act}
              </p>
              <h3 id={`scent-${c.id}`} className="h3">
                {c.title}
              </h3>
              <p className="scent__notes">{c.notes}</p>
              <p className="scent__body">{c.body}</p>
            </Reveal>
          </div>
        </article>
      ))}
    </section>
  );
}

/**
 * Decorative loop layered over its matching still. Attached only on desktop with motion on,
 * fetched when the row approaches the viewport, paused off-screen; the still remains the fallback.
 */
function AmbientVideo({ src }: { src: string }) {
  const { enabled } = useMotion();
  const desktop = useMediaQuery("(min-width: 900px)");
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const near = useInView(box, "300px 0px");
  const visible = useInView(box);
  const [attached, setAttached] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const allowed = enabled && desktop && !failed;

  if (allowed && near && !attached) setAttached(true);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (allowed && visible) v.play().catch(() => setPlaying(false));
    else v.pause();
  }, [allowed, visible, attached]);

  return (
    <div ref={box} className="scent__motion" aria-hidden="true">
      {attached && allowed && (
        <LoopVideo
          ref={video}
          name={src}
          className={playing ? "is-playing" : undefined}
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
