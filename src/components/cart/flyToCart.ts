// Add-to-cart feedback (designer 2026-11-11: «не корзину відкривати, а
// дамо легку анімацію, що товар полетів в корзину»): adding a product no
// longer opens the cart; a 52-px round thumbnail of the product (the photo
// contained on the #d5d5d5 studio grey, like every product photo) starts
// centred on the pressed control and flies into the header cart, then the
// header disc bumps. No Figma frame draws the motion: 600 ms, linear on X
// and ease-in on Y (an arc that rises into the header), shrinking to 35 %
// and fading out over the last 15 %; the header disc then bumps (1.15,
// 300 ms).
//
// The target is the visible header cart button (`data-cart-target` on
// CartTrigger, Header.tsx; the desktop and the phone bar each render one,
// the hidden one has no boxes; the platform header uses the same
// trigger). Desktop pages are scaled with CSS `zoom` on <html>:
// getBoundingClientRect() answers in zoomed (screen) pixels while the
// flier's own left / top / translate are logical pixels the browser zooms
// again, so every rect is divided by the zoom (ItemsPopup.computePos).
// Reduced motion: no flight, no bump (the badge count still changes).
// Client only; callers run it from a click handler.

const SIZE = 52;
const DURATION = 600;
// ease-in on Y + linear X = the rising arc. A quadratic ease-in: a
// steeper (circular) one left a third of the climb for the last 30 ms,
// so the thumbnail seemed to jump into the cart.
const EASE_IN = "cubic-bezier(0.11, 0, 0.5, 0)";

function bump(target: Element) {
  target.querySelector<HTMLElement>("[data-cart-disc]")?.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.15)", offset: 0.4 }, { transform: "scale(1)" }],
    { duration: 300, easing: "ease-out" },
  );
}

export function flyToCart(from: Element | null | undefined, image?: string): void {
  if (typeof window === "undefined" || !from) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const target = [...document.querySelectorAll("[data-cart-target]")].find(
    (el) => el.getClientRects().length > 0,
  );
  if (!target) return;

  const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const startX = (a.left + a.width / 2) / zoom;
  const startY = (a.top + a.height / 2) / zoom;
  const dx = (b.left + b.width / 2) / zoom - startX;
  const dy = (b.top + b.height / 2) / zoom - startY;

  const outer = document.createElement("div");
  outer.setAttribute("data-cart-fly", "");
  outer.setAttribute("aria-hidden", "true");
  Object.assign(outer.style, {
    position: "fixed",
    left: `${startX - SIZE / 2}px`,
    top: `${startY - SIZE / 2}px`,
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    zIndex: "70",
    pointerEvents: "none",
  });
  const inner = document.createElement("div");
  Object.assign(inner.style, {
    width: "100%",
    height: "100%",
    borderRadius: "9999px",
    overflow: "hidden",
    background: image ? "var(--color-bg-product)" : "var(--color-brand)",
    boxShadow: "0 2px 6px rgba(29, 29, 31, 0.15)",
  });
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = "";
    Object.assign(img.style, { width: "100%", height: "100%", objectFit: "contain", display: "block" });
    inner.appendChild(img);
  }
  outer.appendChild(inner);
  document.body.appendChild(outer);

  let landed = false;
  const land = () => {
    if (landed) return;
    landed = true;
    outer.remove();
    bump(target);
  };
  outer.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }], {
    duration: DURATION,
    easing: "linear",
    fill: "forwards",
  });
  inner
    .animate(
      [
        { transform: "translateY(0) scale(1)", opacity: 1 },
        { opacity: 1, offset: 0.85 },
        { transform: `translateY(${dy}px) scale(0.35)`, opacity: 0 },
      ],
      { duration: DURATION, easing: EASE_IN, fill: "forwards" },
    )
    .finished.then(land, land);
  // Safety net for a throttled page (a background tab): the flier never
  // stays. Generous, because the add re-renders the page in the same task
  // and the first frame of the flight can come a few hundred ms late.
  window.setTimeout(land, DURATION * 2);
}
