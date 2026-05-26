// Capture PartnerBrands across breakpoints
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const VIEWPORTS = [
  { w: 390, h: 4000, label: "mobile-390" },
  { w: 768, h: 3500, label: "tablet-768" },
  { w: 1024, h: 3000, label: "desktop-1024" },
  { w: 1440, h: 2500, label: "desktop-1440" },
  { w: 1920, h: 2500, label: "desktop-1920" },
];

for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: v.h },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(async () => {
    await new Promise((res) => {
      let yy = 0;
      const step = () => {
        window.scrollTo(0, yy);
        yy += 400;
        if (yy < document.body.scrollHeight) setTimeout(step, 40);
        else { window.scrollTo(0, 0); setTimeout(res, 400); }
      };
      step();
    });
  });
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

  const box = await page.evaluate(() => {
    const sections = document.querySelectorAll("main > section");
    const s = sections[4];
    if (!s) return null;
    const r = s.getBoundingClientRect();
    return { y: r.y + window.scrollY, h: r.height };
  });
  if (!box) { await page.close(); await ctx.close(); continue; }
  console.log(`${v.label}: ${box.h}h at y=${box.y}`);

  const clipY = Math.floor(box.y);
  const clipH = Math.ceil(box.h);
  await page.setViewportSize({ width: v.w, height: clipY + clipH + 200 });
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.resolve(`./.figma-review/hotels/partners-${v.label}.png`),
    type: "png",
    clip: { x: 0, y: clipY, width: v.w, height: clipH },
  });
  await page.close();
  await ctx.close();
}
await browser.close();
