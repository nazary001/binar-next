// Capture a specific Y-band of a route at 1440 width.
// Usage: node scripts/capture-section.mjs <route> <y> <h> <out.png>

import { chromium } from "playwright";
import path from "node:path";

const [routeArg, yArg, hArg, outArg] = process.argv.slice(2);
if (!routeArg || !yArg || !hArg || !outArg) {
  console.error("usage: node scripts/capture-section.mjs <route> <y> <h> <out.png>");
  process.exit(1);
}
const y = Number(yArg), h = Number(hArg);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto(`http://localhost:3000${routeArg}`, { waitUntil: "networkidle", timeout: 60_000 });
// Scroll slowly through whole page so lazy images load
await page.evaluate(async () => {
  await new Promise((res) => {
    let yy = 0;
    const step = () => {
      window.scrollTo(0, yy);
      yy += 400;
      if (yy < document.body.scrollHeight) setTimeout(step, 40);
      else { window.scrollTo(0, 0); setTimeout(res, 400); }
    };
    step();
  });
});
// Wait for images
await page.evaluate(async () => {
  const imgs = Array.from(document.images);
  await Promise.race([
    Promise.all(imgs.map((img) => img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise((res) => {
      img.addEventListener("load", res, { once: true });
      img.addEventListener("error", res, { once: true });
      setTimeout(res, 5000);
    }))),
    new Promise((res) => setTimeout(res, 15000)),
  ]);
});
await page.waitForTimeout(800);

// Resize viewport to cover the band so clip stays inside the viewport.
await page.setViewportSize({ width: 1440, height: y + h + 200 });
// After resize the IntersectionObserver re-evaluates; give lazy images
// a chance to start loading, then await them again.
await page.waitForTimeout(800);
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
await page.screenshot({
  path: path.resolve(outArg),
  clip: { x: 0, y, width: 1440, height: h },
  type: "png",
  fullPage: false,
});
await page.close();
await ctx.close();
await browser.close();
console.log(`captured ${outArg} at y=${y} h=${h}`);
