// Capture ZonesGrid with hover panel open.
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForTimeout(800);

// Scroll the zones grid into view
await page.evaluate(() => {
  const sections = document.querySelectorAll("main > section");
  sections[1]?.scrollIntoView({ block: "start", behavior: "instant" });
});
await page.waitForTimeout(500);

// Hover over the bathroom card
const bathroomCard = await page.locator('text="Ванна кімната"').first();
await bathroomCard.hover();
await page.waitForTimeout(700);

// Inspect the hover panel
const panel = await page.evaluate(() => {
  const fixed = Array.from(document.querySelectorAll("div.fixed"));
  const candidate = fixed.find(el => el.querySelector("h3"));
  if (!candidate) return null;
  const r = candidate.getBoundingClientRect();
  const cs = getComputedStyle(candidate);
  return {
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    opacity: cs.opacity,
    transform: cs.transform,
    html: candidate.outerHTML.substring(0, 500),
  };
});
console.log("panel:", JSON.stringify(panel, null, 2));

await page.screenshot({
  path: path.resolve("./.figma-review/hotels/zones-hover-rendered.png"),
  type: "png",
  fullPage: false,
});

await page.close();
await ctx.close();
await browser.close();
console.log("done");
