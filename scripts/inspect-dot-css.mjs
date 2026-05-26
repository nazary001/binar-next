import { chromium } from "playwright";

const URL = "http://localhost:3000/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: "networkidle" });

const info = await page.evaluate(() => {
  const ring = document.querySelector(".dot-pulse-ring");
  const inner = document.querySelector(".dot-pulse-inner");
  if (!ring || !inner) return { error: "ring or inner not found" };
  const ringCS = getComputedStyle(ring);
  const innerCS = getComputedStyle(inner);
  return {
    ring: {
      animationName: ringCS.animationName,
      animationDuration: ringCS.animationDuration,
      animationDelay: ringCS.animationDelay,
      backgroundColor: ringCS.backgroundColor,
      boxShadow: ringCS.boxShadow,
      width: ringCS.width,
      height: ringCS.height,
      opacity: ringCS.opacity,
      transform: ringCS.transform,
    },
    inner: {
      animationName: innerCS.animationName,
      animationDuration: innerCS.animationDuration,
      animationDelay: innerCS.animationDelay,
      transform: innerCS.transform,
    },
    keyframes: {
      "dot-halo-exists": !!Array.from(document.styleSheets)
        .flatMap((s) => {
          try {
            return Array.from(s.cssRules || []);
          } catch {
            return [];
          }
        })
        .find((r) => r.type === 7 && r.name === "dot-halo"),
      "dot-breathe-exists": !!Array.from(document.styleSheets)
        .flatMap((s) => {
          try {
            return Array.from(s.cssRules || []);
          } catch {
            return [];
          }
        })
        .find((r) => r.type === 7 && r.name === "dot-breathe"),
    },
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
