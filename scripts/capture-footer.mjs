// Capture the footer at 1440 viewport for comparison with Figma.

import { chromium } from "playwright";
import path from "node:path";
import sharp from "sharp";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60_000 });

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
  const footer = document.querySelector("footer");
  if (!footer) return null;
  let docTop = 0;
  let n = footer;
  while (n) { docTop += n.offsetTop; n = n.offsetParent; }
  return { docTop, w: footer.offsetWidth, h: footer.offsetHeight };
});
console.log("footer", measure);

const fullPath = path.resolve(`.tmp/footer-fullpage.png`);
await page.screenshot({ path: fullPath, fullPage: true, type: "png" });

const zoom = 1440 / 1440;
const sx = 0;
const sy = Math.floor(measure.docTop * zoom);
const sw = Math.floor(measure.w * zoom);
const sh = Math.ceil(measure.h * zoom);
const cropPath = path.resolve(`.tmp/footer-rendered.png`);
await sharp(fullPath).extract({ left: sx, top: sy, width: sw, height: sh }).toFile(cropPath);
console.log("cropped", cropPath, "sy=", sy, "sw=", sw, "sh=", sh);

await page.close();
await ctx.close();
await browser.close();
