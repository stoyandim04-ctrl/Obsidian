/**
 * Pack dist/ into a claude.ai Artifact preview. The page keeps Vite's own <script type="module">
 * and stylesheet links (published beside it as supporting files) so chunk-relative imports keep
 * working; only the document skeleton is removed (the Artifact host adds it).
 * Artifacts don't serve .glb, so the model ships as glTF JSON with an embedded buffer and the
 * viewer chunk is pointed at it (GLTFLoader detects the format from content, not the extension).
 * An artifact version holds at most 511 files, so the film frames (768) are packed into interleaved
 * atlases of FRAMES_PER_ATLAS frames and the page is told so via window.__FILM_ATLAS (ScrollFilm.tsx).
 * The production build (dist/) keeps one file per frame.
 *   npm run build && node scripts/build-artifact.mjs   → artifact/index.html + artifact/files.json
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const FRAMES_PER_ATLAS = 4;

const DIST = "dist";
const OUT = "artifact";
const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const head = html
  .match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>/, "")
  .replace(/<meta name="viewport"[^>]*>/, "")
  .replace(/<title>[^<]*<\/title>/, "<title>OBSIDIAN No. 01</title>")
  // per-frame preloads don't exist in the atlas packaging
  .replace(/\s*<!--[^>]*first film frame[^>]*-->/, "")
  .replace(/\s*<link rel="preload" as="image" type="image\/webp" href="\.\/media\/film\/[^>]*>/g, "")
  .concat(`\n<script>window.__FILM_ATLAS = ${FRAMES_PER_ATLAS};</script>`);
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "models"), { recursive: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), `${head.trim()}\n${body.trim()}\n`);

const glb = fs.readFileSync(path.join(DIST, "models/obsidian-no01.glb"));
const jsonLen = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8"));
const binStart = 20 + jsonLen;
const bin = glb.subarray(binStart + 8, binStart + 8 + glb.readUInt32LE(binStart));
gltf.buffers = [{ byteLength: bin.length, uri: `data:application/octet-stream;base64,${bin.toString("base64")}` }];
fs.writeFileSync(path.join(OUT, "models/obsidian-no01.json"), JSON.stringify(gltf));

const viewerChunk = fs.readdirSync(path.join(DIST, "assets")).find((f) => /^ProductViewer-.*\.js$/.test(f));
const chunkSrc = fs.readFileSync(path.join(DIST, "assets", viewerChunk), "utf8");
if (!chunkSrc.includes("models/obsidian-no01.glb")) throw new Error("model URL not found in viewer chunk");
fs.writeFileSync(path.join(OUT, "assets", viewerChunk), chunkSrc.replace("models/obsidian-no01.glb", "models/obsidian-no01.json"));

const files = {
  "models/obsidian-no01.json": path.join(OUT, "models/obsidian-no01.json"),
  [`assets/${viewerChunk}`]: path.join(OUT, "assets", viewerChunk),
};

// film atlases: atlas j = frames j, j+A, j+2A, j+3A stacked vertically (A = number of atlases)
const FILM = path.join(DIST, "media/film");
for (const dir of fs.readdirSync(FILM)) {
  const frames = fs.readdirSync(path.join(FILM, dir)).filter((f) => /^\d{4}\.webp$/.test(f)).sort();
  const n = frames.length;
  const A = Math.ceil(n / FRAMES_PER_ATLAS);
  const { width: w, height: h } = await sharp(path.join(FILM, dir, frames[0])).metadata();
  fs.mkdirSync(path.join(OUT, "media/film", dir), { recursive: true });
  let bytes = 0;
  for (let j = 0; j < A; j++) {
    const parts = [];
    for (let k = 0; k < FRAMES_PER_ATLAS; k++) {
      const i = Math.min(j + k * A, n - 1);
      parts.push({ input: path.join(FILM, dir, frames[i]), left: 0, top: k * h });
    }
    const rel = `media/film/${dir}/a${String(j).padStart(3, "0")}.webp`;
    await sharp({ create: { width: w, height: h * FRAMES_PER_ATLAS, channels: 3, background: "#0b0c0e" } })
      .composite(parts).webp({ quality: 80, effort: 5 }).toFile(path.join(OUT, rel));
    bytes += fs.statSync(path.join(OUT, rel)).size;
    files[rel] = path.join(OUT, rel);
  }
  console.log(dir, n, "frames →", A, "atlases", `${(bytes / 1024 / 1024).toFixed(1)} MB`);
}
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else {
      const rel = path.relative(DIST, p);
      if (rel === "index.html" || rel.endsWith(".glb") || files[rel] || rel.startsWith(`media${path.sep}film${path.sep}`)) continue;
      files[rel] = p;
    }
  }
};
walk(DIST);
fs.writeFileSync(path.join(OUT, "files.json"), JSON.stringify(files));
console.log(Object.keys(files).length, "files");
