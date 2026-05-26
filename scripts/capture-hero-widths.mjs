// Capture the home hero at multiple widths to verify dots + photo proportions
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });

const WIDTHS = [
  { name: "390", w: 390, h: 1400 },
  { name: "768", w: 768, h: 1400 },
  { name: "1024", w: 1024, h: 900 },
  { name: "1440", w: 1440, h: 900 },
  { name: "1920", w: 1920, h: 900 },
];

for (const v of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    await Promise.race([
      Promise.all(imgs.map((img) => img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise((res) => {
        img.addEventListener("load", res, { once: true });
        img.addEventListener("error", res, { once: true });
        setTimeout(res, 5000);
      }))),
      new Promise((res) => setTimeout(res, 10000)),
    ]);
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.resolve(`audit/fresh-section/hero-${v.name}.png`),
    type: "png",
    clip: { x: 0, y: 0, width: v.w, height: Math.min(v.h, v.w >= 1024 ? 850 : v.h) },
  });
  console.log(`captured ${v.name}: ${v.w}x${v.h}`);
  await page.close();
  await ctx.close();
}
await browser.close();
