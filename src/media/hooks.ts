import { useEffect, useRef, useState, type RefObject } from "react";

/** True while the element intersects the viewport (with optional margin). */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = "0px", once = false): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);
  return inView;
}

/** Media query as state. */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/**
 * Scroll progress (0..1) of a tall element through the viewport:
 * 0 when its top reaches the viewport top, 1 when its bottom reaches the viewport bottom.
 * rAF-throttled, passive, and only active while `active` is true.
 */
export function useScrollProgress<T extends HTMLElement>(ref: RefObject<T | null>, active: boolean): number {
  const [p, setP] = useState(0);
  const frame = useRef(0);
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      frame.current = 0;
      const r = el.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      const v = range > 0 ? Math.min(1, Math.max(0, -r.top / range)) : 0;
      setP((prev) => (Math.abs(prev - v) > 0.001 ? v : prev));
    };
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [ref, active]);
  return p;
}
