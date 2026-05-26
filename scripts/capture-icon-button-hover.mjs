// Capture the hover icon button on the bathroom card AND on a compact
// card so we can compare both variants (white/dark text) to Figma 1333:7835.
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1700 },
  deviceScaleFactor: 2,  // higher DPR for crisper crops
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle", timeout: 60_000 });
await page.evaluate(() => {
  const sections = document.querySelectorAll("main > section");
  sections[1]?.scrollIntoView({ block: "start", behavior: "instant" });
});
await page.waitForTimeout(500);

// First hover Ванна кімната (image card, light variant)
await page.locator('text="Ванна кімната"').first().hover();
await page.waitForTimeout(600);

// Find the rotating SVG inside the bathroom card and screenshot a rect around it
const lightIconRect = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll("div.group"));
  const bathroom = cards.find(c => c.textContent?.includes("Ванна кімната"));
  if (!bathroom) return null;
  const svg = bathroom.querySelector("svg.zones-details-text");
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
if (lightIconRect) {
  const pad = 20;
  await page.screenshot({
    path: path.resolve("./.figma-review/hotels/icon-hover-light.png"),
    type: "png",
    clip: {
      x: Math.max(0, Math.floor(lightIconRect.x - pad)),
      y: Math.max(0, Math.floor(lightIconRect.y - pad)),
      width: Math.ceil(lightIconRect.w + 2 * pad),
      height: Math.ceil(lightIconRect.h + 2 * pad),
    },
  });
  console.log(`light icon at ${JSON.stringify(lightIconRect)}`);
}

// Now hover Рецепція (compact card, dark variant)
await page.locator('text="Рецепція"').first().hover();
await page.waitForTimeout(600);

const darkIconRect = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll("div.group"));
  const reception = cards.find(c => c.textContent?.includes("Рецепція"));
  if (!reception) return null;
  const svg = reception.querySelector("svg.zones-details-text");
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
if (darkIconRect) {
  const pad = 20;
  await page.screenshot({
    path: path.resolve("./.figma-review/hotels/icon-hover-dark.png"),
    type: "png",
    clip: {
      x: Math.max(0, Math.floor(darkIconRect.x - pad)),
      y: Math.max(0, Math.floor(darkIconRect.y - pad)),
      width: Math.ceil(darkIconRect.w + 2 * pad),
      height: Math.ceil(darkIconRect.h + 2 * pad),
    },
  });
  console.log(`dark icon at ${JSON.stringify(darkIconRect)}`);
}

await page.close();
await ctx.close();
await browser.close();
console.log("done");
