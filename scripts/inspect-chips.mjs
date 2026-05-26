import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForTimeout(500);

await page.evaluate(() => {
  const sections = document.querySelectorAll("main > section");
  sections[1]?.scrollIntoView({ block: "start", behavior: "instant" });
});
await page.waitForTimeout(400);

await page.locator('text="Ванна кімната"').first().hover();
await page.waitForTimeout(500);

const data = await page.evaluate(() => {
  const fixed = Array.from(document.querySelectorAll("div.fixed"));
  const panel = fixed.find(el => el.querySelector("h3"));
  if (!panel) return null;
  const panelRect = panel.getBoundingClientRect();
  const ul = panel.querySelector("ul");
  const ulRect = ul?.getBoundingClientRect();
  const ulCS = ul ? getComputedStyle(ul) : null;
  const chips = Array.from(panel.querySelectorAll("li")).slice(0, 10).map(li => {
    const r = li.getBoundingClientRect();
    const cs = getComputedStyle(li);
    return {
      text: li.textContent?.substring(0, 30),
      w: Math.round(r.width * 10) / 10,
      h: Math.round(r.height * 10) / 10,
      px: cs.paddingLeft + " / " + cs.paddingRight,
      py: cs.paddingTop + " / " + cs.paddingBottom,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      fontFamily: cs.fontFamily.substring(0, 20),
    };
  });
  return {
    panel: { w: panelRect.width, h: panelRect.height },
    ul: ulRect ? { w: ulRect.width, gap: ulCS?.gap } : null,
    chips,
  };
});
console.log(JSON.stringify(data, null, 2));

await page.close();
await ctx.close();
await browser.close();
