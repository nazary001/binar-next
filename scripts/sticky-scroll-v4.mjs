// Scroll directly to form section after full page load.
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60_000 });

// Aggressive lazy-load: scroll all the way down, all the way back
await page.evaluate(async () => {
  await new Promise((res) => {
    let yy = 0;
    const step = () => {
      window.scrollTo(0, yy);
      yy += 200;
      if (yy < document.body.scrollHeight + 5000) setTimeout(step, 80);
      else { window.scrollTo(0, 0); setTimeout(res, 600); }
    };
    step();
  });
});

// Wait for all images
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

// Now measure the form section's true position
const info = await page.evaluate(() => {
  const sec = document.querySelector("#contact-form");
  const deck = document.querySelector(".quiz-deck");
  return {
    secTop: sec.getBoundingClientRect().top + window.scrollY,
    secH: sec.getBoundingClientRect().height,
    deckTop: deck.getBoundingClientRect().top + window.scrollY,
    deckH: deck.getBoundingClientRect().height,
  };
});
console.log("Form info:", info);

// Scroll just past the deck's natural position to see sticky engage
const scrolls = [
  info.deckTop - 300,         // before sticky
  info.deckTop - 24,          // at sticky engagement
  info.deckTop + 100,         // sticky active
  info.deckTop + 400,         // sticky active deeper
];

for (let i = 0; i < scrolls.length; i++) {
  await page.evaluate((y) => window.scrollTo(0, y), scrolls[i]);
  await page.waitForTimeout(300);
  const pos = await page.evaluate(() => {
    const deck = document.querySelector(".quiz-deck");
    return Math.round(deck.getBoundingClientRect().top);
  });
  console.log(`scroll=${scrolls[i]}: deck.top.viewport=${pos}`);
  await page.screenshot({
    path: path.resolve(`./.figma-review/hotels/sticky-v4-${i}.png`),
    type: "png",
  });
}

await page.close();
await ctx.close();
await browser.close();
