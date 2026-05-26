import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1700 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle", timeout: 60_000 });
await page.evaluate(() => {
  const sections = document.querySelectorAll("main > section");
  sections[1]?.scrollIntoView({ block: "start", behavior: "instant" });
});
await page.waitForTimeout(400);

// Hover over Ванна кімната card via direct DOM event
await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll("div.group"));
  const bathroom = cards.find(c => c.textContent?.includes("Ванна кімната"));
  if (!bathroom) return console.error("not found");
  bathroom.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
  // Simulate :hover with stealth — playwright's hover() may move cursor away
});

await page.locator('text="Ванна кімната"').first().hover();
await page.waitForTimeout(500);

// Inspect computed styles
const data = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll("div.group"));
  const bathroom = cards.find(c => c.textContent?.includes("Ванна кімната"));
  if (!bathroom) return null;
  const cs = getComputedStyle(bathroom);
  return {
    className: bathroom.className.substring(0, 250),
    border: cs.border,
    borderColor: cs.borderColor,
    boxShadow: cs.boxShadow,
    matches_hover: bathroom.matches(":hover"),
  };
});
console.log(JSON.stringify(data, null, 2));

await page.close();
await ctx.close();
await browser.close();
