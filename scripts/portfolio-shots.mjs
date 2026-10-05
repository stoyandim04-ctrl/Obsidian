/**
 * Section screenshots of the real site for the 13:33 portfolio package.
 *   node scripts/portfolio-shots.mjs http://127.0.0.1:4173/
 */
import { chromium } from "playwright";
import fs from "node:fs";

const URL = process.argv[2] ?? "http://127.0.0.1:4173/";
const OUT = "portfolio/screenshots";
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(kind, viewport, dpr, mobile) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => localStorage.clear());
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const go = async (sel, offset = 0) => {
    const y = await page.evaluate(([s, o]) => document.querySelector(s).getBoundingClientRect().top + window.scrollY + o, [sel, offset]);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await sleep(900);
  };
  const snap = (name) => page.screenshot({ path: `${OUT}/${kind}-${name}.png` });

  await sleep(1500);
  await snap("01-hero");
  if (!mobile) {
    const h = await page.evaluate(() => document.getElementById("object").offsetHeight - innerHeight);
    await go("#object", h * 0.05);
    await snap("02-object-silhouette");
    await go("#object", h * 0.62);
    await snap("03-object-ring-macro");
  } else {
    await go(".object__head", -24);
    await snap("02-object");
  }
  await go(".scent__intro", mobile ? -40 : 0);
  await snap("04-scent-intro");
  await go(".scent__row--light", mobile ? -20 : 0);
  await snap("05-scent-heart");
  await go(".scent__row--dark:last-of-type", mobile ? -20 : -40);
  await snap("06-scent-base");
  await go("#discover", mobile ? 0 : -20);
  await page.locator(".size-option", { hasText: "100 mL" }).click();
  await sleep(700);
  await snap("07-product-100ml");
  await page.getByRole("button", { name: "Add to demo bag" }).click();
  await sleep(800);
  await snap("08-demo-bag");
  await page.keyboard.press("Escape");
  await go(".closing", 0);
  await sleep(600);
  await snap("09-closing");
  await go(".footer", 0);
  await snap("10-footer");
  await browser.close();
  console.log("shots:", kind);
}

await shoot("desktop", { width: 1440, height: 900 }, 1, false);
await shoot("mobile", { width: 390, height: 844 }, 2, true);
