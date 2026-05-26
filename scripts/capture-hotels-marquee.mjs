import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const rect = await page.evaluate(() => {
  const marquee = document.querySelector(".animate-marquee");
  if (!marquee) return null;
  const wrapper = marquee.parentElement;
  const r = wrapper.getBoundingClientRect();
  const ul = marquee.getBoundingClientRect();
  return {
    wrapper: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    track: { w: Math.round(ul.width), h: Math.round(ul.height) },
    items: marquee.children.length,
  };
});

console.log("marquee state:", JSON.stringify(rect, null, 2));

// Full-page screenshot, then crop in JS based on un-zoomed coords.
// CSS `zoom` on html may affect coords differently than expected, so
// use full-page capture and let clip happen post-shot if needed.
await page.screenshot({
  path: path.resolve("audit/hotels-marquee-full.png"),
  type: "png",
  fullPage: true,
});

await browser.close();
console.log("saved audit/hotels-marquee-now.png");
