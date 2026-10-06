/** Helpers shared by the portfolio scripts: scroll positions inside the scroll films, frame warm-up. */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Page Y at which the film in `sel` shows progress `p` (0–1), or the top of any other element. */
export const filmY = (page, sel, p = 0) =>
  page.evaluate(
    ([s, pp]) => {
      const el = document.querySelector(s);
      const top = el.getBoundingClientRect().top + window.scrollY;
      return top + pp * Math.max(0, el.offsetHeight - window.innerHeight);
    },
    [sel, p],
  );

/** Fetch and decode every frame of the films for this viewport, so captures never wait on the network. */
export const warmFilms = (page) =>
  page.evaluate(async () => {
    const portrait = !matchMedia("(min-aspect-ratio: 1/1)").matches;
    const dirs = portrait ? [["reveal-m", 120], ["notes-m", 264]] : [["reveal-d", 120], ["notes-d", 264]];
    const urls = dirs.flatMap(([d, n]) => Array.from({ length: n }, (_, i) => `media/film/${d}/${String(i).padStart(4, "0")}.webp`));
    let next = 0;
    const keep = [];
    const worker = async () => {
      while (next < urls.length) {
        const img = new Image();
        img.src = urls[next++];
        keep.push(img);
        await img.decode().catch(() => {});
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    window.__warm = keep;
    return urls.length;
  });

/** Native page scroll in small rAF steps (no scroll hijacking — the page sees ordinary scroll events). */
export const smoothScroll = (page, to, ms) =>
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

export const jump = async (page, y, settle = 500) => {
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y);
  await sleep(settle);
};
