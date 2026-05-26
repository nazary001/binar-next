// Side-by-side composer at 1440 native — takes a Figma PNG and a rendered
// PNG (both intended to be section-height), stacks them horizontally with
// a hairline separator. Use for surgical pixel comparison.

import sharp from "sharp";
import path from "node:path";

const [a, b, out] = process.argv.slice(2);
if (!a || !b || !out) {
  console.error("usage: node sbs.mjs <figma.png> <rendered.png> <out.png>");
  process.exit(1);
}

const fM = await sharp(a).metadata();
const rM = await sharp(b).metadata();
const W = Math.min(fM.width, rM.width);
const H = Math.max(fM.height, rM.height);

const aBuf = await sharp(a).resize({ width: W }).extend({ bottom: Math.max(0, H - fM.height), background: { r: 240, g: 240, b: 240 } }).png().toBuffer();
const bBuf = await sharp(b).resize({ width: W }).extend({ bottom: Math.max(0, H - rM.height), background: { r: 240, g: 240, b: 240 } }).png().toBuffer();
const aHeight = (await sharp(aBuf).metadata()).height;
const bHeight = (await sharp(bBuf).metadata()).height;
const finalH = Math.max(aHeight, bHeight);

await sharp({ create: { width: W * 2 + 4, height: finalH, channels: 3, background: { r: 200, g: 200, b: 200 } } })
  .composite([
    { input: aBuf, top: 0, left: 0 },
    { input: bBuf, top: 0, left: W + 4 },
  ])
  .png()
  .toFile(path.resolve(out));

console.log(`wrote ${out} (${W * 2 + 4}x${finalH})`);
