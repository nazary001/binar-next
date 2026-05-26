import { chromium } from "playwright";

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

await page.waitForTimeout(800);

// Scroll to form
await page.evaluate(() => {
  document.querySelector("#contact-form")?.scrollIntoView({ block: "start" });
  window.scrollBy(0, 400); // scroll past heading
});
await page.waitForTimeout(500);

const info = await page.evaluate(() => {
  const deck = document.querySelector(".quiz-deck");
  const cs = getComputedStyle(deck);
  const r = deck.getBoundingClientRect();
  // Check the parent (section)
  const section = deck.parentElement;
  const sr = section.getBoundingClientRect();
  return {
    deckRect: { top: r.top, h: r.height },
    sectionRect: { top: sr.top, h: sr.height, bottom: sr.top + sr.height },
    deckCss: {
      position: cs.position,
      top: cs.top,
      zIndex: cs.zIndex,
      display: cs.display,
    },
    parentClasses: section.className.substring(0, 100),
    parentTag: section.tagName,
  };
});
console.log(JSON.stringify(info, null, 2));

await page.close();
await ctx.close();
await browser.close();
