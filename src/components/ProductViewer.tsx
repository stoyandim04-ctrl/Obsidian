import { useEffect, useRef, useState } from "react";
import { BottleViewer } from "../viewer/BottleViewer";
import "./ProductViewer.css";

const BASE = import.meta.env.BASE_URL;
const STEP = (15 * Math.PI) / 180;

interface Props {
  size: string;
  onClose: () => void;
}

/** Genuine interactive 3D view: drag, arrow keys, reset. Loaded on demand (code-split with three.js). */
export default function ProductViewer({ size, onClose }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const viewer = useRef<BottleViewer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!canvas.current || !stage.current) return;
    const lite = window.matchMedia("(pointer: coarse), (max-width: 899px)").matches;
    const v = new BottleViewer(canvas.current, {
      modelUrl: `${BASE}models/obsidian-no01.glb`,
      labelUrl: (s) => `${BASE}models/label-${s}.webp`,
      size,
      lite,
      onError: setError,
    });
    viewer.current = v;
    const ro = new ResizeObserver(() => v.resize());
    ro.observe(stage.current);
    const io = new IntersectionObserver(([e]) => v.setVisible(e.isIntersecting));
    io.observe(stage.current);
    const onVis = () => v.setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    stage.current.focus({ preventScroll: true });
    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      v.dispose();
      viewer.current = null;
    };
    // size changes are applied below without rebuilding the scene
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    viewer.current?.setLabel(size);
  }, [size]);

  // pointer drag
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let last: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!last) return;
      viewer.current?.rotateBy((e.clientX - last.x) * 0.012, (e.clientY - last.y) * 0.004);
      last = { x: e.clientX, y: e.clientY };
    };
    const up = () => (last = null);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);

  const announce = () => {
    const d = viewer.current?.yawDegrees ?? 0;
    setStatus(`Rotated to ${Math.abs(d)} degrees ${d < 0 ? "left" : d > 0 ? "right" : ""}`.trim());
  };

  const onKey = (e: React.KeyboardEvent) => {
    const v = viewer.current;
    if (!v) return;
    switch (e.key) {
      case "ArrowLeft":
        v.rotateBy(-STEP);
        break;
      case "ArrowRight":
        v.rotateBy(STEP);
        break;
      case "ArrowUp":
        v.rotateBy(0, -STEP / 3);
        break;
      case "ArrowDown":
        v.rotateBy(0, STEP / 3);
        break;
      case "Home":
      case "0":
        v.reset();
        break;
      case "Escape":
        onClose();
        return;
      default:
        return;
    }
    e.preventDefault();
    announce();
  };

  return (
    <div className="viewer">
      {error ? (
        <p className="viewer__error" role="status">
          {error} The product images above show the same object.
        </p>
      ) : (
        <div
          ref={stage}
          className="viewer__stage"
          tabIndex={0}
          role="application"
          aria-roledescription="3D viewer"
          aria-label={`OBSIDIAN No. 01, ${size} mL, interactive 3D view`}
          aria-describedby="viewer-help"
          onKeyDown={onKey}
        >
          <canvas ref={canvas} className="viewer__canvas" />
        </div>
      )}
      <p id="viewer-help" className="viewer__help">
        Drag to rotate. Keyboard: arrow keys rotate, Home resets, Escape closes.
      </p>
      <div className="viewer__tools">
        <button type="button" className="text-link" onClick={() => (viewer.current?.reset(), setStatus("View reset"))}>
          Reset view
        </button>
        <button type="button" className="text-link" onClick={onClose}>
          Close 3D view
        </button>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
