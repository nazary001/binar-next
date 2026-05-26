// Measure cleaning page H1 dimensions
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/cleaning", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

const info = await page.evaluate(() => {
  const h1 = document.querySelector("h1");
  if (!h1) return null;
  const r = h1.getBoundingClientRect();
  const cs = getComputedStyle(h1);
  return {
    text: h1.textContent,
    width: r.width,
    height: r.height,
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    fontFamily: cs.fontFamily,
    fontWeight: cs.fontWeight,
    letterSpacing: cs.letterSpacing,
    wordBreak: cs.wordBreak,
    overflowWrap: cs.overflowWrap,
    parent: h1.parentElement?.getBoundingClientRect().width,
    parentClass: h1.parentElement?.className,
  };
});
console.log(JSON.stringify(info, null, 2));

await page.close();
await ctx.close();
await browser.close();
