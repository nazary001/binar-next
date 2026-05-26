// Capture a specific rectangle of the rendered page at 1440 width.
// Usage: node scripts/capture-region.mjs <url> <selector|y:HEIGHT> <out>

import { chromium } from "playwright";
import path from "node:path";

const [url, target, out] = process.argv.slice(2);
if (!url || !target || !out) {
  console.error("usage: node capture-region.mjs <url> <selector|y:H> <outFile>");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForTimeout(500);

if (target.startsWith("y:")) {
  const h = Number(target.slice(2));
  await page.setViewportSize({ width: 1440, height: h });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.resolve(out), clip: { x: 0, y: 0, width: 1440, height: h }, type: "png" });
} else {
  const el = await page.$(target);
  if (!el) { console.error("no element matched", target); process.exit(2); }
  await el.screenshot({ path: path.resolve(out), type: "png" });
}

await ctx.close();
await browser.close();
console.log("wrote", out);
