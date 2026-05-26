// Verify the hotels Solutions marquee wraps seamlessly.
// Math check: read --marquee-shift, compute pixel shift, compare to
// one-copy period (4 items + 4 trailing margins).
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle" });
await page.waitForTimeout(600);

const data = await page.evaluate(() => {
  const ul = document.querySelector(".animate-marquee");
  if (!ul) return { error: "no marquee" };
  const cs = getComputedStyle(ul);
  const items = Array.from(ul.children);
  const itemRects = items.slice(0, 6).map((el) => {
    const r = el.getBoundingClientRect();
    const cs2 = getComputedStyle(el);
    return {
      w: Math.round(r.width),
      mr: cs2.marginRight,
    };
  });
  const trackW = ul.getBoundingClientRect().width;
  const shiftVar = cs.getPropertyValue("--marquee-shift").trim();
  const animation = cs.animationName + " " + cs.animationDuration;
  return {
    itemCount: items.length,
    track: Math.round(trackW),
    items: itemRects,
    shiftVar,
    animation,
  };
});

console.log(JSON.stringify(data, null, 2));

// At lg the SOURCE has 4 items, REPEATS=4 → 16 items total.
// One copy = 4 * (item + mr). Expected shift = track/4 = onePeriod.
if (!data.error) {
  const w = data.items[0].w;
  const mr = parseFloat(data.items[0].mr);
  const onePeriod = 4 * (w + mr);
  const shiftPct = parseFloat(data.shiftVar);
  const shiftPx = (shiftPct / 100) * data.track;
  console.log("\n=== seamless analysis ===");
  console.log(`item width: ${w}, mr: ${mr}`);
  console.log(`one copy period: ${onePeriod}px`);
  console.log(`track total: ${data.track}px (expected 4 x ${onePeriod} = ${4 * onePeriod})`);
  console.log(`shift var: ${data.shiftVar} -> ${shiftPx}px`);
  console.log(`diff: ${Math.abs(Math.abs(shiftPx) - onePeriod).toFixed(2)}px (should be ~0 for seamless)`);
}

await browser.close();
