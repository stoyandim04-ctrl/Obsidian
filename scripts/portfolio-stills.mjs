/**
 * Project hero still, card thumbnail and reel posters for the 13:33 portfolio package.
 *   node scripts/portfolio-stills.mjs        (after reel.mjs, for the posters)
 * Hero + thumbnail come from the 2560×1440 Blender master (source/renders/hero_desktop.png), lifted to
 * the page black like every render on the site.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BG = [11, 12, 14];
const OUT = "portfolio";
const lift = (img) => img.linear(BG.map((b) => (255 - b) / 255), BG);
const master = async () => {
  const raw = await sharp("source/renders/hero_desktop.png").removeAlpha().toColourspace("srgb").raw({ depth: "uchar" }).toBuffer({ resolveWithObject: true });
  return lift(sharp(raw.data, { raw: raw.info }));
};

fs.mkdirSync(`${OUT}/hero`, { recursive: true });
fs.mkdirSync(`${OUT}/thumbnail`, { recursive: true });
await (await master()).jpeg({ quality: 88, mozjpeg: true, progressive: true }).toFile(`${OUT}/hero/obsidian-hero-2560.jpg`);
await (await master()).resize(1600).webp({ quality: 82 }).toFile(`${OUT}/hero/obsidian-hero-1600.webp`);
// 16:10 card: keep the bottle (right of centre in the master) and some of the quiet left
const { width, height } = await sharp("source/renders/hero_desktop.png").metadata();
const cw = Math.round(height * 1.6);
const left = Math.min(width - cw, Math.max(0, Math.round(width * 0.69 - cw * 0.62)));
const card = async () => (await master()).extract({ left, top: 0, width: cw, height });
await (await card()).resize(1600, 1000).jpeg({ quality: 86, mozjpeg: true, progressive: true }).toFile(`${OUT}/thumbnail/obsidian-thumb-1600x1000.jpg`);
await (await card()).resize(800, 500).webp({ quality: 82 }).toFile(`${OUT}/thumbnail/obsidian-thumb-800x500.webp`);

for (const r of ["16x9", "9x16"]) {
  const v = path.join(OUT, "reel", `obsidian-reel-${r}.mp4`);
  if (!fs.existsSync(v)) continue;
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", "0.6", "-i", v, "-frames:v", "1", "-q:v", "3", path.join(OUT, "reel", `poster-${r}.jpg`)]);
}
for (const d of ["hero", "thumbnail", "reel"]) {
  if (!fs.existsSync(`${OUT}/${d}`)) continue;
  for (const f of fs.readdirSync(`${OUT}/${d}`)) console.log(`${OUT}/${d}/${f}`, `${Math.round(fs.statSync(`${OUT}/${d}/${f}`).size / 1024)} KB`);
}
