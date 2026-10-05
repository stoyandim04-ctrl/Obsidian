import { useMotion } from "../media/motion";

/** Accessible toggle for all decorative motion on the page (video, scroll-linked frames, reveals). */
export function MotionPreferenceControls({ className = "" }: { className?: string }) {
  const { enabled, reduced, setPaused } = useMotion();
  return (
    <button
      type="button"
      className={`motion-toggle ${className}`}
      aria-pressed={!enabled}
      onClick={() => setPaused(enabled)}
      title={reduced && !enabled ? "Motion is reduced by your system setting" : undefined}
    >
      <span className="motion-toggle__icon" aria-hidden="true">
        {enabled ? (
          <svg width="10" height="12" viewBox="0 0 10 12">
            <rect x="0" y="0" width="3" height="12" fill="currentColor" />
            <rect x="7" y="0" width="3" height="12" fill="currentColor" />
          </svg>
        ) : (
          <svg width="10" height="12" viewBox="0 0 10 12">
            <path d="M0 0l10 6-10 6z" fill="currentColor" />
          </svg>
        )}
      </span>
      {enabled ? "Pause motion" : "Play motion"}
    </button>
  );
}
