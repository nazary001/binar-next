// Split SBS composites into 800-px tall bands, resized to 1600 wide so
// they fit the Read tool's image size limit (max 2000 px dimension).
import sharp from "sharp";
import path from "node:path";
import { mkdir, readdir } from "node:fs/promises";

const SRC = path.resolve("audit/sbs");
const BAND_H = 800;
const DISPLAY_W = 1600;

const files = (await readdir(SRC)).filter((f) => f.endsWith(".png"));
for (const f of files) {
  const slug = path.basename(f, ".png");
  const srcPath = path.join(SRC, f);
  const meta = await sharp(srcPath).metadata();
  const outDir = path.join(SRC, slug, "pixel");
  await mkdir(outDir, { recursive: true });
  let n = 0;
  for (let y = 0; y < meta.height; y += BAND_H) {
    const h = Math.min(BAND_H, meta.height - y);
    await sharp(srcPath)
      .extract({ left: 0, top: y, width: meta.width, height: h })
      .resize({ width: DISPLAY_W })
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, `band-${String(n).padStart(2, "0")}.png`));
    n++;
  }
  console.log(`${slug}: ${n} bands`);
}
