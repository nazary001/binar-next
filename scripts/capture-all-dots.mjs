import { chromium } from "playwright";
import fs from "node:fs";

const URL = "http://localhost:3000/";
const OUT = "audit/fresh-section";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "no-preference",
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".hero-dot", { state: "visible" });

const dots = await page.locator(".hero-dot").all();
const boxes = await Promise.all(dots.map((d) => d.boundingBox()));
const minX = Math.min(...boxes.map((b) => b.x));
const maxX = Math.max(...boxes.map((b) => b.x + b.width));
const minY = Math.min(...boxes.map((b) => b.y));
const maxY = Math.max(...boxes.map((b) => b.y + b.height));
const pad = 80;
const clip = {
  x: Math.max(0, Math.round(minX - pad)),
  y: Math.max(0, Math.round(minY - pad)),
  width: Math.round(maxX - minX + pad * 2),
  height: Math.round(maxY - minY + pad * 2),
};
console.log("clip", clip);

const FRAMES = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];
const start = Date.now();
for (const t of FRAMES) {
  const wait = t - (Date.now() - start);
  if (wait > 0) await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/all-dots-${t}.png`, clip });
  console.log("frame", t);
}

await browser.close();
console.log("done");
