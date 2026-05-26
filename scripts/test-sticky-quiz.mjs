// Verify the quiz-deck sticky behavior on the home page.
// Tests 3 scroll positions: above form, form sticky-at-top, below form.
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60_000 });

// Slow scroll to load lazy
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

// Find form section
const formInfo = await page.evaluate(() => {
  const sec = document.querySelector("#contact-form");
  if (!sec) return null;
  const r = sec.getBoundingClientRect();
  return { top: r.top + window.scrollY, h: r.height };
});
if (!formInfo) { console.log("not found"); process.exit(1); }
console.log(`Form section: top=${formInfo.top}, h=${formInfo.h}`);

// Scenario 1: scroll to JUST BEFORE form (form at bottom of viewport)
// User sees the section heading appear at the top of viewport.
await page.evaluate((y) => window.scrollTo(0, y), formInfo.top - 100);
await page.waitForTimeout(400);
await page.screenshot({
  path: path.resolve("./.figma-review/hotels/sticky-1-approach.png"),
  type: "png",
});

// Scenario 2: scroll INTO form section so quiz-deck sticks
await page.evaluate((y) => window.scrollTo(0, y), formInfo.top + 400);
await page.waitForTimeout(400);
await page.screenshot({
  path: path.resolve("./.figma-review/hotels/sticky-2-stuck.png"),
  type: "png",
});

// Scenario 3: scroll further so the deck is near bottom of section (sticky released)
await page.evaluate((y) => window.scrollTo(0, y), formInfo.top + formInfo.h - 200);
await page.waitForTimeout(400);
await page.screenshot({
  path: path.resolve("./.figma-review/hotels/sticky-3-released.png"),
  type: "png",
});

// Inspect the deck element position to verify sticky
const deckInfo = await page.evaluate(() => {
  const deck = document.querySelector(".quiz-deck");
  if (!deck) return null;
  const r = deck.getBoundingClientRect();
  const cs = getComputedStyle(deck);
  return {
    top: r.top,
    position: cs.position,
    zIndex: cs.zIndex,
  };
});
console.log("Deck at scenario 3:", deckInfo);

await page.close();
await ctx.close();
await browser.close();
console.log("done");
