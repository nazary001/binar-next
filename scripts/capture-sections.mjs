// Capture rendered screenshots of localhost:3000 routes at 1440px width.
// Saves full-page PNG + per-selector crops into .figma-review/<route>/.

import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.resolve(".figma-review");

const routes = [
  { path: "/",            slug: "home" },
  { path: "/hotels",      slug: "hotels" },
  { path: "/protect",     slug: "protect" },
  { path: "/cleaning",    slug: "cleaning" },
  { path: "/spivpratsya", slug: "spivpratsya" },
];

const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

for (const r of routes) {
  const page = await ctx.newPage();
  const outDir = path.join(OUT, r.slug);
  await mkdir(outDir, { recursive: true });

  console.log(`-> ${r.path}`);
  await page.goto(`${BASE}${r.path}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(800);
  // Scroll slowly through the entire page so every lazy-loaded image
  // gets a chance to start fetching, then wait briefly for them to land.
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const step = () => {
        window.scrollTo(0, y);
        y += 400;
        if (y < document.body.scrollHeight) setTimeout(step, 80);
        else { window.scrollTo(0, 0); setTimeout(res, 400); }
      };
      step();
    });
  });
  // Bounded wait per image — total cap 20 s.
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    const waiters = imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return Promise.race([
        new Promise((res) => {
          img.addEventListener("load", res, { once: true });
          img.addEventListener("error", res, { once: true });
        }),
        new Promise((res) => setTimeout(res, 8000)),
      ]);
    });
    await Promise.race([
      Promise.all(waiters),
      new Promise((res) => setTimeout(res, 20000)),
    ]);
  });
  await page.waitForTimeout(800);

  // Pre-resize the viewport to the full document height so the upcoming
  // `fullPage: true` screenshot doesn't have to do a resize+rasterise pass
  // on lazy-loaded SVGs near the bottom of the page (those drop frames
  // and show as empty boxes on tall landing pages).
  const docHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewportSize({ width: 1440, height: docHeight });
  await page.waitForTimeout(500);
  // Re-wait after the resize fires IntersectionObservers afresh.
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    await Promise.race([
      Promise.all(imgs.map((img) => img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise((res) => {
        img.addEventListener("load", res, { once: true });
        img.addEventListener("error", res, { once: true });
        setTimeout(res, 8000);
      }))),
      new Promise((res) => setTimeout(res, 15000)),
    ]);
  });
  await page.waitForTimeout(800);

  // Full-page screenshot.
  await page.screenshot({
    path: path.join(outDir, "full.png"),
    fullPage: true,
    type: "png",
  });

  // Per-section crops by id (used in page.tsx anchors).
  const sectionIds = await page.$$eval(
    "[data-section], section[id], [id]",
    (els) => els.map((e) => ({ id: e.id || e.getAttribute("data-section"), tag: e.tagName.toLowerCase() })).filter((e) => e.id),
  );
  await writeFile(path.join(outDir, "_sections.json"), JSON.stringify(sectionIds, null, 2));

  await page.close();
}

await ctx.close();
await browser.close();
console.log("done");
