/**
 * Full-page and first-screen screenshots at the QA widths.
 *   node scripts/shots.mjs http://localhost:4173 qa-artifacts/shots [--reduced] [--only=390,1440]
 */
import { chromium } from "playwright";
import fs from "node:fs";

const [url = "http://localhost:4173", out = "qa-artifacts/shots"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const reduced = process.argv.includes("--reduced");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",").map(Number);
const VIEWPORTS = [
  { name: "320", width: 320, height: 640, mobile: true },
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "430", width: 430, height: 932, mobile: true },
  { name: "768", width: 768, height: 1024, mobile: true },
  { name: "1024", width: 1024, height: 768, mobile: false },
  { name: "1440", width: 1440, height: 900, mobile: false },
].filter((v) => !only || only.includes(v.width));

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("requestfailed", (r) => errors.push(`failed: ${r.url()}`));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const tag = `${vp.name}${reduced ? "-reduced" : ""}`;
  await page.screenshot({ path: `${out}/${tag}-first.png` });
  // scroll through so lazy images and reveals resolve, then capture the full page
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += vp.height / 2) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${tag}-full.png`, fullPage: true });
  console.log(tag, `height=${h}`, `overflowX=${overflow}`, errors.length ? `ERRORS: ${errors.join(" | ")}` : "no console errors");
  await ctx.close();
}
await browser.close();
