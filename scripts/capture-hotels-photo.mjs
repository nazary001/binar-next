// Capture just the hotels hero photo column at full pixel resolution.
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForTimeout(800);

// Wait for hero image to load
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

// Screenshot whole hero (1440 wide, 678 tall, starting at y=88 due to header)
await page.screenshot({
  path: path.resolve("./.figma-review/hotels/hero-photo-column.png"),
  type: "png",
  clip: { x: 837, y: 88, width: 603, height: 678 },
});
// Whole hero (matches Figma frame 1440x678)
await page.screenshot({
  path: path.resolve("./.figma-review/hotels/hero-1440x678.png"),
  type: "png",
  clip: { x: 0, y: 88, width: 1440, height: 678 },
});

await page.close();
await ctx.close();
await browser.close();
console.log("captured photo-column + 1440x678 hero");
