import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useMotion } from "../media/motion";
import { useMediaQuery } from "../media/hooks";
import "./ScrollFilm.css";

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
const FADE = 0.035;

/** Load order: coarse to fine, so any scroll position gets a nearby frame quickly. */
function loadOrder(n: number): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  const push = (i: number) => {
    if (i >= 0 && i < n && !seen.has(i)) {
      seen.add(i);
      order.push(i);
    }
  };
  push(0);
  push(n - 1);
  for (const step of [32, 16, 8, 4, 2, 1]) for (let i = 0; i < n; i += step) push(i);
  return order;
}

function chapterOpacity(c: Chapter, p: number): number {
  if (c.pinStart && p <= c.to - FADE) return 1;
  if (p < c.from - FADE || p > c.to + FADE) return 0;
  if (p < c.from + FADE) return (p - (c.from - FADE)) / (2 * FADE);
  if (p > c.to - FADE) return ((c.to + FADE) - p) / (2 * FADE);
  return 1;
}

function remapProgress(p: number, keys?: [number, number][]): number {
  if (!keys?.length) return p;
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [p0, f0] = keys[i - 1];
    const [p1, f1] = keys[i];
    if (p <= p1) {
      const u = p1 > p0 ? (p - p0) / (p1 - p0) : 1;
      const e = u * u * (3 - 2 * u);
      return f0 + (f1 - f0) * e;
    }
  }
  return keys[keys.length - 1][1];
}

export function ScrollFilm({ id, label, desktop, mobile, length, chapters, anchors = [], priority, remap }: Props) {
  const { enabled } = useMotion();
  const isDesktop = useMediaQuery("(min-aspect-ratio: 1/1)");
  const source = isDesktop ? desktop : mobile;
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(HTMLImageElement | null)[]>([]);
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
      const img = list[idx]!;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const cw = c.width;
      const ch = c.height;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      drawn.current = idx;
    },
    [],
  );

  // (re)load frames for the active source
  useEffect(() => {
    if (!near || !enabled) return;
    let cancelled = false;
    const n = source.count;
    frames.current = new Array(n).fill(null);
    drawn.current = -1;
    const order = loadOrder(n);
    let next = 0;
    const worker = async () => {
      while (!cancelled && next < order.length) {
        const i = order[next++];
        const img = new Image();
        img.decoding = "async";
        img.src = src(source, i);
        try {
          await img.decode();
        } catch {
          continue;
        }
        if (cancelled) return;
        frames.current[i] = img;
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
            <img
              src={src(source, Math.round(c.still * (source.count - 1)))}
              width={source.width}
              height={source.height}
              alt=""
              loading={priority && c === chapters[0] ? "eager" : "lazy"}
            />
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
        {priority && (
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
