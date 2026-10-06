import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useMotion } from "../media/motion";
import { useMediaQuery } from "../media/hooks";
import "./ScrollFilm.css";
import { atlasSlot, chapterOpacity, loadOrder, remapProgress } from "./filmMath";

export interface FilmSource {
  /** Folder under /media/film/, frames named 0000.webp … */
  dir: string;
  count: number;
  width: number;
  height: number;
}

export interface Chapter {
  id: string;
  /** Scroll window (0–1) in which the copy is visible; it fades over `fade` at each end. */
  from: number;
  to: number;
  /** Frame position (0–1) used as the still for this chapter when motion is off. */
  still: number;
  align?: "left" | "right" | "center";
  /** Text colour for this scene and its accent. */
  tone?: { text: string; accent: string; muted: string; shade?: "dark" | "light" };
  /** Keep this chapter fully visible at the very top (the hero copy). */
  pinStart?: boolean;
  children: ReactNode;
}

interface Props {
  id?: string;
  label: string;
  desktop: FilmSource;
  mobile: FilmSource;
  /** Section height in viewport heights: the scroll distance the film plays over. */
  length: number;
  chapters: Chapter[];
  anchors?: { id: string; at: number }[];
  priority?: boolean;
  /** Optional scroll→film remap as [scroll, film] keys (flat segments hold a frame). */
  remap?: [number, number][];
}

const BASE = `${import.meta.env.BASE_URL}media/film/`;
const src = (s: FilmSource, i: number) => `${BASE}${s.dir}/${String(i).padStart(4, "0")}.webp`;

/**
 * Preview packaging only (scripts/build-artifact.mjs sets window.__FILM_ATLAS): frames packed N per
 * file, interleaved — atlas j holds frames j, j+A, j+2A … (A = number of atlases) stacked vertically —
 * so every atlas covers the whole film and coarse-to-fine loading still works. 0 = one file per frame.
 */
const ATLAS = typeof window === "undefined" ? 0 : Number((window as { __FILM_ATLAS?: number }).__FILM_ATLAS ?? 0);
const atlasSrc = (s: FilmSource, j: number) => `${BASE}${s.dir}/a${String(j).padStart(3, "0")}.webp`;
const unitsFor = (n: number) => (ATLAS ? Math.ceil(n / ATLAS) : n);

interface Frame {
  img: HTMLImageElement;
  slot: number;
}

/** One film frame as a still picture (motion off). */
function Still({ source, index, eager }: { source: FilmSource; index: number; eager?: boolean }) {
  if (!ATLAS) {
    return <img src={src(source, index)} width={source.width} height={source.height} alt="" loading={eager ? "eager" : "lazy"} />;
  }
  const [atlas, slot] = atlasSlot(index, source.count, ATLAS);
  return (
    <div
      className="film__still-frame"
      style={{
        aspectRatio: `${source.width} / ${source.height}`,
        backgroundImage: `url(${atlasSrc(source, atlas)})`,
        backgroundSize: `100% ${ATLAS * 100}%`,
        backgroundPosition: `0 ${ATLAS > 1 ? (slot / (ATLAS - 1)) * 100 : 0}%`,
      }}
    />
  );
}

export function ScrollFilm({ id, label, desktop, mobile, length, chapters, anchors = [], priority, remap }: Props) {
  const { enabled } = useMotion();
  const isDesktop = useMediaQuery("(min-aspect-ratio: 1/1)");
  const source = isDesktop ? desktop : mobile;
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(Frame | null)[]>([]);
  const progress = useRef(0);
  const drawn = useRef(-1);
  const [p, setP] = useState(0);
  const [near, setNear] = useState(!!priority);

  // start streaming frames when the film is within a few screens
  useEffect(() => {
    if (priority || !section.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "200% 0px" });
    io.observe(section.current);
    return () => io.disconnect();
  }, [priority]);

  const draw = useMemo(
    () => (force = false) => {
      const c = canvas.current;
      const list = frames.current;
      if (!c || !list.length) return;
      const want = Math.round(progress.current * (list.length - 1));
      // nearest loaded frame
      let idx = -1;
      for (let d = 0; d < list.length; d++) {
        if (list[want - d]) {
          idx = want - d;
          break;
        }
        if (list[want + d]) {
          idx = want + d;
          break;
        }
      }
      if (idx < 0 || (idx === drawn.current && !force)) return;
      const { img, slot } = list[idx]!;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const fw = img.naturalWidth;
      const fh = ATLAS ? img.naturalHeight / ATLAS : img.naturalHeight;
      const cw = c.width;
      const ch = c.height;
      const s = Math.max(cw / fw, ch / fh);
      const w = fw * s;
      const h = fh * s;
      ctx.drawImage(img, 0, slot * fh, fw, fh, (cw - w) / 2, (ch - h) / 2, w, h);
      drawn.current = idx;
    },
    [],
  );

  // (re)load frames for the active source
  useEffect(() => {
    if (!near || !enabled) return;
    let cancelled = false;
    const n = source.count;
    const units = unitsFor(n);
    frames.current = new Array(n).fill(null);
    drawn.current = -1;
    const order = loadOrder(units);
    let next = 0;
    const worker = async () => {
      while (!cancelled && next < order.length) {
        const j = order[next++];
        const img = new Image();
        img.decoding = "async";
        img.src = ATLAS ? atlasSrc(source, j) : src(source, j);
        try {
          await img.decode();
        } catch {
          continue;
        }
        if (cancelled) return;
        if (ATLAS) for (let k = 0; k < ATLAS && j + k * units < n; k++) frames.current[j + k * units] = { img, slot: k };
        else frames.current[j] = { img, slot: 0 };
        draw();
      }
    };
    for (let k = 0; k < 6; k++) worker();
    return () => {
      cancelled = true;
    };
  }, [near, enabled, source, draw]);

  // canvas size follows the sticky stage
  useEffect(() => {
    const c = canvas.current;
    if (!c || !enabled) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
      draw(true);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    resize();
    return () => ro.disconnect();
  }, [enabled, draw]);

  // scroll → progress → frame (rAF-throttled, passive; normal browser scrolling)
  useEffect(() => {
    if (!enabled) return;
    const el = section.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      const v = range > 0 ? Math.min(1, Math.max(0, -r.top / range)) : 0;
      progress.current = remapProgress(v, remap);
      draw();
      setP((prev) => (Math.abs(prev - v) > 0.002 ? v : prev));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled, draw, remap]);

  // ---------- motion off: the same story as still frames, normal flow ----------
  if (!enabled) {
    return (
      <section id={id} className="film film--static" aria-label={label}>
        {anchors.map((a) => (
          <span key={a.id} id={a.id} className="film__anchor film__anchor--static" />
        ))}
        {chapters.map((c) => (
          <div key={c.id} className={`film__still film__still--${c.align ?? "left"}`} style={toneStyle(c)}>
            <Still source={source} index={Math.round(c.still * (source.count - 1))} eager={priority && c === chapters[0]} />
            <div className="film__copy film__copy--static">{c.children}</div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section id={id} ref={section} className="film" style={{ height: `${length * 100}svh` }} aria-label={label}>
      {anchors.map((a) => (
        <span key={a.id} id={a.id} className="film__anchor" style={{ top: `${a.at * 100}%` }} />
      ))}
      <div className="film__stage">
        {priority && !ATLAS && (
          <img
            className="film__poster"
            src={src(source, 0)}
            width={source.width}
            height={source.height}
            alt=""
            fetchPriority="high"
          />
        )}
        <canvas ref={canvas} className="film__canvas" aria-hidden="true" />
        <div className={`film__shade film__shade--${shadeFor(chapters, p)}`} aria-hidden="true" />
        {chapters.map((c) => {
          const o = chapterOpacity(c, p);
          return (
            <div
              key={c.id}
              className={`film__copy film__copy--${c.align ?? "left"}`}
              style={{ ...toneStyle(c), opacity: o, transform: `translateY(${(1 - o) * 18}px)`, pointerEvents: o > 0.5 ? "auto" : "none" }}
            >
              {c.children}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function shadeFor(chapters: Chapter[], p: number): "dark" | "light" | "none" {
  let best: Chapter | null = null;
  let bestO = 0;
  for (const c of chapters) {
    const o = chapterOpacity(c, p);
    if (o > bestO) {
      bestO = o;
      best = c;
    }
  }
  return best ? (best.tone?.shade ?? "dark") : "none";
}

function toneStyle(c: Chapter): CSSProperties {
  return c.tone
    ? ({ "--film-text": c.tone.text, "--film-accent": c.tone.accent, "--film-muted": c.tone.muted } as CSSProperties)
    : {};
}
