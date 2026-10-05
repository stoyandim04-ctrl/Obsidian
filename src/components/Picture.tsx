import media from "../data/media.json";

type MediaKey = keyof typeof media;
type Entry = { w: number; h: number; widths: number[] };

interface Props {
  name: MediaKey | string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Art-directed source for narrow viewports. */
  mobile?: { name: string; media: string };
}

const M = media as Record<string, Entry>;
const base = `${import.meta.env.BASE_URL}media/`;
const set = (key: string, ext: string) => M[key].widths.map((w) => `${base}${key}-${w}.${ext} ${w}w`).join(", ");

/** Responsive <picture>: AVIF → WebP → JPEG, intrinsic size reserved to avoid layout shift. */
export function Picture({ name, alt, sizes, className, priority, mobile }: Props) {
  const e = M[name];
  if (!e) return null;
  const mid = e.widths[Math.min(1, e.widths.length - 1)];
  const m = mobile && M[mobile.name] ? mobile : undefined;
  return (
    <picture className={className}>
      {m && <source media={m.media} type="image/avif" srcSet={set(m.name, "avif")} sizes="100vw" />}
      {m && <source media={m.media} type="image/webp" srcSet={set(m.name, "webp")} sizes="100vw" />}
      <source type="image/avif" srcSet={set(name, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set(name, "webp")} sizes={sizes} />
      <img
        src={`${base}${name}-${mid}.jpg`}
        srcSet={set(name, "jpg")}
        sizes={sizes}
        width={e.w}
        height={e.h}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
