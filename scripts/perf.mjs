/**
 * Lab performance measurement (not field data).
 *   node scripts/perf.mjs http://127.0.0.1:4173/ [runs]
 * Profiles mirror Lighthouse's defaults:
 *   mobile  — 390×844 @2x, RTT 150 ms, 1.6 Mbps down / 0.75 Mbps up, CPU 4× slowdown
 *   desktop — 1440×900 @1x, RTT 40 ms, 10 Mbps down / 10 Mbps up, no CPU slowdown
 * Reports LCP (element + time), CLS, bytes transferred until the load event, the time until every
 * frame of the first scroll film has arrived, and bytes after one pass through the page
 * (cache disabled, fresh context per run).
 */
import { chromium } from "playwright";
import fs from "node:fs";

const URL = process.argv[2] ?? "http://127.0.0.1:4173/";
const RUNS = Number(process.argv[3] ?? 3);
const PROFILES = {
  mobile: { viewport: { width: 390, height: 844 }, dpr: 2, mobile: true, rtt: 150, down: 1.6, up: 0.75, cpu: 4 },
  desktop: { viewport: { width: 1440, height: 900 }, dpr: 1, mobile: false, rtt: 40, down: 10, up: 10, cpu: 1 },
};

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const out = {};
const browser = await chromium.launch();
for (const [name, p] of Object.entries(PROFILES)) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const ctx = await browser.newContext({ viewport: p.viewport, deviceScaleFactor: p.dpr, isMobile: p.mobile, hasTouch: p.mobile });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: p.rtt,
      downloadThroughput: (p.down * 1024 * 1024) / 8,
      uploadThroughput: (p.up * 1024 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.cpu });
    let bytes = 0;
    let bytesAtLoad = 0;
    const byType = {};
    const types = new Map();
    cdp.on("Network.responseReceived", (e) => types.set(e.requestId, e.type));
    cdp.on("Network.loadingFinished", (e) => {
      bytes += e.encodedDataLength;
      const t = types.get(e.requestId) ?? "Other";
      byType[t] = (byType[t] ?? 0) + e.encodedDataLength;
    });
    await page.addInitScript(() => {
      window.__lcp = { t: 0, el: "" };
      window.__cls = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          window.__lcp = { t: e.startTime, el: e.element ? `${e.element.tagName.toLowerCase()}${e.element.className ? "." + String(e.element.className).split(" ")[0] : ""} ${e.url ? e.url.split("/").pop() : ""}`.trim() : "" };
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(URL, { waitUntil: "load" });
    bytesAtLoad = bytes;
    // time until all 120 frames of the reveal film have arrived (scrubbing then never waits)
    const t0 = Date.now();
    const revealMs = await page
      .waitForFunction(() => performance.getEntriesByType("resource").filter((e) => /\/film\/reveal-[dm]\//.test(e.name)).length >= 120, null, { timeout: 90000, polling: 250 })
      .then(() => page.evaluate(() => Math.round(Math.max(...performance.getEntriesByType("resource").filter((e) => /\/film\/reveal-[dm]\//.test(e.name)).map((e) => e.responseEnd)))))
      .catch(() => -1);
    const kbAtReveal = Math.round(bytes / 1024);
    if (Date.now() - t0 < 2000) await page.waitForTimeout(2000);
    // scroll the page once to collect layout shifts from lazy content
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += p.viewport.height) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(150);
    }
    const r = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls }));
    runs.push({ lcp: Math.round(r.lcp.t), lcpEl: r.lcp.el, cls: Number(r.cls.toFixed(4)), kbAtLoad: Math.round(bytesAtLoad / 1024), revealAllFramesMs: revealMs, kbAtReveal, kbTotalAfterScroll: Math.round(bytes / 1024), byTypeKB: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])) });
    await ctx.close();
  }
  out[name] = {
    profile: p,
    runs,
    median: {
      lcp: median(runs.map((r) => r.lcp)),
      cls: median(runs.map((r) => r.cls)),
      kbAtLoad: median(runs.map((r) => r.kbAtLoad)),
      revealAllFramesMs: median(runs.map((r) => r.revealAllFramesMs)),
      kbAtReveal: median(runs.map((r) => r.kbAtReveal)),
      kbTotalAfterScroll: median(runs.map((r) => r.kbTotalAfterScroll)),
    },
  };
  console.log(name, JSON.stringify(out[name].median), "LCP element:", runs[0].lcpEl);
}
await browser.close();
fs.mkdirSync("qa-artifacts", { recursive: true });
fs.writeFileSync("qa-artifacts/perf.json", JSON.stringify(out, null, 2));
