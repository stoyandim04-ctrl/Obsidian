/**
 * 18-second website reel captured from the real site (no added fake interactions).
 *   node scripts/reel.mjs http://127.0.0.1:4173/ [desktop|mobile|both]
 * Frames come from the Chrome DevTools screencast, are timed with their own timestamps and
 * assembled into constant-frame-rate H.264 with ffmpeg. Output: portfolio/reel/.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const URL = process.argv[2] ?? "http://127.0.0.1:4173/";
const which = process.argv[3] ?? "both";
const OUT = path.resolve("portfolio/reel");
const TMP = path.resolve("qa-artifacts/reel-tmp");
const SERIF = path.resolve("source/fonts/CormorantGaramond[wght].ttf");
const SANS = path.resolve("source/fonts/HankenGrotesk[wght].ttf");
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/** Native page scroll in small rAF steps (no scroll hijacking — the page sees ordinary scroll events). */
const smoothScroll = (page, to, ms) =>
  page.evaluate(
    ([to, ms]) =>
      new Promise((res) => {
        const from = window.scrollY;
        const t0 = performance.now();
        const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
        const step = (now) => {
          const k = Math.min(1, (now - t0) / ms);
          window.scrollTo(0, from + (to - from) * ease(k));
          k < 1 ? requestAnimationFrame(step) : res();
        };
        requestAnimationFrame(step);
      }),
    [to, ms],
  );

const yOf = (page, sel, offset = 0) => page.evaluate(([s, o]) => document.querySelector(s).getBoundingClientRect().top + window.scrollY + o, [sel, offset]);
const jump = async (page, y) => {
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y);
  await sleep(450);
};

async function session(browser, viewport, dpr, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => localStorage.clear());
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, cdp };
}

function concatWithTitle(clips, size, out) {
  const list = path.join(TMP, `${path.basename(out)}.txt`);
  fs.writeFileSync(list, clips.map((c) => `file '${c}'`).join("\n"));
  const big = Math.round(size.h * (size.w > size.h ? 0.075 : 0.042));
  const small = Math.round(big * 0.3);
  const cx = size.w > size.h ? "w*0.08" : "(w-text_w)/2";
  const yTitle = size.w > size.h ? "h*0.40" : "h*0.15";
  const ySub = size.w > size.h ? `h*0.40+${Math.round(big * 1.35)}` : `h*0.15+${Math.round(big * 1.35)}`;
  // Title card over the closing scene only (last 3 s): 15.4 s → 18 s
  const vf = [
    `drawtext=fontfile='${SERIF}':text='OBSIDIAN':fontcolor=0xF2EEE7:fontsize=${big}:x=${cx}:y=${yTitle}:alpha='if(lt(t,15.4),0,min(1,(t-15.4)/0.6))'`,
    `drawtext=fontfile='${SANS}':text='CONCEPT BY 13\\:33':fontcolor=0xB89261:fontsize=${small}:x=${cx}:y=${ySub}:alpha='if(lt(t,15.7),0,min(1,(t-15.7)/0.6))'`,
  ].join(",");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-vf", vf,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out]);
  console.log("wrote", out);
}

const browser = await chromium.launch();

if (which !== "mobile") {
  const W = { w: 1920, h: 1080 };
  const { ctx, page, cdp } = await session(browser, { width: 1920, height: 1080 }, 1, false);
  await page.waitForFunction(() => { const v = document.querySelector(".hero__video"); return v && !v.paused; }, null, { timeout: 15000 }).catch(() => {});
  await sleep(600);
  const clips = [];
  clips.push(await record(page, cdp, "d1-hero", 3000, W));
  const obj = await yOf(page, "#object");
  const objH = await page.evaluate(() => document.getElementById("object").offsetHeight - window.innerHeight);
  await jump(page, obj + objH * 0.3);
  clips.push(await record(page, cdp, "d2-object", 3000, W, () => smoothScroll(page, obj + objH * 0.62, 2600)));
  await jump(page, await yOf(page, ".scent__row--dark", -120));
  clips.push(await record(page, cdp, "d3a-opening", 1500, W));
  await jump(page, await yOf(page, ".scent__row--light", -60));
  clips.push(await record(page, cdp, "d3b-heart", 1500, W));
  await jump(page, await yOf(page, "#discover", -10));
  clips.push(await record(page, cdp, "d4-product", 3000, W, async () => {
    await sleep(500);
    await page.locator(".size-option", { hasText: "100 mL" }).click();
    await sleep(900);
    await page.getByRole("button", { name: "Add to demo bag" }).click();
  }));
  await page.keyboard.press("Escape");
  await ctx.close();

  // actual mobile layout, presented centred on the page colour inside the 16:9 frame
  const m = await session(browser, { width: 390, height: 844 }, 2, true);
  await m.page.waitForFunction(() => { const v = document.querySelector(".hero__video"); return v && !v.paused; }, null, { timeout: 15000 }).catch(() => {});
  const mob = await record(m.page, m.cdp, "d5-mobile-raw", 3000, { w: 780, h: 1688 }, async () => {
    await sleep(1200);
    await smoothScroll(m.page, 700, 1600);
  });
  await m.ctx.close();
  const mobPad = path.join(TMP, "d5-mobile.mp4");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", mob, "-vf", "scale=-2:1000:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0B0C0E,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-an", mobPad]);
  clips.push(mobPad);

  const c = await session(browser, { width: 1920, height: 1080 }, 1, false);
  await jump(c.page, await yOf(c.page, ".closing"));
  await sleep(800);
  clips.push(await record(c.page, c.cdp, "d6-closing", 3000, W));
  await c.ctx.close();
  concatWithTitle(clips, W, path.join(OUT, "obsidian-reel-16x9.mp4"));
}

if (which !== "desktop") {
  const V = { w: 1080, h: 1920 };
  // 390×693 CSS px at DPR 2.77 ≈ 1080×1920: a real phone-width layout in a 9:16 frame
  const { ctx, page, cdp } = await session(browser, { width: 390, height: 693 }, 2.77, true);
  await page.waitForFunction(() => { const v = document.querySelector(".hero__video"); return v && !v.paused; }, null, { timeout: 15000 }).catch(() => {});
  await sleep(600);
  const clips = [];
  clips.push(await record(page, cdp, "m1-hero", 3000, V));
  await jump(page, await yOf(page, ".object__figure:nth-child(2)", -80));
  clips.push(await record(page, cdp, "m2-object", 3000, V, async () => smoothScroll(page, (await yOf(page, ".object__figure:nth-child(2)", -80)) + 160, 2600)));
  await jump(page, await yOf(page, ".scent__row--dark", -40));
  clips.push(await record(page, cdp, "m3a-opening", 1500, V));
  await jump(page, await yOf(page, ".scent__row--light", -20));
  clips.push(await record(page, cdp, "m3b-heart", 1500, V));
  await jump(page, await yOf(page, ".sizes", -260));
  clips.push(await record(page, cdp, "m4-product", 3000, V, async () => {
    await sleep(400);
    await page.locator(".size-option", { hasText: "100 mL" }).click();
    await sleep(900);
    await page.getByRole("button", { name: "Add to demo bag" }).click();
  }));
  await page.keyboard.press("Escape");
  await sleep(300);
  await jump(page, 0);
  await page.getByRole("button", { name: "Menu" }).click();
  clips.push(await record(page, cdp, "m5-menu", 3000, V, async () => {
    await sleep(1300);
    await page.getByRole("button", { name: "Close" }).click();
  }));
  await jump(page, await yOf(page, ".closing"));
  await sleep(600);
  clips.push(await record(page, cdp, "m6-closing", 3000, V));
  await ctx.close();
  concatWithTitle(clips, V, path.join(OUT, "obsidian-reel-9x16.mp4"));
}

await browser.close();
