// Builds side-by-side strips per page for the audit.
// For each page: take the Figma 1440px-wide PNG and the rendered full.png,
// pad shorter to match height, output a 2880-wide composite.

import sharp from "sharp";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const PAGES = [
  { slug: "home",        figma: "audit/figma-fresh/home-1440.png" },
  { slug: "hotels",      figma: "audit/figma-fresh/hotels-1440.png" },
  { slug: "protect",     figma: "audit/figma-fresh/protect-1440.png" },
  { slug: "cleaning",    figma: "audit/figma-fresh/cleaning-1440.png" },
  { slug: "spivpratsya", figma: "audit/figma-fresh/spivpratsya-1440.png" },
];

const OUT_DIR = path.resolve("audit/sbs");
await mkdir(OUT_DIR, { recursive: true });

for (const p of PAGES) {
  const rendered = path.resolve(`.figma-review/${p.slug}/full.png`);
  const figma = path.resolve(p.figma);

  const fM = await sharp(figma).metadata();
  const rM = await sharp(rendered).metadata();
  const W = 1440;

  const H = Math.max(fM.height, rM.height);
  const aBuf = await sharp(figma).resize({ width: W }).extend({ bottom: Math.max(0, H - fM.height), background: { r: 240, g: 240, b: 240 } }).png().toBuffer();
  const bBuf = await sharp(rendered).resize({ width: W }).extend({ bottom: Math.max(0, H - rM.height), background: { r: 240, g: 240, b: 240 } }).png().toBuffer();

  // Stack horizontally with a thin separator.
  const outPath = path.join(OUT_DIR, `${p.slug}.png`);
  await sharp({ create: { width: W * 2 + 4, height: H, channels: 3, background: { r: 200, g: 200, b: 200 } } })
    .composite([
      { input: aBuf, top: 0, left: 0 },
      { input: bBuf, top: 0, left: W + 4 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`${p.slug}: ${W * 2 + 4} x ${H}, figma=${fM.width}x${fM.height}, rendered=${rM.width}x${rM.height}`);
}
