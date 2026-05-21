import sharp from "sharp";
import { readdir, mkdir, copyFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const ROOT = "public/figma-export";
const BACKUP = "public/figma-export/_originals";
const MIN_BYTES = 500 * 1024;

// Per-file caps: max output width on the long edge. Small UI elements
// (hero popups, product thumbnails in cards) are displayed at fixed pixel
// boxes well below 800 px, so cap them tighter. Hero/case backdrops are
// rendered up to ~1500 px on wide displays, so 1800 leaves a Retina margin.
const DEFAULT_MAX_W = 1800;
const TIGHT_PATTERNS = [
  { test: /\/hero\/popup-/, max: 600 },
  { test: /\/hotels\/solutions\//, max: 1100 },
  { test: /\/protect\/cat-/, max: 1100 },
  { test: /\/team\//, max: 1100 },
];

function maxWidthFor(rel) {
  for (const p of TIGHT_PATTERNS) if (p.test.test(rel)) return p.max;
  return DEFAULT_MAX_W;
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full.includes("_originals")) continue;
      out.push(...(await walk(full)));
    } else if (/\.png$/i.test(entry.name)) {
      const s = await stat(full);
      if (s.size >= MIN_BYTES) out.push({ full, size: s.size });
    }
  }
  return out;
}

const files = (await walk(ROOT)).sort((a, b) => b.size - a.size);
let totalBefore = 0;
let totalAfter = 0;

for (const { full, size } of files) {
  const rel = relative(ROOT, full).replaceAll("\\", "/");
  const backupPath = join(BACKUP, rel);

  if (!existsSync(backupPath)) {
    await mkdir(dirname(backupPath), { recursive: true });
    await copyFile(full, backupPath);
  }

  const maxW = maxWidthFor("/" + rel);
  const inputBuf = await sharp(backupPath).toBuffer();
  const meta = await sharp(inputBuf).metadata();
  const resizeW = meta.width && meta.width > maxW ? maxW : undefined;

  const outBuf = await sharp(inputBuf)
    .resize({
      width: resizeW,
      withoutEnlargement: true,
      fit: "inside",
    })
    .png({
      palette: true,
      quality: 80,
      effort: 10,
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toBuffer();

  // Only overwrite if smaller. Some already-small palette images can grow
  // when re-encoded; skip those.
  if (outBuf.length < size) {
    await sharp(outBuf).toFile(full);
    totalBefore += size;
    totalAfter += outBuf.length;
    const pct = ((1 - outBuf.length / size) * 100).toFixed(0);
    console.log(
      `${rel}: ${(size / 1024 / 1024).toFixed(2)}MB -> ${(
        outBuf.length /
        1024 /
        1024
      ).toFixed(2)}MB  (-${pct}%)`,
    );
  } else {
    console.log(`${rel}: skipped (would grow)`);
  }
}

console.log(
  `\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)}MB -> ${(
    totalAfter /
    1024 /
    1024
  ).toFixed(1)}MB  (-${(
    (1 - totalAfter / totalBefore) *
    100
  ).toFixed(0)}%)`,
);
