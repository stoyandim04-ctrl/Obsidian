/**
 * Motion preference: decorative motion runs only when the OS does not ask for
 * reduced motion AND the visitor has not paused it with the on-page control.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const KEY = "obsidian.motionPaused";

/** "on" / "off" when the visitor chose explicitly, null otherwise. */
function readChoice(): "on" | "off" | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

interface MotionCtx {
  /** OS-level reduced motion request. */
  reduced: boolean;
  /** Visitor paused decorative motion. */
  paused: boolean;
  /** True when decorative motion may play. */
  enabled: boolean;
  setPaused: (p: boolean) => void;
}

const Ctx = createContext<MotionCtx>({ reduced: false, paused: false, enabled: true, setPaused: () => {} });

export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const [choice, setChoice] = useState(readChoice);
  // Without an explicit choice, the OS setting decides; an explicit choice always wins.
  const paused = choice === null ? reduced : choice === "off";
  const setPaused = useCallback((p: boolean) => {
    const v = p ? "off" : "on";
    setChoice(v);
    try {
      window.localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
  }, []);
  const value = useMemo(() => ({ reduced, paused, enabled: !reduced && !paused, setPaused }), [reduced, paused, setPaused]);
  useEffect(() => {
    document.documentElement.dataset.motion = value.enabled ? "on" : "off";
  }, [value.enabled]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMotion = () => useContext(Ctx);
