/**
 * Pack dist/ into a claude.ai Artifact preview: artifact/index.html (main CSS + JS inlined,
 * no document skeleton — the Artifact host adds it) plus every other dist file published beside it.
 *   npm run build && node scripts/build-artifact.mjs
 * Prints the JSON `files` map for the Artifact publish call to artifact/files.json.
 */
import fs from "node:fs";
import path from "node:path";

const DIST = "dist";
const OUT = "artifact";
const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const cssHref = html.match(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/)[1];
const jsSrc = html.match(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/)[1];
let css = fs.readFileSync(path.join(DIST, cssHref), "utf8").replaceAll("../fonts/", "fonts/");
let js = fs.readFileSync(path.join(DIST, jsSrc), "utf8");
// an inline module resolves relative imports against the page, so point chunks at assets/
js = js.replace(/(["`])\.\/(ProductViewer-[\w-]+\.(?:js|css))\1/g, "$1./assets/$2$1");

const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>/, "")
  .replace(/<meta name="viewport"[^>]*>/, "")
  .replace(/<link rel="stylesheet"[^>]*>/, "")
  .replace(/<script type="module"[^>]*><\/script>/, "");
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1].replace(/<script type="module"[^>]*><\/script>/, "");

const page = `${head.trim().replace(/<title>[^<]*<\/title>/, "<title>OBSIDIAN No. 01</title>")}
<style>${css}</style>
${body.trim()}
<script type="module">${js.replaceAll("</script", "<\\/script")}</script>
`;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), page);

// Artifacts don't serve .glb: ship the same model as glTF JSON with an embedded buffer and point the
// viewer chunk at it (GLTFLoader detects the format from content, not the extension).
const glb = fs.readFileSync(path.join(DIST, "models/obsidian-no01.glb"));
const jsonLen = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8"));
const binStart = 20 + jsonLen;
const binLen = glb.readUInt32LE(binStart);
const bin = glb.subarray(binStart + 8, binStart + 8 + binLen);
gltf.buffers = [{ byteLength: bin.length, uri: `data:application/octet-stream;base64,${bin.toString("base64")}` }];
fs.mkdirSync(path.join(OUT, "models"), { recursive: true });
fs.writeFileSync(path.join(OUT, "models/obsidian-no01.json"), JSON.stringify(gltf));
const viewerChunk = fs.readdirSync(path.join(DIST, "assets")).find((f) => /^ProductViewer-.*\.js$/.test(f));
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
fs.writeFileSync(
  path.join(OUT, "assets", viewerChunk),
  fs.readFileSync(path.join(DIST, "assets", viewerChunk), "utf8").replace("models/obsidian-no01.glb", "models/obsidian-no01.json"),
);

const files = {
  "models/obsidian-no01.json": path.join(OUT, "models/obsidian-no01.json"),
  [`assets/${viewerChunk}`]: path.join(OUT, "assets", viewerChunk),
};
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else {
      const rel = path.relative(DIST, p);
      if (rel === "index.html" || rel === cssHref || rel === jsSrc || rel.endsWith(".glb") || files[rel]) continue;
      files[rel] = p;
    }
  }
};
walk(DIST);
fs.writeFileSync(path.join(OUT, "files.json"), JSON.stringify(files));
console.log("page", (page.length / 1024).toFixed(0), "KB;", Object.keys(files).length, "files");
