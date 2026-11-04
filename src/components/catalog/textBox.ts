import type { CSSProperties } from "react";

// Figma sizes every hug-width text box (and every Text / Back button
// instance that hugs one) to a whole pixel, rounded up: «Каталог» 63,
// «Усе для готелів» 119, «/» 8, Back button «Головна» 130. Chrome lays
// the same Manrope runs out 0.1-0.8 px narrower, and in a row of items
// with fixed gaps the shortfall adds up (the «Категорія» crumbs ended
// 3 px left of the Figma 512, the right-aligned sort row started 1.3 px
// right of 1065). calc-size() rounds the box up the same way Figma does;
// a browser without calc-size() drops the declaration and keeps the
// natural width.
export const FIGMA_TEXT_BOX: CSSProperties = {
  width: "calc-size(fit-content, round(up, size, 1px))",
};
