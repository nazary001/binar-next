// Capture the full ZonesGrid section with the bathroom card hovered.
// Mirrors Figma's "While howering" artboard (1333:7764).
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1700 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForTimeout(500);

// Bring the zones grid into view (matching Figma artboard offset).
await page.evaluate(() => {
  const sections = document.querySelectorAll("main > section");
  sections[1]?.scrollIntoView({ block: "start", behavior: "instant" });
});
await page.waitForTimeout(400);

// Wait for all images
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

// Hover over Ванна кімната (top-left image card)
await page.locator('text="Ванна кімната"').first().hover();
await page.waitForTimeout(700);

// Find ZonesGrid section position
const zonesBox = await page.evaluate(() => {
  const sections = document.querySelectorAll("main > section");
  const zones = sections[1];
  if (!zones) return null;
  const r = zones.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});

await page.screenshot({
  path: path.resolve("./.figma-review/hotels/zones-hover-state-rendered.png"),
  type: "png",
  clip: { x: 0, y: Math.floor(zonesBox.y), width: 1440, height: Math.ceil(zonesBox.h) },
});

// Also crop the active card itself for close inspection
await page.screenshot({
  path: path.resolve("./.figma-review/hotels/zones-hover-active-card.png"),
  type: "png",
  clip: { x: 130, y: Math.floor(zonesBox.y) + 376, width: 393, height: 393 },
});

await page.close();
await ctx.close();
await browser.close();
console.log("done");
