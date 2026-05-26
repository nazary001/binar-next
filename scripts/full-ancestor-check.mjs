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
      yy += 200;
      if (yy < 20000) setTimeout(step, 50);
      else { window.scrollTo(0, 0); setTimeout(res, 1500); }
    };
    step();
  });
});

await page.waitForTimeout(500);

const result = await page.evaluate(() => {
  const deck = document.querySelector(".quiz-deck");
  const ancestors = [];
  let el = deck;
  while (el && el !== document.documentElement.parentElement) {
    const cs = getComputedStyle(el);
    ancestors.push({
      tag: el.tagName,
      classes: (el.className || "").substring(0, 80),
      position: cs.position,
      overflow: cs.overflow,
      transform: cs.transform,
      contain: cs.contain,
      willChange: cs.willChange,
      filter: cs.filter,
      zoom: cs.zoom,
    });
    el = el.parentElement;
  }
  return ancestors;
});

result.forEach((a, i) => {
  console.log(`[${i}] ${a.tag} (${a.classes})`);
  console.log(`    pos=${a.position} overflow=${a.overflow} transform=${a.transform} contain=${a.contain} zoom=${a.zoom}`);
});

await page.close();
await ctx.close();
await browser.close();
