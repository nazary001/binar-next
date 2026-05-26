import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.resolve(".figma-review/_zoom");

const routes = [
  { path: "/",            slug: "home" },
  { path: "/hotels",      slug: "hotels" },
  { path: "/protect",     slug: "protect" },
  { path: "/cleaning",    slug: "cleaning" },
  { path: "/spivpratsya", slug: "spivpratsya" },
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1500 }, deviceScaleFactor: 1 });

for (const r of routes) {
  const page = await ctx.newPage();
  const outDir = path.join(OUT, r.slug);
  await mkdir(outDir, { recursive: true });
  console.log(`-> ${r.path}`);
  await page.goto(`${BASE}${r.path}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(500);
  // Trigger image fetches by scrolling once.
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const step = () => {
        window.scrollTo(0, y);
        y += 400;
        if (y < document.body.scrollHeight) setTimeout(step, 30);
        else { window.scrollTo(0, 0); setTimeout(res, 200); }
      };
      step();
    });
  });
  await page.waitForTimeout(400);

  const totalH = await page.evaluate(() => document.body.scrollHeight);
  const step = 1200;
  let i = 0;
  for (let y = 0; y < totalH; y += step) {
    await page.evaluate((sy) => window.scrollTo(0, sy), y);
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(outDir, `s-${String(i).padStart(2, "0")}.png`),
      type: "png",
      clip: { x: 0, y: 0, width: 1440, height: 1500 },
    });
    i++;
  }
  await page.close();
}
await ctx.close();
await browser.close();
console.log("done");
