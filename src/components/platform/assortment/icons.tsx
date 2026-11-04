// Inline glyphs of «Мій асортимент» exported 1:1 from Figma (section
// 4209:74148, assets under public/figma-export/assortment). They ride on
// currentColor; the rest of the page reuses the catalog / orders icons
// (checkbox, minus / plus, magnifier, chevrons, sort, info).

// «clear» — the 24-px remove glyph of the row Icon button (4376:61094).
export function RemoveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M17.4697 5.46973C17.7626 5.17683 18.2374 5.17683 18.5303 5.46973C18.8232 5.76262 18.8232 6.23738 18.5303 6.53027L13.0605 12L18.5303 17.4697C18.8232 17.7626 18.8232 18.2374 18.5303 18.5303C18.2374 18.8232 17.7626 18.8232 17.4697 18.5303L12 13.0605L6.53027 18.5303C6.23738 18.8232 5.76262 18.8232 5.46973 18.5303C5.17683 18.2374 5.17683 17.7626 5.46973 17.4697L10.9395 12L5.46973 6.53027C5.17683 6.23738 5.17683 5.76262 5.46973 5.46973C5.76262 5.17683 6.23738 5.17683 6.53027 5.46973L12 10.9395L17.4697 5.46973Z"
        fill="currentColor"
      />
    </svg>
  );
}

// «Trash» — the 24-px glyph of the selection bar's Icon button (4593:40555).
export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M18 21H6V8H18V21ZM20 7H4V5H9V3H15V5H20V7Z" fill="currentColor" />
    </svg>
  );
}

// Indeterminate head checkbox (1-9 of the page rows checked). Figma has
// no mixed glyph, so it is the catalog CheckboxOn square (3.75..20.25,
// r 2.25) with a 1.5-px bar cut out in place of the tick: the same brand
// fill as the checked state, so «some rows checked» never reads as the
// empty white square.
export function CheckboxMixedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 3.75C19.2426 3.75 20.25 4.75736 20.25 6V18C20.25 19.2426 19.2426 20.25 18 20.25H6C4.75736 20.25 3.75 19.2426 3.75 18V6C3.75 4.75736 4.75736 3.75 6 3.75H18ZM8.75 11.25C8.33579 11.25 8 11.5858 8 12C8 12.4142 8.33579 12.75 8.75 12.75H15.25C15.6642 12.75 16 12.4142 16 12C16 11.5858 15.6642 11.25 15.25 11.25H8.75Z"
        fill="currentColor"
      />
    </svg>
  );
}
