// Capture top portion of home at multiple wide viewports to verify
// site looks proportionally identical regardless of screen size.
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });

const WIDTHS = [1440, 1920, 2560];

for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.resolve(`audit/fresh-section/site-wide-${w}.png`),
    type: "png",
    clip: { x: 0, y: 0, width: w, height: 900 },
  });
  console.log(`captured ${w}`);
  await page.close();
  await ctx.close();
}
await browser.close();
