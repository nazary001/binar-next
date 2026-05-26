// Measure every section and key sub-component height for each page,
// compare against the Figma master.
import { chromium } from "playwright";

const PAGES = [
  { route: "/", slug: "home" },
  { route: "/hotels", slug: "hotels" },
  { route: "/protect", slug: "protect" },
  { route: "/cleaning", slug: "cleaning" },
  { route: "/spivpratsya", slug: "spivpratsya" },
];

const browser = await chromium.launch({ headless: true });

for (const p of PAGES) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3000${p.route}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const step = () => {
        window.scrollTo(0, y);
        y += 400;
        if (y < document.body.scrollHeight) setTimeout(step, 50);
        else { window.scrollTo(0, 0); setTimeout(res, 300); }
      };
      step();
    });
  });
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const out = [];
    const els = Array.from(document.querySelectorAll("body > * > section, body > header, body > footer, body > * > * > section"));
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const id = el.id || el.getAttribute("aria-label") || el.tagName;
      const cls = el.className && typeof el.className === "string" ? el.className.split(" ").slice(0, 2).join(" ") : "";
      out.push({
        id,
        cls: cls.substring(0, 40),
        top: Math.round(r.top + window.scrollY),
        height: Math.round(r.height),
      });
    }
    out.push({ id: "TOTAL_PAGE", cls: "", top: 0, height: Math.round(document.body.scrollHeight) });
    return out;
  });
  console.log(`\n=== ${p.slug} (${p.route}) ===`);
  for (const s of info) {
    console.log(`  y=${String(s.top).padStart(5)} h=${String(s.height).padStart(5)}  ${s.id} ${s.cls}`);
  }
  await page.close();
  await ctx.close();
}
await browser.close();
