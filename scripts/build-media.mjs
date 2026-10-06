/**
 * Builds responsive web derivatives from masters in source/ into public/media
 * and writes src/data/media.json (intrinsic sizes + available widths).
 *
 *   node scripts/build-media.mjs            # all
 *   node scripts/build-media.mjs hero       # only keys containing "hero"
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "public", "media");
const MANIFEST = path.join(ROOT, "src", "data", "media.json");
const BG = [11, 12, 14]; // --bg #0B0C0E

/** Lift pure black to the page background so renders sit seamlessly on the page. */
const liftToBg = (img) => img.linear(BG.map((b) => (255 - b) / 255), BG);

/** Light grade for generated still lifes so they share the campaign palette. */
const gradeStill = (img) => img.modulate({ saturation: 0.86, brightness: 0.97 }).linear([1.02, 1.0, 0.95], [0, 0, 0]);

const R = (f) => path.join(ROOT, "source", "renders", f);

const JOBS = [
  { key: "product-50", src: R("product_50.png"), widths: [640, 960, 1280, 1600], lift: true },
  { key: "product-100", src: R("product_100.png"), widths: [640, 960, 1280, 1600], lift: true },
  { key: "closing-desktop", src: R("closing_desktop.png"), widths: [1280, 1920, 2560], lift: true },
  { key: "closing-mobile", src: R("closing_mobile.png"), widths: [600, 900, 1200], lift: true },
  { key: "closing-desktop-b", src: R("closing_desktop_b.png"), widths: [1280, 1920, 2560], lift: true },
  { key: "closing-mobile-b", src: R("closing_mobile_b.png"), widths: [600, 900, 1200], lift: true },
];

const filter = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};

for (const job of JOBS) {
  if (filter && !job.key.includes(filter)) continue;
  if (!fs.existsSync(job.src)) {
    console.warn("missing master, skipped:", path.relative(ROOT, job.src));
    continue;
  }
  // stage 1: decode to 8-bit sRGB (renders are 16-bit PNGs; offsets must be applied in 8-bit space)
  let first = sharp(job.src).removeAlpha().toColourspace("srgb");
  if (job.crop) first = first.extract(job.crop);
  const raw = await first.raw({ depth: "uchar" }).toBuffer({ resolveWithObject: true });
  // stage 2: grade / lift
  let base = sharp(raw.data, { raw: raw.info });
  if (job.grade) base = gradeStill(base);
  if (job.lift) base = liftToBg(base);
  const master = await base.png().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = master.info;
  const widths = job.widths.filter((w) => w <= W);
  // drop stale derivatives of this key (exact pattern, so "closing-desktop" never touches "closing-desktop-b")
  const stale = new RegExp(`^${job.key}-\\d+\\.(avif|webp|jpg)$`);
  for (const f of fs.readdirSync(OUT)) if (stale.test(f)) fs.unlinkSync(path.join(OUT, f));
  for (const w of widths) {
    const img = () => sharp(master.data).resize({ width: w });
    await img().avif({ quality: 58, effort: 6, chromaSubsampling: "4:4:4" }).toFile(path.join(OUT, `${job.key}-${w}.avif`));
    await img().webp({ quality: 80, effort: 6 }).toFile(path.join(OUT, `${job.key}-${w}.webp`));
    await img().jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(path.join(OUT, `${job.key}-${w}.jpg`));
  }
  manifest[job.key] = { w: W, h: H, widths };
  const sizes = widths.map((w) => `${w}:${(fs.statSync(path.join(OUT, `${job.key}-${w}.avif`)).size / 1024).toFixed(0)}KB`);
  console.log(job.key, `${W}x${H}`, "avif", sizes.join(" "));
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log("manifest ->", path.relative(ROOT, MANIFEST));
