// Inline icon SVGs for the catalog page, exported 1:1 from the Figma
// masters (flattened via exportAsync so the curves are exact). All use
// `fill="currentColor"` so each glyph follows its button's text colour
// through hover/disabled state swaps.

export { ArrowBack } from "../blog/icons";

// heroicons-outline/magnifying-glass — 24-px box (Search field, 3677:40516).
export function MagnifierIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M17.25 10.5C17.25 6.77208 14.2279 3.75 10.5 3.75C6.77208 3.75 3.75 6.77208 3.75 10.5C3.75 14.2279 6.77208 17.25 10.5 17.25C12.3642 17.25 14.0501 16.4948 15.2725 15.2725C16.4948 14.0501 17.25 12.3642 17.25 10.5ZM18.75 10.5C18.75 12.5078 18.0304 14.3476 16.8384 15.7778L21.5303 20.4697C21.8232 20.7626 21.8232 21.2374 21.5303 21.5303C21.2374 21.8232 20.7626 21.8232 20.4697 21.5303L15.7778 16.8384C14.3476 18.0304 12.5078 18.75 10.5 18.75C5.94365 18.75 2.25 15.0563 2.25 10.5C2.25 5.94365 5.94365 2.25 10.5 2.25C15.0563 2.25 18.75 5.94365 18.75 10.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

// "Card view" grid glyph — 24-px box (view toggle, 230:897).
export function CardViewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M11 21H3V13H11V21Z" fill="currentColor" />
      <path d="M21 21H13V13H21V21Z" fill="currentColor" />
      <path d="M11 11H3V3H11V11Z" fill="currentColor" />
      <path d="M21 11H13V3H21V11Z" fill="currentColor" />
    </svg>
  );
}

// "List view" rows glyph — 24-px box (view toggle, 3578:15616).
export function ListViewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M4 18.75C4 18.8881 3.88807 19 3.75 19H2.25C2.11193 19 2 18.8881 2 18.75V17.25C2 17.1119 2.11193 17 2.25 17H3.75C3.88807 17 4 17.1119 4 17.25V18.75Z"
        fill="currentColor"
      />
      <path
        d="M22 18.75C22 18.8881 21.8881 19 21.75 19H6.25C6.11193 19 6 18.8881 6 18.75V17.25C6 17.1119 6.11193 17 6.25 17H21.75C21.8881 17 22 17.1119 22 17.25V18.75Z"
        fill="currentColor"
      />
      <path
        d="M4 12.75C4 12.8881 3.88807 13 3.75 13H2.25C2.11193 13 2 12.8881 2 12.75V11.25C2 11.1119 2.11193 11 2.25 11H3.75C3.88807 11 4 11.1119 4 11.25V12.75Z"
        fill="currentColor"
      />
      <path
        d="M22 12.75C22 12.8881 21.8881 13 21.75 13H6.25C6.11193 13 6 12.8881 6 12.75V11.25C6 11.1119 6.11193 11 6.25 11H21.75C21.8881 11 22 11.1119 22 11.25V12.75Z"
        fill="currentColor"
      />
      <path
        d="M4 6.75C4 6.88807 3.88807 7 3.75 7H2.25C2.11193 7 2 6.88807 2 6.75V5.25C2 5.11193 2.11193 5 2.25 5H3.75C3.88807 5 4 5.11193 4 5.25V6.75Z"
        fill="currentColor"
      />
      <path
        d="M22 6.75C22 6.88807 21.8881 7 21.75 7H6.25C6.11193 7 6 6.88807 6 6.75V5.25C6 5.11193 6.11193 5 6.25 5H21.75C21.8881 5 22 5.11193 22 5.25V6.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

// "Filter" sliders glyph — 24-px box (3677:39698).
export function FilterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M18.3889 14C18.5423 14 18.6667 14.1119 18.6667 14.25V16H21.7222C21.8756 16 22 16.1119 22 16.25V17.75C22 17.8881 21.8756 18 21.7222 18H18.6667V19.75C18.6667 19.8881 18.5423 20 18.3889 20H13.3889C13.2355 20 13.1111 19.8881 13.1111 19.75V18H2.27778C2.12437 18 2 17.8881 2 17.75V16.25C2 16.1119 2.12437 16 2.27778 16H13.1111V14.25C13.1111 14.1119 13.2355 14 13.3889 14H18.3889Z"
        fill="currentColor"
      />
      <path
        d="M10.6111 4C10.7645 4 10.8889 4.11193 10.8889 4.25V6H21.7222C21.8756 6 22 6.11193 22 6.25V7.75C22 7.88807 21.8756 8 21.7222 8H10.8889V9.75C10.8889 9.88807 10.7645 10 10.6111 10H5.61111C5.4577 10 5.33333 9.88807 5.33333 9.75V8H2.27778C2.12437 8 2 7.88807 2 7.75V6.25C2 6.11193 2.12437 6 2.27778 6H5.33333V4.25C5.33333 4.11193 5.4577 4 5.61111 4H10.6111Z"
        fill="currentColor"
      />
    </svg>
  );
}

// heroicons-outline/chevron-left — 24-px box (pagination, 3225:10999).
// Pass `mirrored` for the right-pointing twin.
export function ChevronSideIcon({
  className,
  mirrored,
}: {
  className?: string;
  mirrored?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`${mirrored ? "-scale-x-100 " : ""}${className ?? ""}`}
    >
      <path
        d="M6.12348 11.5869C5.93123 11.878 5.96386 12.2739 6.22016 12.5302L13.7202 20.0302C14.0131 20.3231 14.4878 20.3231 14.7807 20.0302C15.0736 19.7373 15.0736 19.2626 14.7807 18.9697L7.81098 11.9999L14.7807 5.03022C15.0736 4.73732 15.0736 4.26256 14.7807 3.96967C14.4878 3.67678 14.0131 3.67678 13.7202 3.96967L6.22016 11.4697L6.12348 11.5869Z"
        fill="currentColor"
      />
    </svg>
  );
}

// "cart bold" — 24-px box (B2C product card / header cart, 3426:33718).
export function CartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M18.771 20.2309C18.771 21.2792 17.9213 22.1289 16.873 22.1289C15.8248 22.1289 14.9751 21.2792 14.9751 20.2309C14.9751 19.1827 15.8248 18.333 16.873 18.333C17.9213 18.333 18.771 19.1827 18.771 20.2309Z"
        fill="currentColor"
      />
      <path
        d="M9.81689 20.2309C9.81689 21.2792 8.96715 22.1289 7.91895 22.1289C6.87074 22.1289 6.021 21.2792 6.021 20.2309C6.021 19.1827 6.87074 18.333 7.91895 18.333C8.96715 18.333 9.81689 19.1827 9.81689 20.2309Z"
        fill="currentColor"
      />
      <path
        d="M7.53955 5.00525C7.53955 5.14332 7.65148 5.25525 7.78955 5.25525H18.521C18.6591 5.25525 18.771 5.36718 18.771 5.50525V14.1156C18.771 14.2537 18.6591 14.3656 18.521 14.3656H7.78955C7.65148 14.3656 7.53955 14.4775 7.53955 14.6156V15.4896C7.53955 15.6277 7.65148 15.7396 7.78955 15.7396H18.521C18.6591 15.7396 18.771 15.8516 18.771 15.9896V17.0082C18.771 17.1462 18.6591 17.2582 18.521 17.2582H6.271C6.13293 17.2582 6.021 17.1462 6.021 17.0082V3.86853C6.021 3.73046 5.90907 3.61853 5.771 3.61853H1.79443C1.65636 3.61853 1.54443 3.5066 1.54443 3.36853V2.34998C1.54443 2.2119 1.65636 2.09998 1.79443 2.09998H7.28955C7.42762 2.09998 7.53955 2.2119 7.53955 2.34998V5.00525Z"
        fill="currentColor"
      />
    </svg>
  );
}

// heroicons-outline/information-circle — 16-px box (3452:11678).
// Single path exactly as exported: ring (outer+inner circles with
// opposite winding) + the "i" stem and dot.
export function InfoCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M13.5 8C13.5 4.96243 11.0376 2.5 8 2.5C4.96243 2.5 2.5 4.96243 2.5 8C2.5 11.0376 4.96243 13.5 8 13.5C11.0376 13.5 13.5 11.0376 13.5 8ZM7.30371 7.03906C8.06781 6.65701 8.92871 7.34702 8.72168 8.17578L8.24902 10.0664L8.27637 10.0527C8.52335 9.92924 8.82377 10.0294 8.94727 10.2764C9.07076 10.5234 8.97062 10.8238 8.72363 10.9473L8.69629 10.9609C7.93219 11.343 7.07129 10.653 7.27832 9.82422L7.75098 7.93359L7.72363 7.94727C7.47664 8.07076 7.17623 7.97062 7.05273 7.72363C6.92924 7.47664 7.02938 7.17623 7.27637 7.05273L7.30371 7.03906ZM8.00488 5C8.28103 5 8.50488 5.22386 8.50488 5.5V5.50488C8.50488 5.78102 8.28103 6.00488 8.00488 6.00488H8C7.72386 6.00488 7.5 5.78102 7.5 5.50488V5.5C7.5 5.22386 7.72386 5 8 5H8.00488ZM14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8C1.5 4.41015 4.41015 1.5 8 1.5C11.5899 1.5 14.5 4.41015 14.5 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

// heroicons-outline/minus — 16-px box (2768:4721).
export function MinusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M12.6664 7.5C12.9425 7.5 13.1664 7.72386 13.1664 8C13.1664 8.27614 12.9425 8.5 12.6664 8.5H3.33334C3.0572 8.5 2.83334 8.27614 2.83334 8C2.83334 7.72386 3.0572 7.5 3.33334 7.5H12.6664Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Plus — 16-px box (2538:3986).
export function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M8 1.5C8.27614 1.5 8.5 1.72386 8.5 2V7.25488H13.7549C14.031 7.25488 14.2548 7.4788 14.2549 7.75488C14.2549 8.03103 14.031 8.25488 13.7549 8.25488H8.5V13.5C8.5 13.7761 8.27614 14 8 14C7.72386 14 7.5 13.7761 7.5 13.5V8.25488H2.25488C1.9788 8.25482 1.75488 8.03098 1.75488 7.75488C1.75495 7.47884 1.97884 7.25495 2.25488 7.25488H7.5V2C7.5 1.72386 7.72386 1.5 8 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Checkbox states — 24-px boxes exported from the Figma «Checkbox»
// set (2768:10367/10370): outlined rounded square when off, solid
// brand square with a white tick when on. Colour rides on
// currentColor so the off state follows the row's text colour.
export function CheckboxOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M19.5 6C19.5 5.17157 18.8284 4.5 18 4.5H6C5.17157 4.5 4.5 5.17157 4.5 6V18C4.5 18.8284 5.17157 19.5 6 19.5H18C18.8284 19.5 19.5 18.8284 19.5 18V6ZM21 18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V6C3 4.34315 4.34315 3 6 3H18C19.6569 3 21 4.34315 21 6V18Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CheckboxOnIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M18 3.75C19.2426 3.75 20.25 4.75736 20.25 6V18C20.25 19.2426 19.2426 20.25 18 20.25H6C4.75736 20.25 3.75 19.2426 3.75 18V6C3.75 4.75736 4.75736 3.75 6 3.75H18ZM15.6494 8.9248C15.3124 8.68408 14.8423 8.76169 14.6016 9.09863L11.3662 13.6279L9.74316 12.0049C9.45031 11.7121 8.9755 11.7121 8.68262 12.0049C8.38975 12.2978 8.3898 12.7725 8.68262 13.0654L10.9326 15.3154C11.0884 15.4712 11.3048 15.5503 11.5244 15.5322C11.744 15.514 11.9451 15.4009 12.0732 15.2217L15.8232 9.97168C16.0639 9.63472 15.9862 9.16563 15.6494 8.9248Z"
        fill="currentColor"
      />
    </svg>
  );
}

// heroicons-outline/x-mark — 16-px box (559:4027), the close glyph on
// applied-filter chips and the «Скинути фільтрацію» text button.
export function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M11.6464 3.64645C11.8417 3.45118 12.1582 3.45118 12.3535 3.64645C12.5487 3.84171 12.5487 4.15822 12.3535 4.35348L8.70699 7.99996L12.3535 11.6464C12.5487 11.8417 12.5487 12.1582 12.3535 12.3535C12.1582 12.5487 11.8417 12.5487 11.6464 12.3535L7.99996 8.70699L4.35348 12.3535C4.15822 12.5487 3.84171 12.5487 3.64645 12.3535C3.45118 12.1582 3.45118 11.8417 3.64645 11.6464L7.29293 7.99996L3.64645 4.35348C3.45118 4.15822 3.45118 3.84171 3.64645 3.64645C3.84171 3.45118 4.15822 3.45118 4.35348 3.64645L7.99996 7.29293L11.6464 3.64645Z"
        fill="currentColor"
      />
    </svg>
  );
}

// heroicons-outline/chevron in a 16-px box — the exact glyph the header
// «Каталог» trigger uses (616:3451), pointing DOWN here (the export is
// the chevron-up orientation, so the path is pre-rotated via transform).
export function ChevronDown16({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M7.72463 5.08224C7.91871 4.95407 8.18268 4.97583 8.35354 5.14669L13.3535 10.1467C13.5488 10.342 13.5488 10.6585 13.3535 10.8537C13.1583 11.049 12.8418 11.049 12.6465 10.8537L8.00002 6.20724L3.35354 10.8537C3.15828 11.049 2.84177 11.049 2.64651 10.8537C2.45125 10.6585 2.45125 10.342 2.64651 10.1467L7.64651 5.14669L7.72463 5.08224Z"
        fill="currentColor"
        transform="rotate(180 8 8)"
      />
    </svg>
  );
}
