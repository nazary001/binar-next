import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 800 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForTimeout(800);

const data = await page.evaluate(() => {
  const section = document.querySelector("main > section:first-of-type");
  const card = section?.querySelector(".flex.flex-col.gap-12, [class*='lg:w-[837px]']") || section?.children[0]?.children[0];
  const photo = section?.querySelector("[class*='lg:w-[721px]'], [style*='726053']") || section?.children[0]?.children[1];
  const img = photo?.querySelector("img");

  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  const cs = (el) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      position: s.position,
      width: s.width,
      height: s.height,
      top: s.top,
      right: s.right,
      bottom: s.bottom,
      left: s.left,
      objectFit: s.objectFit,
      objectPosition: s.objectPosition,
      transform: s.transform,
      maxWidth: s.maxWidth,
    };
  };

  return {
    section: rect(section),
    card: { rect: rect(card), tag: card?.tagName, className: card?.className?.substring?.(0, 120) },
    photo: { rect: rect(photo), tag: photo?.tagName, className: photo?.className?.substring?.(0, 120) },
    img: { rect: rect(img), styles: cs(img), src: img?.src },
    devicePixelRatio: window.devicePixelRatio,
    zoom: getComputedStyle(document.documentElement).zoom,
  };
});

console.log(JSON.stringify(data, null, 2));
await page.close();
await ctx.close();
await browser.close();
