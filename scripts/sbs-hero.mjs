// Side-by-side compose of Figma hero photo vs rendered hero photo
import sharp from "sharp";
const f = await sharp("audit/fresh-section/home-hero-figma-photo.png").png().toBuffer();
const r = await sharp("audit/fresh-section/home-hero-photo-desktop.png").png().toBuffer();
await sharp({ create: { width: 603 * 2 + 4, height: 746, channels: 3, background: { r: 220, g: 220, b: 220 } } })
  .composite([
    { input: f, top: 0, left: 0 },
    { input: r, top: 0, left: 607 },
  ])
  .png()
  .toFile("audit/fresh-section/home-hero-sbs.png");
console.log("ok");
