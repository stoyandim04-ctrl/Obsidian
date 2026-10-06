/**
 * Build scroll-film frame folders in public/media/film/.
 *   node scripts/build-film.mjs reveal   # Blender frames (every 2nd of 240) → reveal-d / reveal-m
 *   node scripts/build-film.mjs notes    # Higgsfield transitions (3 × 5 s @ 12 fps) → notes-d / notes-m
 * Blender blacks are lifted to the page colour (#0B0C0E); generated video frames get the same grade
 * as the scent stills. WebP, quality tuned per film.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "public/media/film");
const BG = [11, 12, 14];
const which = process.argv[2];

async function writeFrames(files, dest, { width, height, lift = false, grade = false, quality = 74 }) {
  const dir = path.join(OUT, dest);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let bytes = 0;
  for (let i = 0; i < files.length; i++) {
    const raw = await sharp(files[i]).removeAlpha().toColourspace("srgb").resize({ width, height, fit: "cover" })
      .raw({ depth: "uchar" }).toBuffer({ resolveWithObject: true });
    let img = sharp(raw.data, { raw: raw.info });
    if (grade) img = img.modulate({ saturation: 0.9, brightness: 0.98 }).linear([1.02, 1.0, 0.96], [0, 0, 0]);
    if (lift) img = img.linear(BG.map((b) => (255 - b) / 255), BG);
    const f = path.join(dir, `${String(i).padStart(4, "0")}.webp`);
    await img.webp({ quality, effort: 5 }).toFile(f);
    bytes += fs.statSync(f).size;
  }
  console.log(dest, files.length, "frames", `${(bytes / 1024 / 1024).toFixed(1)} MB`, `avg ${(bytes / files.length / 1024).toFixed(0)} KB`);
}

if (which === "reveal") {
  for (const [src, dest, w, h] of [["reveal_desktop", "reveal-d", 1280, 720], ["reveal_mobile", "reveal-m", 576, 1024]]) {
    const dir = path.join(ROOT, "source/frames", src);
    if (!fs.existsSync(dir)) {
      console.warn("missing", src);
      continue;
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort().map((f) => path.join(dir, f));
    await writeFrames(files, dest, { width: w, height: h, lift: true, quality: 76 });
  }
}

if (which === "notes") {
  for (const [kind, dest, w, h] of [["16x9", "notes-d", 1600, 900], ["9x16", "notes-m", 720, 1280]]) {
    const tmp = path.join(ROOT, "source/frames", `notes_${kind}`);
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    let n = 0;
    for (const t of ["t0", "t1", "t2"]) {
      const video = path.join(ROOT, "source/generated", `hf_${t}_${kind}.mp4`);
      const seg = path.join(tmp, t);
      fs.mkdirSync(seg, { recursive: true });
      // 12 fps, exactly 60 frames per 5 s transition
      execFileSync("ffmpeg", ["-v", "error", "-i", video, "-vf", "fps=12", "-frames:v", "60", path.join(seg, "%04d.png")]);
      for (const f of fs.readdirSync(seg).sort()) fs.renameSync(path.join(seg, f), path.join(tmp, `${String(n++).padStart(4, "0")}.png`));
      fs.rmSync(seg, { recursive: true });
    }
    const files = fs.readdirSync(tmp).filter((f) => f.endsWith(".png")).sort().map((f) => path.join(tmp, f));
    await writeFrames(files, dest, { width: w, height: h, grade: true, quality: 80 });
  }
}
