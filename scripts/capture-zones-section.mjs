// Capture hotels Zones section at multiple viewport widths.
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });

const VIEWPORTS = [
  { w: 390, h: 3000, label: "mobile-390" },
  { w: 768, h: 3000, label: "tablet-768" },
  { w: 1024, h: 2500, label: "desktop-1024" },
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
  // Scroll to trigger lazy loading
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
  await page.waitForTimeout(400);

  // Find ZonesGrid section (second section in main)
  const zonesBox = await page.evaluate(() => {
    const sections = document.querySelectorAll("main > section");
    const zones = sections[1];
    if (!zones) return null;
    const r = zones.getBoundingClientRect();
    return { x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height };
  });
  if (!zonesBox) {
    console.log(`${v.label}: zones section not found`);
    await page.close();
    await ctx.close();
    continue;
  }
  console.log(`${v.label}: zones ${zonesBox.w}x${zonesBox.h} at y=${zonesBox.y}`);

  // Resize viewport to fit the zones section
  const clipY = Math.floor(zonesBox.y);
  const clipH = Math.ceil(zonesBox.h);
  await page.setViewportSize({ width: v.w, height: clipY + clipH + 200 });
  await page.waitForTimeout(400);
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
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.resolve(`./.figma-review/hotels/zones-${v.label}.png`),
    type: "png",
    clip: { x: 0, y: clipY, width: v.w, height: clipH },
  });

  await page.close();
  await ctx.close();
}
await browser.close();
console.log("done");
