// Scroll slowly through the form section and capture sticky state.
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
      else { window.scrollTo(0, 0); setTimeout(res, 600); }
    };
    step();
  });
});

// Settle
await page.waitForTimeout(1000);

// Use element.scrollIntoView correctly
await page.evaluate(() => {
  const form = document.querySelector("#contact-form");
  form?.scrollIntoView({ block: "start", behavior: "instant" });
  // Account for the sticky header (88px) by scrolling back
  window.scrollBy(0, -100);
});
await page.waitForTimeout(500);

// Initial state
let pos = await page.evaluate(() => {
  const deck = document.querySelector(".quiz-deck");
  const r = deck.getBoundingClientRect();
  return { top: r.top, h: r.height };
});
console.log("Initial:", pos);
await page.screenshot({ path: ".figma-review/hotels/mid-0.png" });

// Scroll by deck-height worth of pixels in small steps
for (let i = 1; i <= 6; i++) {
  await page.evaluate(() => window.scrollBy(0, 150));
  await page.waitForTimeout(300);
  pos = await page.evaluate(() => {
    const deck = document.querySelector(".quiz-deck");
    return Math.round(deck.getBoundingClientRect().top);
  });
  console.log(`After +${i*150}: deck.top=${pos}`);
  await page.screenshot({ path: `.figma-review/hotels/mid-${i}.png` });
}

await page.close();
await ctx.close();
await browser.close();
