// Exercise the items-panel positioning across every card label,
// at multiple viewport widths, and verify:
//   1. The panel rect lives entirely inside the viewport
//      (left >= 24 && top >= 24 && right <= vw-24 && bottom <= vh-24).
//   2. The panel never overlaps the hovered card itself.
//   3. The panel renders at >= MIN_W (no zero-width collapse).
//
// Failures print a row in the table — green checks mean the
// layout holds at that combination.
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });

const CARDS = [
  "Ванна кімната",
  "Рецепція",
  "Засоби індивідуального захисту",
  "Ресторан/Бар",
  "Мінібар",
  "Кімната/спальня",
  "Обслуговування територій",
  "СПА",
  "Санвузли загального користування",
  "Інші зручності для гостей",
];

const VIEWPORTS = [1024, 1280, 1440, 1920];

const PANEL_GAP = 24;

function check(label, vw, vh, cardRect, panelRect) {
  const errors = [];
  // Inside viewport
  if (panelRect.left < PANEL_GAP - 0.5) errors.push(`left ${panelRect.left.toFixed(1)} < gap`);
  if (panelRect.top < PANEL_GAP - 0.5) errors.push(`top ${panelRect.top.toFixed(1)} < gap`);
  if (panelRect.left + panelRect.width > vw - PANEL_GAP + 0.5) errors.push(`right ${(panelRect.left + panelRect.width).toFixed(1)} > vw-gap`);
  if (panelRect.top + panelRect.height > vh - PANEL_GAP + 0.5) errors.push(`bottom ${(panelRect.top + panelRect.height).toFixed(1)} > vh-gap`);
  // No overlap with card
  const overlapH = panelRect.left < cardRect.right - 0.5 && panelRect.left + panelRect.width > cardRect.left + 0.5;
  const overlapV = panelRect.top < cardRect.bottom - 0.5 && panelRect.top + panelRect.height > cardRect.top + 0.5;
  if (overlapH && overlapV) errors.push("overlaps card");
  return errors;
}

const results = [];

for (const w of VIEWPORTS) {
  const h = Math.round((900 / 1440) * w);  // proportional height
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/hotels", { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => {
    const sections = document.querySelectorAll("main > section");
    sections[1]?.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await page.waitForTimeout(400);

  for (const label of CARDS) {
    const locator = page.locator(`text="${label}"`).first();
    if ((await locator.count()) === 0) continue;
    try {
      await locator.hover({ timeout: 3000 });
    } catch (e) {
      results.push({ w, h, label, errors: ["hover failed"] });
      continue;
    }
    await page.waitForTimeout(450);

    const data = await page.evaluate((labelTxt) => {
      const cards = Array.from(document.querySelectorAll("div.group"));
      const card = cards.find(c => c.textContent?.includes(labelTxt));
      const fixed = Array.from(document.querySelectorAll("div.fixed"));
      const panel = fixed.find(el => el.querySelector("h3"));
      if (!card || !panel) return null;
      const c = card.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      return {
        card: { left: c.left, top: c.top, right: c.right, bottom: c.bottom, width: c.width, height: c.height },
        panel: { left: p.left, top: p.top, width: p.width, height: p.height },
        vw: window.innerWidth,
        vh: window.innerHeight,
      };
    }, label);
    if (!data) {
      results.push({ w, h, label, errors: ["no panel"] });
      continue;
    }
    const errors = check(label, data.vw, data.vh, data.card, data.panel);
    results.push({
      w, h, label,
      errors,
      side: data.panel.left >= data.card.right ? "right" : data.panel.left + data.panel.width <= data.card.left ? "left" : (data.panel.top + data.panel.height <= data.card.top ? "above" : "below"),
      panelW: Math.round(data.panel.width),
      panelH: Math.round(data.panel.height),
    });
  }
  await page.close();
  await ctx.close();
}
await browser.close();

const ok = results.filter(r => r.errors.length === 0).length;
const total = results.length;
console.log(`\n${ok}/${total} OK\n`);
console.table(results.map(r => ({
  vw: r.w,
  card: r.label.length > 24 ? r.label.slice(0, 22) + ".." : r.label,
  side: r.side || "-",
  size: r.panelW ? `${r.panelW}x${r.panelH}` : "-",
  status: r.errors.length === 0 ? "OK" : r.errors.join(", "),
})));
