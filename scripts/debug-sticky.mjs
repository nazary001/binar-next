import { chromium } from "playwright";

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
  const deck = document.querySelector(".quiz-deck");
  if (!deck) return null;
  const cs = getComputedStyle(deck);
  return {
    classes: deck.className,
    position: cs.position,
    top: cs.top,
    zIndex: cs.zIndex,
    // Check parent overflow
    parents: (() => {
      const arr = [];
      let p = deck.parentElement;
      while (p && arr.length < 6) {
        const pcs = getComputedStyle(p);
        arr.push({ tag: p.tagName, classes: p.className.slice(0, 80), overflow: pcs.overflow, overflowX: pcs.overflowX, overflowY: pcs.overflowY });
        p = p.parentElement;
      }
      return arr;
    })(),
  };
});
console.log(JSON.stringify(info, null, 2));
await page.close();
await ctx.close();
await browser.close();
