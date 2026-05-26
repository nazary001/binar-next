// Capture a Y-band of a route at MOBILE width (390 default).
import { chromium } from "playwright";
import path from "node:path";

const [routeArg, yArg, hArg, outArg, widthArg] = process.argv.slice(2);
if (!routeArg || !yArg || !hArg || !outArg) {
  console.error("usage: node scripts/capture-mobile-section.mjs <route> <y> <h> <out.png> [width=390]");
  process.exit(1);
}
const y = Number(yArg), h = Number(hArg);
const width = Number(widthArg) || 390;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width, height: 800 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto(`http://localhost:3000${routeArg}`, { waitUntil: "networkidle", timeout: 60_000 });
await page.evaluate(async () => {
  await new Promise((res) => {
    let yy = 0;
    const step = () => {
      window.scrollTo(0, yy);
      yy += 300;
      if (yy < document.body.scrollHeight) setTimeout(step, 80);
      else { window.scrollTo(0, 0); setTimeout(res, 400); }
    };
    step();
  });
});
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
await page.setViewportSize({ width, height: y + h + 200 });
await page.waitForTimeout(800);
await page.evaluate(async () => {
  const imgs = Array.from(document.images);
  await Promise.race([
    Promise.all(imgs.map((img) => img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise((res) => {
      img.addEventListener("load", res, { once: true });
      img.addEventListener("error", res, { once: true });
      setTimeout(res, 6000);
    }))),
    new Promise((res) => setTimeout(res, 12000)),
  ]);
});
await page.waitForTimeout(800);
await page.screenshot({
  path: path.resolve(outArg),
  clip: { x: 0, y, width, height: h },
  type: "png",
  fullPage: false,
});
await page.close();
await ctx.close();
await browser.close();
console.log(`captured ${outArg} at y=${y} h=${h} w=${width}`);
