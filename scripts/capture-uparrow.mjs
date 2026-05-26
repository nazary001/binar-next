// Capture just the scroll-up button area from the footer at 1440.

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
      else { window.scrollTo(0, document.body.scrollHeight); setTimeout(res, 800); }
    };
    step();
  });
});
// Wait for all images to finish loading
await page.evaluate(async () => {
  const imgs = Array.from(document.images);
  await Promise.all(imgs.map((img) => img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise((res) => {
    img.addEventListener("load", res, { once: true });
    img.addEventListener("error", res, { once: true });
    setTimeout(res, 5000);
  })));
});
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);

const measure = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Догори"]');
  if (!btn) return null;
  let docTop = 0;
  let docLeft = 0;
  let n = btn;
  while (n) { docTop += n.offsetTop; docLeft += n.offsetLeft; n = n.offsetParent; }
  // Also report what's inside
  const inner = Array.from(btn.children).map((c) => ({
    tag: c.tagName,
    cls: c.className,
    src: c.getAttribute("src"),
    rect: c.getBoundingClientRect(),
    cs: c.tagName === "IMG" ? { complete: c.complete, naturalW: c.naturalWidth } : null,
  }));
  return { docTop, docLeft, w: btn.offsetWidth, h: btn.offsetHeight, inner };
});
console.log("btn", JSON.stringify(measure, null, 2));

const fullPath = path.resolve(`.tmp/footer-fullpage.png`);
await page.screenshot({ path: fullPath, fullPage: true, type: "png" });

const pad = 30;
const sx = Math.max(0, Math.floor(measure.docLeft) - pad);
const sy = Math.max(0, Math.floor(measure.docTop) - pad);
const sw = measure.w + pad*2;
const sh = measure.h + pad*2;
const cropPath = path.resolve(`.tmp/uparrow-rendered.png`);
await sharp(fullPath).extract({ left: sx, top: sy, width: sw, height: sh }).toFile(cropPath);
console.log("cropped", cropPath);

await page.close();
await ctx.close();
await browser.close();
