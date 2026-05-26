import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const rect = await page.evaluate(() => {
  const list = document.querySelector(".hero-left ul");
  if (!list) return null;
  const r = list.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
});

if (!rect) {
  console.log("could not locate industries list");
  process.exit(1);
}
console.log(`industries list at (${rect.x}, ${rect.y}) ${rect.w}x${rect.h}`);

await page.screenshot({
  path: path.resolve("audit/industries-icons-now.png"),
  type: "png",
  clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h },
});

await browser.close();
console.log("saved audit/industries-icons-now.png");
