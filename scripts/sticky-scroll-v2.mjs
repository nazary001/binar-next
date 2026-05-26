// Capture sticky scroll behavior with annotations showing where deck is.
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

const info = await page.evaluate(() => {
  const sec = document.querySelector("#contact-form");
  const deck = document.querySelector(".quiz-deck");
  const header = document.querySelector("header");
  if (!sec || !deck) return null;
  return {
    section: { top: sec.getBoundingClientRect().top + window.scrollY, h: sec.getBoundingClientRect().height },
    deck: { docTop: deck.getBoundingClientRect().top + window.scrollY, h: deck.getBoundingClientRect().height },
    header: header ? { h: header.getBoundingClientRect().height } : null,
  };
});
console.log("info:", info);

// Test scrolls — focus on when sticky should be active
const scrolls = [
  info.section.top - 200,                    // before section
  info.deck.docTop - 24,                     // sticky engages
  info.deck.docTop + 100,                    // sticky active
  info.deck.docTop + 300,                    // sticky still active
  info.section.top + info.section.h - 600,   // sticky still active
  info.section.top + info.section.h - 200,   // sticky un-engages
  info.section.top + info.section.h + 100,   // past section
];

for (let i = 0; i < scrolls.length; i++) {
  const scrollY = scrolls[i];
  await page.evaluate((y) => window.scrollTo(0, y), scrollY);
  await page.waitForTimeout(300);
  const pos = await page.evaluate(() => {
    const deck = document.querySelector(".quiz-deck");
    return deck ? Math.round(deck.getBoundingClientRect().top) : null;
  });
  console.log(`scroll=${scrollY}: deck.top.viewport=${pos}`);
  await page.screenshot({
    path: path.resolve(`./.figma-review/hotels/sticky-v2-${i}.png`),
    type: "png",
  });
}

await page.close();
await ctx.close();
await browser.close();
