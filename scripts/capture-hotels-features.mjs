import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const rect = await page.evaluate(() => {
  const lists = document.querySelectorAll("ul");
  for (const el of lists) {
    if (el.textContent && el.textContent.includes("Набір позицій")) {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }
  }
  return null;
});

if (!rect) {
  console.log("could not locate features list");
  process.exit(1);
}
console.log(`features list at (${rect.x}, ${rect.y}) ${rect.w}x${rect.h}`);

await page.screenshot({
  path: path.resolve("audit/hotels-features-now.png"),
  type: "png",
  clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h },
});

await browser.close();
console.log("saved audit/hotels-features-now.png");
