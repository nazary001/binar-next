// Capture sticky scroll behavior using scrollIntoView + relative scrolls.
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

// Scroll the form into view, then capture multiple progressive scrolls
await page.evaluate(() => {
  document.querySelector("#contact-form")?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(400);

// Initial state: form section just appeared
const labels = ["start", "+200", "+400", "+600", "+800"];
for (let i = 0; i < labels.length; i++) {
  if (i > 0) {
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(300);
  }
  const pos = await page.evaluate(() => {
    const deck = document.querySelector(".quiz-deck");
    return deck ? Math.round(deck.getBoundingClientRect().top) : null;
  });
  console.log(`${labels[i]}: deck.top.viewport=${pos}`);
  await page.screenshot({
    path: path.resolve(`./.figma-review/hotels/sticky-v3-${labels[i]}.png`),
    type: "png",
  });
}

await page.close();
await ctx.close();
await browser.close();
