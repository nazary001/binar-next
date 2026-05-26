import { chromium } from "playwright";
import path from "node:path";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);

await page.screenshot({
  path: path.resolve("audit/home-whyus-full.png"),
  type: "png",
  fullPage: true,
});

const data = await page.evaluate(() => {
  const h2s = document.querySelectorAll("h2");
  let whyHeader = null;
  for (const h of h2s) {
    if (h.textContent && h.textContent.includes("Чому")) whyHeader = h;
  }
  if (!whyHeader) return { error: "no header" };
  const section = whyHeader.closest("section");
  const r = section.getBoundingClientRect();
  const ul = section.querySelector("ul");
  const ulR = ul.getBoundingClientRect();
  // Walk the relative wrapper to find divider containers.
  const wrapper = ul.parentElement;
  const wrapperChildren = Array.from(wrapper.children).map((c) => {
    const sr = c.getBoundingClientRect();
    return {
      tag: c.tagName,
      cls: c.className,
      ariaHidden: c.getAttribute("aria-hidden"),
      w: Math.round(sr.width),
      h: Math.round(sr.height),
      childCount: c.children.length,
    };
  });
  // Find dividers more precisely — pointer-events-none + absolute is unique
  const dividerDiv = wrapper.querySelector('div[class*="pointer-events-none"][class*="absolute"]');
  const dividers = dividerDiv ? Array.from(dividerDiv.children) : [];
  const dividerInfo = dividers.map((s) => {
    const sr = s.getBoundingClientRect();
    const cs = getComputedStyle(s);
    return {
      cls: s.className,
      w: sr.width,
      h: sr.height,
      x: Math.round(sr.x),
      y: Math.round(sr.y),
      display: cs.display,
      bg: cs.backgroundColor,
      pos: cs.position,
    };
  });
  return {
    sectionY: Math.round(r.y),
    sectionH: Math.round(r.height),
    ulY: Math.round(ulR.y),
    ulH: Math.round(ulR.height),
    ulW: Math.round(ulR.width),
    wrapperChildren,
    dividerCount: dividers.length,
    dividers: dividerInfo,
  };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();
