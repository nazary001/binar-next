// Capture hotels hero across all breakpoints
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });

const VIEWPORTS = [
  { w: 390, h: 1200, label: "mobile-390" },
  { w: 768, h: 1400, label: "tablet-768" },
  { w: 1024, h: 1100, label: "desktop-1024" },
  { w: 1280, h: 1100, label: "desktop-1280" },
  { w: 1440, h: 1100, label: "desktop-1440" },
  { w: 1920, h: 1200, label: "desktop-1920" },
];

for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: v.h },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(800);
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
  await page.waitForTimeout(400);

  // Get the hero section bottom y
  const heroBox = await page.evaluate(() => {
    const sec = document.querySelector("main > section:first-of-type");
    const r = sec?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
  });
  const clipH = Math.min(v.h - 20, Math.ceil((heroBox?.y || 0) + (heroBox?.h || 0) + 20));
  await page.screenshot({
    path: path.resolve(`./.figma-review/hotels/hero-${v.label}.png`),
    type: "png",
    clip: { x: 0, y: 0, width: v.w, height: clipH },
  });
  console.log(`${v.label}: hero ${heroBox?.w}x${heroBox?.h} captured (clip ${clipH}h)`);

  await page.close();
  await ctx.close();
}
await browser.close();
