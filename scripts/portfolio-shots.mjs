/**
 * Screenshots of the real site for the 13:33 portfolio package (one per film chapter, then the product flow).
 *   node scripts/portfolio-shots.mjs http://127.0.0.1:4173/
 */
import { chromium } from "playwright";
import fs from "node:fs";
import { filmY, jump, sleep, warmFilms } from "./lib/film.mjs";

const URL = process.argv[2] ?? "http://127.0.0.1:4173/";
const OUT = "portfolio/screenshots";
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".png")) fs.rmSync(`${OUT}/${f}`);

const SCENES = [
  ["01-hero", "#top", 0],
  ["02-object", "#top", 0.25],
  ["03-cap", "#top", 0.47],
  ["04-atomizer", "#top", 0.64],
  ["05-spray", "#top", 0.93],
  ["06-notes-intro", "#fragrance", 0.04],
  ["07-opening-bergamot", "#fragrance", 0.2],
  ["08-heart-iris", "#fragrance", 0.43],
  ["09-base-amber", "#fragrance", 0.66],
  ["10-return-plinth", "#fragrance", 0.97],
];

async function shoot(kind, viewport, dpr, mobile) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(() => localStorage.clear());
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  await warmFilms(page);
  const snap = (name) => page.screenshot({ path: `${OUT}/${kind}-${name}.png` });

  for (const [name, sel, p] of SCENES) {
    await jump(page, await filmY(page, sel, p), 700);
    await snap(name);
  }
  await jump(page, await filmY(page, "#discover"), 700);
  await page.locator(".size-option", { hasText: "100 mL" }).click();
  await sleep(700);
  await snap("11-product-100ml");
  await page.getByRole("button", { name: "Add to demo bag" }).click();
  await sleep(800);
  await snap("12-demo-bag");
  await page.keyboard.press("Escape");
  await jump(page, await filmY(page, ".closing"), 900);
  await snap("13-closing");
  await jump(page, await filmY(page, ".footer"), 500);
  await snap("14-footer");
  await browser.close();
  console.log("shots:", kind);
}

await shoot("desktop", { width: 1440, height: 900 }, 1, false);
await shoot("mobile", { width: 390, height: 844 }, 2, true);
