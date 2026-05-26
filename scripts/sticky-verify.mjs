import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60_000 });

// Aggressive load
await page.evaluate(async () => {
  await new Promise((res) => {
    let yy = 0;
    const step = () => {
      window.scrollTo(0, yy);
      yy += 200;
      if (yy < 20000) setTimeout(step, 50);
      else { window.scrollTo(0, 0); setTimeout(res, 1500); }
    };
    step();
  });
});
await page.waitForTimeout(500);

// Find deck's actual document position right now
const initial = await page.evaluate(() => {
  const deck = document.querySelector(".quiz-deck");
  return {
    docTop: deck.getBoundingClientRect().top + window.scrollY,
    scrollY: window.scrollY,
  };
});
console.log("Initial state (scroll=0):", initial);

// Scroll to a position where sticky should be actively engaged
// = deck.docTop - 24 + some offset (so sticky is active)
const targets = [
  initial.docTop - 200,   // Below sticky engagement (form below sticky line)
  initial.docTop - 50,    // Approaching sticky
  initial.docTop + 50,    // Just past sticky engagement
  initial.docTop + 200,   // Sticky should be ACTIVE
];

for (let i = 0; i < targets.length; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), targets[i]);
  await page.waitForTimeout(400);
  const pos = await page.evaluate(() => {
    const deck = document.querySelector(".quiz-deck");
    return { vpTop: Math.round(deck.getBoundingClientRect().top), scrollY: window.scrollY };
  });
  console.log(`scrollTo(${targets[i]}): actual scroll=${pos.scrollY}, deck.viewport.top=${pos.vpTop}`);
  await page.screenshot({
    path: path.resolve(`./.figma-review/hotels/verify-${i}.png`),
    type: "png",
  });
}

await page.close();
await ctx.close();
await browser.close();
