import { chromium } from "playwright";
import fs from "node:fs";

const URL = process.env.URL || "http://localhost:3000/";
const OUT = "audit/fresh-section";
fs.mkdirSync(OUT, { recursive: true });

const FRAMES_MS = [0, 300, 600, 900, 1200, 1500, 1800, 2100, 2400];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "no-preference",
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".hero-dot", { state: "visible" });

const dot = await page.locator(".hero-dot").first();
const box = await dot.boundingBox();
if (!box) throw new Error("dot bounding box missing");

const pad = 80;
const clip = {
  x: Math.max(0, Math.round(box.x - pad)),
  y: Math.max(0, Math.round(box.y - pad)),
  width: Math.round(box.width + pad * 2),
  height: Math.round(box.height + pad * 2),
};

console.log("dot bbox", box, "clip", clip);

const start = Date.now();
for (const t of FRAMES_MS) {
  const wait = t - (Date.now() - start);
  if (wait > 0) await page.waitForTimeout(wait);
  await page.screenshot({
    path: `${OUT}/dot-anim-v2-${t}.png`,
    clip,
  });
  console.log("frame", t, "ms");
}

await browser.close();
console.log("done");
