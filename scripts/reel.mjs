/**
 * 18-second website reel captured from the real site: both scroll films played by ordinary page scrolling,
 * then the real size selector and demo bag (no added fake interactions).
 *   node scripts/reel.mjs http://127.0.0.1:4173/ [desktop|mobile|both|retitle]
 * Frames come from the Chrome DevTools screencast, are timed with their own timestamps and
 * assembled into constant-frame-rate H.264 with ffmpeg. Output: portfolio/reel/.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { filmY, jump, sleep, smoothScroll, warmFilms } from "./lib/film.mjs";

const URL = process.argv[2] ?? "http://127.0.0.1:4173/";
const which = process.argv[3] ?? "both";
const OUT = path.resolve("portfolio/reel");
const TMP = path.resolve("qa-artifacts/reel-tmp");
const SERIF = path.resolve("source/fonts/CormorantGaramond[wght].ttf");
const SANS = path.resolve("source/fonts/HankenGrotesk[wght].ttf");
fs.mkdirSync(OUT, { recursive: true });

/** Record `durationMs` of the page while `action` runs; returns an mp4 path of exactly durationMs. */
async function record(page, cdp, name, durationMs, size, action = async () => {}) {
  const dir = path.join(TMP, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  const onFrame = async ({ data, metadata, sessionId }) => {
    const f = path.join(dir, `${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(f, Buffer.from(data, "base64"));
    frames.push({ f, t: metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  };
  cdp.on("Page.screencastFrame", onFrame);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: size.w, maxHeight: size.h, everyNthFrame: 1 });
  const start = Date.now();
  await action();
  const left = durationMs - (Date.now() - start);
  if (left > 0) await sleep(left);
  await cdp.send("Page.stopScreencast");
  cdp.off("Page.screencastFrame", onFrame);
  if (!frames.length) throw new Error(`no frames for ${name}`);
  // variable-rate frames → concat list with real durations, trimmed/padded to the exact length
  const t0 = frames[0].t;
  const total = durationMs / 1000;
  let list = "ffconcat version 1.0\n";
  frames.forEach((fr, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t - t0 : total;
    const d = Math.max(0.001, Math.min(total, next) - (fr.t - t0));
    if (fr.t - t0 < total) list += `file '${fr.f}'\nduration ${d.toFixed(4)}\n`;
  });
  list += `file '${frames[frames.length - 1].f}'\n`;
  fs.writeFileSync(path.join(dir, "list.txt"), list);
  const mp4 = path.join(TMP, `${name}.mp4`);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"),
    "-vf", `fps=30,scale=${size.w}:${size.h}:flags=lanczos,format=yuv420p,trim=duration=${total}`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-an", mp4]);
  return mp4;
}

async function session(browser, viewport, dpr, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => localStorage.clear());
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await warmFilms(page);
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, cdp };
}

function concatWithTitle(clips, size, out) {
  const list = path.join(TMP, `${path.basename(out)}.txt`);
  fs.writeFileSync(list, clips.map((c) => `file '${c}'`).join("\n"));
  const big = Math.round(size.h * (size.w > size.h ? 0.075 : 0.042));
  const small = Math.round(big * 0.3);
  const yTitle = `(h-${Math.round(big * 1.9)})/2`;
  const ySub = `(h-${Math.round(big * 1.9)})/2+${Math.round(big * 1.35)}`;
  // Title card over the closing scene only: the page dims to 10 % behind it from 15.2 s, so the
  // card never sits on top of the site's own headline.
  const vf = [
    `color=c=0x0B0C0E:s=${size.w}x${size.h}:d=18,format=rgba,fade=in:st=15.2:d=0.6:alpha=1,colorchannelmixer=aa=0.9[shade]`,
    `[0:v][shade]overlay=shortest=1,` +
      `drawtext=fontfile='${SERIF}':text='OBSIDIAN':fontcolor=0xF2EEE7:fontsize=${big}:x=(w-text_w)/2:y=${yTitle}:alpha='if(lt(t,15.5),0,min(1,(t-15.5)/0.6))',` +
      `drawtext=fontfile='${SANS}':text='CONCEPT BY 13\\:33':fontcolor=0xB89261:fontsize=${small}:x=(w-text_w)/2:y=${ySub}:alpha='if(lt(t,15.8),0,min(1,(t-15.8)/0.6))'`,
  ].join(";");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-filter_complex", vf,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out]);
  console.log("wrote", out);
}

/** One continuous take: reveal film → notes film → product + demo bag → closing (6.5 + 6 + 2.5 + 3 = 18 s). */
async function take(viewport, dpr, mobile, size, prefix) {
  const { ctx, page, cdp } = await session(browser, viewport, dpr, mobile);
  await jump(page, 0, 800);
  const clips = [];
  const revealEnd = await filmY(page, "#top", 1);
  clips.push(await record(page, cdp, `${prefix}1-reveal`, 6500, size, async () => {
    await sleep(1100);
    await smoothScroll(page, revealEnd, 5200);
  }));
  await jump(page, await filmY(page, "#fragrance", 0.02));
  const notesEnd = await filmY(page, "#fragrance", 0.97);
  clips.push(await record(page, cdp, `${prefix}2-notes`, 6000, size, () => smoothScroll(page, notesEnd, 5700)));
  // phone: the size options with the bottle above them; desktop: the whole product section
  await jump(page, mobile ? (await filmY(page, ".sizes")) - 240 : await filmY(page, "#discover"));
  clips.push(await record(page, cdp, `${prefix}3-product`, 2500, size, async () => {
    await sleep(300);
    await page.locator(".size-option", { hasText: "100 mL" }).click();
    await sleep(800);
    await page.getByRole("button", { name: "Add to demo bag" }).click();
  }));
  await page.keyboard.press("Escape");
  await jump(page, await filmY(page, ".closing"), 900);
  clips.push(await record(page, cdp, `${prefix}4-closing`, 3000, size));
  await ctx.close();
  return clips;
}

// re-cut the title card from the last recorded clips without recording again
if (which === "retitle") {
  const clips = (p) => ["1-reveal", "2-notes", "3-product", "4-closing"].map((c) => path.join(TMP, `${p}${c}.mp4`));
  if (fs.existsSync(clips("d")[3])) concatWithTitle(clips("d"), { w: 1920, h: 1080 }, path.join(OUT, "obsidian-reel-16x9.mp4"));
  if (fs.existsSync(clips("m")[3])) concatWithTitle(clips("m"), { w: 1080, h: 1920 }, path.join(OUT, "obsidian-reel-9x16.mp4"));
  process.exit(0);
}

const browser = await chromium.launch();
if (which !== "mobile") {
  const W = { w: 1920, h: 1080 };
  concatWithTitle(await take({ width: 1920, height: 1080 }, 1, false, W, "d"), W, path.join(OUT, "obsidian-reel-16x9.mp4"));
}
if (which !== "desktop") {
  // 390×693 CSS px at DPR 2.77 ≈ 1080×1920: a real phone-width layout in a 9:16 frame
  const V = { w: 1080, h: 1920 };
  concatWithTitle(await take({ width: 390, height: 693 }, 2.77, true, V, "m"), V, path.join(OUT, "obsidian-reel-9x16.mp4"));
}
await browser.close();
