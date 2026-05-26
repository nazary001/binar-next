// Capture key pages at mobile + tablet widths to verify responsive parity.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.resolve("audit/responsive");
await mkdir(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
];
const ROUTES = ["/", "/hotels", "/protect", "/cleaning", "/spivpratsya"];

const browser = await chromium.launch({ headless: true });

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    const slug = route === "/" ? "home" : route.replace("/", "");
    console.log(`-> ${vp.name} ${route}`);
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(async () => {
      await new Promise((res) => {
        let y = 0;
        const step = () => {
          window.scrollTo(0, y);
          y += 300;
          if (y < document.body.scrollHeight) setTimeout(step, 80);
          else { window.scrollTo(0, 0); setTimeout(res, 500); }
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
          setTimeout(res, 8000);
        }))),
        new Promise((res) => setTimeout(res, 20000)),
      ]);
    });
    // Pre-resize viewport to full document height so `fullPage: true`
    // doesn't need to do its own resize+rasterise on lazy-loaded images
    // near the bottom of the page.
    const docHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.setViewportSize({ width: vp.width, height: docHeight });
    await page.waitForTimeout(600);
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.race([
        Promise.all(imgs.map((img) => img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise((res) => {
          img.addEventListener("load", res, { once: true });
          img.addEventListener("error", res, { once: true });
          setTimeout(res, 8000);
        }))),
        new Promise((res) => setTimeout(res, 15000)),
      ]);
    });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(OUT, `${slug}-${vp.name}.png`),
      fullPage: true,
      type: "png",
    });
    await page.close();
  }
  await ctx.close();
}

await browser.close();
console.log("done");
