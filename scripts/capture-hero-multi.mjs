// Capture home hero at multiple viewport widths.
// Crop just the photo column to compare dot positions on the photo.
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });

const WIDTHS = [1280, 1366, 1440, 1600, 1920, 2560];

for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
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

  // Get hero-photo container rect
  const photo = await page.evaluate(() => {
    const el = document.querySelector(".hero-photo");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  if (photo) {
    console.log(`viewport ${w}: photo at (${photo.x}, ${photo.y}) ${photo.w}x${photo.h}`);
    // Capture only the photo column
    await page.screenshot({
      path: path.resolve(`audit/fresh-section/hero-photo-${w}.png`),
      type: "png",
      clip: { x: photo.x, y: photo.y, width: photo.w, height: photo.h },
    });
  }

  await page.close();
  await ctx.close();
}
await browser.close();
console.log("done");
