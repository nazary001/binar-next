import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });

const html = await page.evaluate(() => {
  const sec = document.querySelector("#contact-form");
  if (!sec) return "NOT FOUND";
  // Get section's immediate children
  return Array.from(sec.children).map(c => ({
    tag: c.tagName,
    classes: c.className.substring(0, 150),
  }));
});
console.log(JSON.stringify(html, null, 2));

await page.close();
await ctx.close();
await browser.close();
