import { forwardRef } from "react";

interface Props {
  /** Path under /media without extension; `.webm` (VP9) and `.mp4` (H.264) must both exist. */
  name: string;
  className?: string;
  poster?: string;
  onPlaying?: () => void;
  onPause?: () => void;
  onError?: () => void;
}

const BASE = `${import.meta.env.BASE_URL}media/`;

/** Muted, inline, decorative loop. Errors surface from the last <source>, which is where browsers report them. */
export const LoopVideo = forwardRef<HTMLVideoElement, Props>(function LoopVideo(
  { name, className, poster, onPlaying, onPause, onError },
  ref,
) {
  return (
    <video
      ref={ref}
      className={className}
      poster={poster}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
      onPlaying={onPlaying}
      onPause={onPause}
      onError={onError}
    >
      <source src={`${BASE}${name}.webm`} type='video/webm; codecs="vp9"' />
      <source src={`${BASE}${name}.mp4`} type="video/mp4" onError={onError} />
    </video>
  );
});
