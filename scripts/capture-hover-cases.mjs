// Visual verification: capture key hover scenarios.
import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });

const CASES = [
  { vw: 1024, label: "Ванна кімната" },       // col 1, small viewport
  { vw: 1024, label: "Мінібар" },             // col 2 — most constrained
  { vw: 1024, label: "СПА" },                  // col 3, tall
  { vw: 1280, label: "Мінібар" },              // col 2, medium viewport
  { vw: 1440, label: "Кімната/спальня" },     // col 2, design native
  { vw: 1920, label: "Інші зручності для гостей" }, // col 3, large viewport
];

for (const c of CASES) {
  const h = Math.round((900 / 1440) * c.vw);
  const ctx = await browser.newContext({
    viewport: { width: c.vw, height: h },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => {
    const sections = document.querySelectorAll("main > section");
    sections[1]?.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await page.waitForTimeout(400);

  await page.locator(`text="${c.label}"`).first().hover();
  await page.waitForTimeout(500);

  const safeLabel = c.label.replace(/[\/\\:]/g, "-").slice(0, 20);
  await page.screenshot({
    path: path.resolve(`./.figma-review/hotels/hover-${c.vw}-${safeLabel}.png`),
    type: "png",
    fullPage: false,
  });
  console.log(`captured ${c.vw} / ${c.label}`);

  await page.close();
  await ctx.close();
}
await browser.close();
