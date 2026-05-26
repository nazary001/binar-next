// Capture the Customization card from the Solutions section
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1700 },
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

// Find the customization card (the bg-bg-subtle wrapper inside Solutions section).
// Solutions is the 6th main > section.
const box = await page.evaluate(() => {
  const sections = document.querySelectorAll("main > section");
  const sol = sections[5];
  if (!sol) return null;
  // Find the rounded customization card inside Solutions
  const card = sol.querySelector(".bg-bg-subtle");
  if (!card) return null;
  const r = card.getBoundingClientRect();
  return { y: r.y + window.scrollY, h: r.height };
});
if (!box) { console.log("not found"); process.exit(1); }
console.log(`Customization card: ${box.h}h at y=${box.y}`);

const clipY = Math.floor(box.y);
const clipH = Math.ceil(box.h);
await page.setViewportSize({ width: 1440, height: clipY + clipH + 200 });
await page.waitForTimeout(400);

await page.screenshot({
  path: path.resolve("./.figma-review/hotels/customization-rendered.png"),
  type: "png",
  clip: { x: 0, y: clipY, width: 1440, height: clipH },
});

await page.close();
await ctx.close();
await browser.close();
console.log("done");
