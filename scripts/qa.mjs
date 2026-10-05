/**
 * Behavioural QA against a running build (npm run build && npx vite preview --port 4173).
 *   node scripts/qa.mjs [url]
 * Prints PASS/FAIL per check and exits non-zero on any failure.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const URL = process.argv[2] ?? "http://127.0.0.1:4173/";
const OUT = "qa-artifacts/qa";
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

async function ctx(browser, opts = {}) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await c.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
  return { c, page, errors };
}

const bagLabel = (page) => page.locator(".bag-button").getAttribute("aria-label");

const browser = await chromium.launch();

// ---------------------------------------------------------------- core flows (desktop)
{
  const { c, page, errors } = await ctx(browser);
  await page.goto(URL, { waitUntil: "networkidle" });

  // first focusable element is the skip link
  await page.keyboard.press("Tab");
  check("skip link is first in tab order", (await page.evaluate(() => document.activeElement?.className)) === "skip-link");

  // anchors
  for (const [label, id] of [["The Object", "object"], ["The Fragrance", "fragrance"], ["Discover", "discover"]]) {
    await page.locator(".site-nav a", { hasText: label }).click();
    await page.waitForTimeout(1200);
    const top = await page.evaluate((i) => document.getElementById(i).getBoundingClientRect().top, id);
    check(`nav "${label}" scrolls to #${id}`, page.url().endsWith(`#${id}`) && Math.abs(top) < 120, `top=${Math.round(top)}`);
  }

  // size selection
  await page.locator(".size-option", { hasText: "100 mL" }).click();
  const price100 = await page.locator(".product__price").innerText();
  const alt100 = await page.locator(".product__image.is-current img").getAttribute("alt");
  check("selecting 100 mL shows €210", price100.includes("€210"), price100.replace(/\s+/g, " "));
  check("visible bottle label matches 100 mL", /100 mL/.test(alt100 ?? ""), alt100);
  await page.locator(".size-option", { hasText: "50 mL" }).click();
  check("selecting 50 mL shows €140", (await page.locator(".product__price").innerText()).includes("€140"));
  // keyboard: arrow keys move between radios
  await page.locator('input[name="size"][value="50"]').focus();
  await page.keyboard.press("ArrowRight");
  check("size radios operable by arrow keys", (await page.locator(".product__price").innerText()).includes("€210"));
  await page.keyboard.press("ArrowLeft");

  // add to bag
  const addBtn = page.getByRole("button", { name: "Add to demo bag" });
  await addBtn.click();
  await page.waitForTimeout(400);
  const dialogOpen = await page.evaluate(() => document.querySelector("dialog.bag")?.matches(":modal"));
  check("add opens a modal drawer (background inert)", dialogOpen === true);
  check("bag count updates to 1", (await bagLabel(page)) === "Demo bag, 1 item");
  const focusInDialog = await page.evaluate(() => !!document.activeElement?.closest("dialog.bag"));
  check("focus moves into drawer", focusInDialog);
  await page.waitForTimeout(200);
  const live = await page.locator('[role="status"][aria-live="polite"]').last().innerText();
  check("addition announced via live region", /added to demo bag/.test(live), live);
  const drawerText = await page.locator("dialog.bag").innerText();
  check("drawer shows concept disclosure", /no checkout, no orders and no\s+payments/i.test(drawerText));
  check("drawer has no checkout/payment action", !(await page.locator("dialog.bag").getByRole("button", { name: /checkout|pay/i }).count()));
  await page.screenshot({ path: `${OUT}/drawer-1440.png` });

  // quantity arithmetic
  const inc = page.getByRole("button", { name: /Increase quantity of OBSIDIAN No\. 01, 50 mL/ });
  const dec = page.getByRole("button", { name: /Decrease quantity of OBSIDIAN No\. 01, 50 mL/ });
  check("decrease disabled at quantity 1", await dec.isDisabled());
  await inc.click();
  check("quantity 2 → subtotal €280", (await page.locator(".bag__subtotal-value").innerText()).includes("€280"));
  for (let i = 0; i < 10; i++) if (!(await inc.isDisabled())) await inc.click();
  check("quantity capped at 9", (await page.locator(".qty__value").first().innerText()) === "9" && (await inc.isDisabled()));
  check("subtotal €1,260 at 9 × €140", (await page.locator(".bag__subtotal-value").innerText()).includes("1,260"));

  // escape closes, focus returns to trigger
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check("Escape closes drawer", !(await page.evaluate(() => document.querySelector("dialog.bag")?.open)));
  check("focus returns to Add button", (await page.evaluate(() => document.activeElement?.textContent?.trim())) === "Add to demo bag");

  // add the other size, then persistence across reload
  await page.locator(".size-option", { hasText: "100 mL" }).click();
  await addBtn.click();
  await page.waitForTimeout(300);
  check("two lines, subtotal €1,470", (await page.locator(".bag__subtotal-value").innerText()).includes("1,470"));
  await page.getByRole("button", { name: "Continue exploring" }).click();
  await page.reload({ waitUntil: "networkidle" });
  check("bag persists after reload (10 items)", (await bagLabel(page)) === "Demo bag, 10 items");

  // header bag button opens drawer, remove works, focus returns to bag button
  await page.locator(".bag-button").click();
  await page.getByRole("button", { name: /Remove OBSIDIAN No\. 01, 100 mL/ }).click();
  check("remove updates subtotal to €1,260", (await page.locator(".bag__subtotal-value").innerText()).includes("1,260"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check("focus returns to header bag button", (await page.evaluate(() => document.activeElement?.classList.contains("bag-button"))) === true);

  // malformed storage recovers
  await page.evaluate(() => localStorage.setItem("obsidian.demoBag.v1", '{"lines":[{"sku":"x","qty":99},{"sku":"obsidian-no01-50","qty":"7"}'));
  await page.reload({ waitUntil: "networkidle" });
  check("malformed storage recovers to empty bag", (await bagLabel(page)) === "Demo bag, 0 items");
  await page.evaluate(() => localStorage.setItem("obsidian.demoBag.v1", JSON.stringify({ lines: [{ sku: "obsidian-no01-100", qty: 3, priceCents: 1 }] })));
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".bag-button").click();
  check("stored prices are ignored (3 × €210 = €630)", (await page.locator(".bag__subtotal-value").innerText()).includes("€630"));
  await page.keyboard.press("Escape");

  // 3D viewer
  const rotate = page.getByRole("button", { name: "Rotate object" });
  check("Rotate object offered when WebGL is available", (await rotate.count()) === 1);
  await rotate.click();
  await page.waitForSelector(".viewer__canvas", { timeout: 10000 });
  await page.waitForTimeout(2500);
  const stage = page.locator(".viewer__stage");
  check("viewer stage focused and labelled", await stage.evaluate((el) => document.activeElement === el && !!el.getAttribute("aria-label")));
  await stage.screenshot({ path: `${OUT}/viewer-a.png` });
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/viewer-b.png` });
  const box = await stage.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 160, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/viewer-c.png` });
  const a = fs.readFileSync(`${OUT}/viewer-a.png`);
  const b = fs.readFileSync(`${OUT}/viewer-b.png`);
  check("keyboard rotation changes the rendered view", !a.equals(b));
  await page.getByRole("button", { name: "Close 3D view" }).click();
  await page.waitForTimeout(300);
  check("closing viewer returns focus to Rotate button", (await page.evaluate(() => document.activeElement?.textContent?.trim())) === "Rotate object");
  check("canvas removed after close (no lingering WebGL)", (await page.locator("canvas").count()) === 0);

  check("no console errors / failed requests (desktop flows)", errors.length === 0, errors.slice(0, 5).join(" | "));
  await c.close();
}

// ---------------------------------------------------------------- reduced motion
{
  const { c, page, errors } = await ctx(browser, { reducedMotion: "reduce" });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  check("reduced motion: no hero video element", (await page.locator(".hero__video").count()) === 0);
  check("reduced motion: object section not pinned", (await page.locator(".object--sequence").count()) === 0);
  check("reduced motion: html data-motion=off", (await page.evaluate(() => document.documentElement.dataset.motion)) === "off");
  await page.locator("#fragrance").scrollIntoViewIfNeeded();
  const op = await page.locator(".scent__text").first().evaluate((el) => getComputedStyle(el).opacity);
  check("reduced motion: content visible without animation", op === "1", `opacity=${op}`);
  check("no console errors (reduced motion)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await c.close();
}

// ---------------------------------------------------------------- mobile drawer + menu
{
  const { c, page, errors } = await ctx(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: "networkidle" });
  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  check("mobile menu expands", (await menu.getAttribute("aria-expanded")) === "true");
  await page.locator(".mobile-menu a", { hasText: "Discover" }).click();
  await page.waitForTimeout(1200);
  check("mobile menu link navigates and closes", page.url().endsWith("#discover") && (await page.locator(".mobile-menu").isHidden()));
  await page.getByRole("button", { name: "Add to demo bag" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/drawer-390.png` });
  const w = await page.evaluate(() => document.querySelector("dialog.bag").getBoundingClientRect().width);
  check("drawer fits phone width", w <= 390, `width=${w}`);
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("dialog.bag button")].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width < 44 || r.height < 44;
    }).length,
  );
  check("drawer touch targets ≥ 44×44", small === 0, `${small} small`);
  check("no console errors (mobile)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await c.close();
}
await browser.close();

// ---------------------------------------------------------------- WebGL unavailable
{
  const b = await chromium.launch({ args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"] });
  const { c, page, errors } = await ctx(b);
  await page.goto(URL, { waitUntil: "networkidle" });
  check("no WebGL: Rotate object control omitted", (await page.getByRole("button", { name: "Rotate object" }).count()) === 0);
  check("no WebGL: product still purchasable in demo", (await page.getByRole("button", { name: "Add to demo bag" }).count()) === 1);
  check("no console errors (no WebGL)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await c.close();
  await b.close();
}

// ---------------------------------------------------------------- autoplay blocked
{
  const b = await chromium.launch({ args: ["--autoplay-policy=document-user-activation-required"] });
  const { c, page, errors } = await ctx(b);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => {
    const v = document.querySelector(".hero__video");
    const img = document.querySelector(".hero__poster img");
    return { video: !!v, paused: v ? v.paused : null, visible: v ? getComputedStyle(v).opacity : null, poster: img?.complete && img.naturalWidth > 0 };
  });
  check("autoplay blocked: poster shown, video hidden", st.poster && (!st.video || st.paused) && (!st.video || st.visible === "0"), JSON.stringify(st));
  const cta = await page.getByRole("link", { name: "Discover No. 01" }).first().isVisible();
  check("autoplay blocked: CTAs still available", cta);
  check("no console errors (autoplay blocked)", errors.length === 0, errors.slice(0, 3).join(" | "));
  await c.close();
  await b.close();
}

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
