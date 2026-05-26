// Slice each audit/sbs/*.png into 2000px-tall strips for visual review.
// Output: audit/sbs/<page>/strip-NN.png

import sharp from "sharp";
import path from "node:path";
import { mkdir, readdir } from "node:fs/promises";

const SRC = path.resolve("audit/sbs");
const STRIP_H = 2000;

const files = (await readdir(SRC)).filter((f) => f.endsWith(".png"));
for (const f of files) {
  const slug = path.basename(f, ".png");
  const srcPath = path.join(SRC, f);
  const meta = await sharp(srcPath).metadata();
  const outDir = path.join(SRC, slug);
  await mkdir(outDir, { recursive: true });
  let n = 0;
  for (let y = 0; y < meta.height; y += STRIP_H) {
    const h = Math.min(STRIP_H, meta.height - y);
    await sharp(srcPath)
      .extract({ left: 0, top: y, width: meta.width, height: h })
      .resize({ width: 1600 })
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, `strip-${String(n).padStart(2, "0")}.png`));
    n++;
  }
  console.log(`${slug}: ${n} strips`);
}
