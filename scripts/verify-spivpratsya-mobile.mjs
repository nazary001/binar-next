import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = process.argv[2] || "audit/responsive/spivpratsya-mobile-before";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 800 },
  deviceScaleFactor: 1,
});

const page = await ctx.newPage();
console.log("-> mobile /spivpratsya");
await page.goto("http://localhost:3000/spivpratsya", { waitUntil: "networkidle", timeout: 90000 });

await page.evaluate(async () => {
  await new Promise((res) => {
    let y = 0;
    const step = () => {
      window.scrollTo(0, y);
      y += 300;
      if (y < document.body.scrollHeight) setTimeout(step, 80);
      else { window.scrollTo(0, 0); setTimeout(res, 800); }
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
    new Promise((res) => setTimeout(res, 15000)),
  ]);
});

const docHeight = await page.evaluate(() => document.body.scrollHeight);
const stripHeight = 800;
const strips = Math.ceil(docHeight / stripHeight);
for (let i = 0; i < strips; i++) {
  const y = i * stripHeight;
  const h = Math.min(stripHeight, docHeight - y);
  await page.setViewportSize({ width: 390, height: h });
  await page.evaluate((sy) => window.scrollTo(0, sy), y);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(OUT, `strip-${String(i).padStart(2,"0")}.png`),
    type: "png",
  });
}

await browser.close();
console.log(`done — ${strips} strips`);
