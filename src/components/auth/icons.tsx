// Inline icon SVGs of the account screens, exported 1:1 from the Figma
// «Реєстрація» section (4573:36735). All ride on currentColor.

// «PersonFilled» — the placeholder glyph of the company avatar in the
// welcome modal (4573:35600, a 106-px box inside the 144.65-px square).
export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 106.076 106.076" fill="none" aria-hidden className={className}>
      <path
        d="M53.0378 53.0378C62.8056 53.0378 70.717 45.1263 70.717 35.3585C70.717 25.5907 62.8056 17.6793 53.0378 17.6793C43.27 17.6793 35.3585 25.5907 35.3585 35.3585C35.3585 45.1263 43.27 53.0378 53.0378 53.0378ZM53.0378 61.8774C41.2369 61.8774 17.6793 67.7999 17.6793 79.5566V88.3963H88.3963V79.5566C88.3963 67.7999 64.8387 61.8774 53.0378 61.8774Z"
        fill="currentColor"
      />
    </svg>
  );
}

// «Dot» — the 8-px separator between «Надіслати код ще раз» and the
// countdown (4573:35494): a 2-px-radius #626770 disc.
export function DotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" fill="none" aria-hidden className={className}>
      <circle cx="4" cy="4" r="2" fill="currentColor" />
    </svg>
  );
}
