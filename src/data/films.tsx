/**
 * The two scroll films. Frame folders are produced by scripts/build-film.mjs:
 *   reveal — Blender: hero → object → cap & brass ring → atomizer → spray (deterministic product)
 *   notes  — Higgsfield Kling 3.0: droplets → bergamot → iris → amber (no product in generated frames)
 */
import type { Chapter, FilmSource } from "../components/ScrollFilm";
import { MotionPreferenceControls } from "../components/MotionPreferenceControls";

export const REVEAL = {
  desktop: { dir: "reveal-d", count: 120, width: 1280, height: 720 } satisfies FilmSource,
  mobile: { dir: "reveal-m", count: 120, width: 576, height: 1024 } satisfies FilmSource,
};

export const NOTES = {
  desktop: { dir: "notes-d", count: 180, width: 1600, height: 900 } satisfies FilmSource,
  mobile: { dir: "notes-m", count: 180, width: 720, height: 1280 } satisfies FilmSource,
};

/** Notes film: three 5 s transitions; the scroll holds on each finished still. */
export const NOTES_REMAP: [number, number][] = [
  [0, 0],
  [0.22, 1 / 3],
  [0.34, 1 / 3],
  [0.56, 2 / 3],
  [0.68, 2 / 3],
  [0.9, 1],
  [1, 1],
];

const BRASS = { text: "#F2EEE7", accent: "#B89261", muted: "#B9B2A8" };
const AMBER = { text: "#F7EBDA", accent: "#E3A04B", muted: "#D2C2AD" };
const CITRUS = { text: "#F4F1E4", accent: "#D9D27C", muted: "#C3BFA8" };
const IRIS = { text: "#1D1922", accent: "#6F5C8E", muted: "#4C4455", shade: "light" as const };

export const REVEAL_CHAPTERS: Chapter[] = [
  {
    id: "hero",
    from: 0,
    to: 0.1,
    still: 0,
    pinStart: true,
    tone: BRASS,
    children: (
      <>
        <div className="film__hero-text">
          <p className="label">OBSIDIAN — No. 01</p>
          <h1 id="hero-title" className="display">
            Leave an impression.
          </h1>
          <p className="lead">A fragrance concept in dark glass. Bergamot, iris and amber, imagined in contrast.</p>
        </div>
        <div className="film__hero-actions">
          <div className="hero__ctas">
            <a className="btn btn--primary" href="#discover">
              Discover No. 01
            </a>
            <a className="btn" href="#fragrance">
              Explore the fragrance
            </a>
          </div>
          <div className="film__hero-foot">
            <p className="concept-note">Concept project by 13:33 · Scroll to unveil</p>
            <MotionPreferenceControls />
          </div>
        </div>
      </>
    ),
  },
  {
    id: "object",
    from: 0.17,
    to: 0.33,
    still: 0.25,
    tone: BRASS,
    children: (
      <>
        <p className="label">The Object</p>
        <h2 className="h2">Dark glass. Quiet presence.</h2>
        <p className="lead">A sculpted silhouette. A weight of glass. Light held at the edges.</p>
      </>
    ),
  },
  {
    id: "cap",
    from: 0.4,
    to: 0.52,
    still: 0.45,
    align: "right",
    tone: BRASS,
    children: (
      <>
        <p className="label">Cap &amp; ring</p>
        <h2 className="h2">A fine line of brass.</h2>
        <p className="lead">Satin black above, warm brass where cap meets glass.</p>
      </>
    ),
  },
  {
    id: "atomizer",
    from: 0.56,
    to: 0.7,
    still: 0.6,
    tone: AMBER,
    children: (
      <>
        <p className="label">The atomizer</p>
        <h2 className="h2">Press once.</h2>
        <p className="lead">A fine mist of amber, released in a single breath.</p>
      </>
    ),
  },
  {
    id: "spray",
    from: 0.82,
    to: 1,
    still: 0.92,
    align: "center",
    tone: AMBER,
    children: (
      <>
        <p className="label">From the first drop</p>
        <h2 className="h2">Every drop, a beginning.</h2>
      </>
    ),
  },
];

export const NOTES_CHAPTERS: Chapter[] = [
  {
    id: "intro",
    from: 0,
    to: 0.13,
    still: 0.05,
    align: "center",
    tone: AMBER,
    children: (
      <>
        <p className="label">The Fragrance</p>
        <h2 className="h2">A composition in three acts.</h2>
        <p className="concept-note">Fictional creative notes for a concept — not an ingredient list, formula or performance claim.</p>
      </>
    ),
  },
  {
    id: "opening",
    from: 0.2,
    to: 0.37,
    still: 1 / 3,
    tone: CITRUS,
    children: (
      <>
        <p className="label">01 · Opening</p>
        <h3 className="h2">The first spark.</h3>
        <p className="film__notes">Bergamot · Black pepper</p>
        <p className="lead">Bright citrus meets a dry, sharp edge.</p>
      </>
    ),
  },
  {
    id: "heart",
    from: 0.54,
    to: 0.71,
    still: 2 / 3,
    tone: IRIS,
    children: (
      <>
        <p className="label">02 · Heart</p>
        <h3 className="h2">The quiet centre.</h3>
        <p className="film__notes">Iris · Cedarwood</p>
        <p className="lead">Soft floral texture, grounded in wood.</p>
      </>
    ),
  },
  {
    id: "base",
    from: 0.86,
    to: 1,
    still: 1,
    tone: AMBER,
    children: (
      <>
        <p className="label">03 · Base</p>
        <h3 className="h2">What remains.</h3>
        <p className="film__notes">Amber accord · Vetiver</p>
        <p className="lead">Warmth and earthy depth close the composition.</p>
      </>
    ),
  },
];
