// Build side-by-side composites: figma left vs rendered right, sliced vertically.
// Output: .figma-review/<route>/diff-<n>.png

import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(".figma-review");
const TILE_H = 1600; // vertical slice height in unified px space
const LANE_W = 720;  // width of each lane (figma | rendered)

const routes = ["home", "protect", "cleaning", "hotels", "spivpratsya"];

for (const slug of routes) {
  const dir = path.join(ROOT, slug);
  const figma = sharp(path.join(dir, "figma.png"));
  const real  = sharp(path.join(dir, "full.png"));
  const fM = await figma.metadata();
  const rM = await real.metadata();

  // Resize both to the same lane width.
  const fScaled = await sharp(path.join(dir, "figma.png")).resize({ width: LANE_W }).png().toBuffer();
  const rScaled = await sharp(path.join(dir, "full.png" )).resize({ width: LANE_W }).png().toBuffer();
  const fInfo = await sharp(fScaled).metadata();
  const rInfo = await sharp(rScaled).metadata();
  const fullH = Math.max(fInfo.height, rInfo.height);

  // Pad each lane to the same height (white).
  const fPadded = await sharp({
    create: { width: LANE_W, height: fullH, channels: 3, background: { r: 255, g: 255, b: 255 } },
  }).composite([{ input: fScaled, top: 0, left: 0 }]).png().toBuffer();
  const rPadded = await sharp({
    create: { width: LANE_W, height: fullH, channels: 3, background: { r: 255, g: 255, b: 255 } },
  }).composite([{ input: rScaled, top: 0, left: 0 }]).png().toBuffer();

  // Slice both into TILE_H tiles and put figma | rendered into one image per tile.
  const slices = Math.ceil(fullH / TILE_H);
  for (let i = 0; i < slices; i++) {
    const y = i * TILE_H;
    const h = Math.min(TILE_H, fullH - y);
    const f = await sharp(fPadded).extract({ left: 0, top: y, width: LANE_W, height: h }).png().toBuffer();
    const r = await sharp(rPadded).extract({ left: 0, top: y, width: LANE_W, height: h }).png().toBuffer();
    const composite = await sharp({
      create: { width: LANE_W * 2 + 8, height: h, channels: 3, background: { r: 240, g: 240, b: 240 } },
    })
      .composite([
        { input: f, top: 0, left: 0 },
        { input: r, top: 0, left: LANE_W + 8 },
      ])
      .png()
      .toFile(path.join(dir, `diff-${String(i).padStart(2, "0")}.png`));
  }
  console.log(`${slug}: figma ${fInfo.width}x${fInfo.height} | real ${rInfo.width}x${rInfo.height} -> ${slices} slices`);
}
