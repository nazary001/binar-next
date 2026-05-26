// Capture the protect Solutions dark cap at multiple viewport widths.
// Mirrors scripts/capture-hotels-decor.mjs but targets /protect.

import { chromium } from "playwright";
import path from "node:path";
import sharp from "sharp";

const WIDTHS = [1280, 1440, 1600, 1920];

const browser = await chromium.launch({ headless: true });
for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/protect", { waitUntil: "networkidle", timeout: 60_000 });

  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const step = () => {
        window.scrollTo(0, y);
        y += 400;
        if (y < document.body.scrollHeight) setTimeout(step, 30);
        else { window.scrollTo(0, 0); setTimeout(res, 300); }
      };
      step();
    });
  });

  const measure = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h2"));
    const target = headings.find((h) => h.textContent && h.textContent.includes("Основні рішення"));
    if (!target) return null;
    let el = target;
    while (el && el.parentElement) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg === "rgb(45, 45, 47)") break;
      el = el.parentElement;
    }
    if (!el) return null;
    let docTop = 0;
    let n = el;
    while (n) { docTop += n.offsetTop; n = n.offsetParent; }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    return { docTop, w, h };
  });
  if (!measure) {
    console.error(`[${width}] cap not found`);
    await page.close(); await ctx.close(); continue;
  }
  console.log(`[${width}] measure ${JSON.stringify(measure)}`);

  const fullPath = path.resolve(`.tmp/protect-decor-${width}-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true, type: "png" });

  const zoom = width < 1024 ? 1 : width / 1440;
  const sx = 0;
  const sy = Math.floor(measure.docTop * zoom);
  const sw = Math.floor(measure.w * zoom);
  const sh = Math.ceil(measure.h * zoom);
  const cropPath = path.resolve(`.tmp/protect-decor-${width}.png`);
  await sharp(fullPath).extract({ left: sx, top: sy, width: sw, height: sh }).toFile(cropPath);
  console.log(`[${width}] cropped ${cropPath} sx=${sx} sy=${sy} sw=${sw} sh=${sh}`);

  await page.close();
  await ctx.close();
}
await browser.close();
