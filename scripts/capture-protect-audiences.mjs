import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/protect", { waitUntil: "networkidle" });
await page.waitForTimeout(600);

await page.screenshot({
  path: path.resolve("audit/protect-full.png"),
  type: "png",
  fullPage: true,
});

const rect = await page.evaluate(() => {
  const h2s = document.querySelectorAll("h2");
  let header = null;
  for (const h of h2s) {
    if (h.textContent && h.textContent.includes("Для яких бізнесів")) header = h;
  }
  if (!header) return null;
  const section = header.closest("section");
  const r = section.getBoundingClientRect();
  return { y: Math.round(r.y), h: Math.round(r.height) };
});
console.log("section:", JSON.stringify(rect));
await browser.close();
