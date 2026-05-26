// Test sticky scroll at multiple positions to verify behavior.
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60_000 });
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

const info = await page.evaluate(() => {
  const sec = document.querySelector("#contact-form");
  const deck = document.querySelector(".quiz-deck");
  if (!sec || !deck) return null;
  return {
    sectionTop: sec.getBoundingClientRect().top + window.scrollY,
    sectionHeight: sec.getBoundingClientRect().height,
    // Deck top relative to document
    deckDocTop: deck.getBoundingClientRect().top + window.scrollY,
  };
});
console.log("Section info:", info);

// Scroll positions to test (offset from section top)
const offsets = [0, 200, 400, 600, 800, 1000];
for (const offset of offsets) {
  const scrollY = info.sectionTop + offset;
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(300);
  const deckPos = await page.evaluate(() => {
    const deck = document.querySelector(".quiz-deck");
    return deck ? deck.getBoundingClientRect().top : null;
  });
  await page.screenshot({
    path: path.resolve(`./.figma-review/hotels/sticky-test-${offset}.png`),
    type: "png",
  });
  console.log(`scroll=${scrollY} (offset+${offset}): deck.top.viewport=${deckPos}`);
}

await page.close();
await ctx.close();
await browser.close();
