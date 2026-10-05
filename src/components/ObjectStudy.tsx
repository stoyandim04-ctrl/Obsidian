import { useRef } from "react";
import { Picture } from "./Picture";
import { useMotion } from "../media/motion";
import { useMediaQuery, useScrollProgress } from "../media/hooks";
import "./ObjectStudy.css";

/** Storyboard O0–O3. `at` is the local scroll position where each frame is fully shown. */
const FRAMES = [
  {
    key: "object-o0",
    at: 0,
    term: "Silhouette",
    text: "A rounded block of smoked glass, softened at every edge.",
    alt: "Three-quarter view of the black glass bottle on a dark surface.",
  },
  {
    key: "object-o1",
    at: 0.28,
    term: "Cap",
    text: "Satin black and cylindrical, set above a short neck.",
    alt: "The satin black cap and the upper shoulder of the glass.",
  },
  {
    key: "object-o2",
    at: 0.58,
    term: "Ring",
    text: "A fine line of warm brass where cap meets glass.",
    alt: "Macro of the brass ring at the base of the cap and the rounded glass shoulder.",
  },
  {
    key: "object-o3",
    at: 0.86,
    term: "Base",
    text: "A thick glass base keeps the light low and close to the ground.",
    alt: "The thick smoked glass base glowing faintly amber above its reflection.",
  },
] as const;

/** Later frames sit on top, so each frame only needs to fade in over the one below. */
function frameOpacity(i: number, p: number): number {
  if (i === 0) return 1;
  const fade = Math.min(0.12, (FRAMES[i].at - FRAMES[i - 1].at) / 2);
  return Math.min(1, Math.max(0, (p - (FRAMES[i].at - fade)) / fade));
}

export function ObjectStudy() {
  const { enabled } = useMotion();
  const desktop = useMediaQuery("(min-width: 900px)");
  const sequence = desktop && enabled; // the one extended sticky sequence
  const ref = useRef<HTMLElement>(null);
  const p = useScrollProgress(ref, sequence);
  const active = FRAMES.reduce((a, f, i) => (p >= f.at - 0.06 ? i : a), 0);

  return (
    <section ref={ref} id="object" className={`object${sequence ? " object--sequence" : ""}`} aria-labelledby="object-title">
      <div className="wrap object__grid grid">
        <div className="object__visual" aria-hidden={sequence ? undefined : true}>
          {sequence ? (
            <div className="object__stage">
              {FRAMES.map((f, i) => {
                const o = frameOpacity(i, p);
                // subtle push-in while a frame is held, like a slow camera move
                const local = Math.min(1, Math.max(0, (p - f.at) / 0.3));
                return (
                  <div
                    key={f.key}
                    className="object__frame"
                    style={{ opacity: o, transform: `scale(${1.04 - 0.04 * (1 - local)})` }}
                  >
                    <Picture name={f.key} alt={i === active ? f.alt : ""} sizes="(min-width: 900px) 58vw, 100vw" />
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="object__copy">
          <div className="section-head object__head">
            <p className="label label--accent">The Object</p>
            <h2 id="object-title" className="h2">
              Dark glass. Quiet presence.
            </h2>
            <p className="lead">A sculpted silhouette. A weight of glass. Light held at the edges.</p>
          </div>

          {sequence ? (
            <dl className="object__notes">
              {FRAMES.map((f, i) => (
                <div key={f.key} className={`object__note${i === active ? " is-active" : ""}`}>
                  <dt className="label">{f.term}</dt>
                  <dd>{f.text}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="object__stack">
              {[FRAMES[0], FRAMES[2], FRAMES[3]].map((f) => (
                <figure key={f.key} className="object__figure">
                  <Picture name={f.key} alt={f.alt} sizes="(min-width: 900px) 40vw, 100vw" />
                  <figcaption>
                    <span className="label">{f.term}</span> {f.text}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
