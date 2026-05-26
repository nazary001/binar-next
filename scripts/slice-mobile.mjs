// Slice mobile/tablet full-page captures into 1500px-tall strips for review.
import sharp from "sharp";
import path from "node:path";
import { mkdir, readdir } from "node:fs/promises";

const SRC = path.resolve("audit/responsive");
const STRIP_H = 1500;

const files = (await readdir(SRC)).filter((f) => /(-mobile|-tablet)\.png$/.test(f));
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
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, `strip-${String(n).padStart(2, "0")}.png`));
    n++;
  }
  console.log(`${slug}: ${n} strips`);
}
