// Pixel-diff two images and write an overlay PNG + a summary.
// Both inputs must be the same size; if not we resize the second to match.

import sharp from "sharp";
import path from "node:path";

const [a, b, out] = process.argv.slice(2);
if (!a || !b || !out) {
  console.error("usage: node diff-images.mjs <a.png> <b.png> <diff.png>");
  process.exit(1);
}

const A = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let B = sharp(b);
const Bmeta = await B.metadata();
if (Bmeta.width !== A.info.width || Bmeta.height !== A.info.height) {
  B = B.resize({ width: A.info.width, height: A.info.height, fit: "fill" });
}
const Bb = await B.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const len = A.info.width * A.info.height;
const diff = Buffer.alloc(len * 4);
let mismatched = 0;
let sumDelta = 0;
const THRESHOLD = 18; // per-channel difference to flag a pixel

for (let i = 0; i < len; i++) {
  const o = i * 4;
  const dr = Math.abs(A.data[o] - Bb.data[o]);
  const dg = Math.abs(A.data[o + 1] - Bb.data[o + 1]);
  const db = Math.abs(A.data[o + 2] - Bb.data[o + 2]);
  const d = Math.max(dr, dg, db);
  if (d > THRESHOLD) {
    mismatched++;
    diff[o] = 255; diff[o + 1] = 0; diff[o + 2] = 0; diff[o + 3] = 230;
  } else {
    // Faded grayscale of A for context.
    const g = Math.round((A.data[o] + A.data[o + 1] + A.data[o + 2]) / 3);
    diff[o] = g; diff[o + 1] = g; diff[o + 2] = g; diff[o + 3] = 120;
  }
  sumDelta += d;
}

await sharp(diff, { raw: { width: A.info.width, height: A.info.height, channels: 4 } })
  .png()
  .toFile(path.resolve(out));

const pct = ((mismatched / len) * 100).toFixed(2);
console.log(`size ${A.info.width}x${A.info.height}, ${mismatched}/${len} (${pct}%) pixels differ > ${THRESHOLD}, avg delta=${(sumDelta / len).toFixed(2)}`);
