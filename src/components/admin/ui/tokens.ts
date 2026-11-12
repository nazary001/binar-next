// The visual law of the admin panel: every component of the kit builds its
// classes from these constants, so the panel reads as one system and as a
// sibling of the site's B2B cabinet.
//
// What is borrowed from the cabinet (Figma "Platform"): Manrope, the ink
// #1d1d1f and the brand orange #f85a0b, the #f5f5f5 content slab with a
// large rounded top-left corner, white r24 cards without shadows, pill
// buttons, the dark #343435 table head, the r40 status pills and their
// tones, the one floating shadow of menus.
// What is the panel's own: a denser scale (14-px body, 40-px controls),
// a labelled side menu, hover rows in tables, visible keyboard focus.
//
// Rules for anything built on top:
// - colours come from the theme tokens (text-neutral-900, bg-brand,
//   border-stroke-subtle ...); a hex appears only where the cabinet itself
//   uses an off-token colour;
// - no shadows on cards; only floating layers (menus, popovers, toasts)
//   carry FLOAT_SHADOW; modals sit on a scrim instead;
// - radii: 24 cards and tables, 16 inner tiles and text areas, 12 icon
//   tiles and small chips, full pills for buttons, inputs and badges;
// - every interactive element shows FOCUS_RING on keyboard focus;
// - transitions animate colours for 200 ms; `translate` / `rotate` /
//   `scale` are transitioned by name (Tailwind v4 emits them as separate
//   properties), never `transform`;
// - breakpoints: `lg:` means 640 px in this project, so the panel uses
//   `min-[1024px]:` (side menu visible) and `xl:` / `2xl:` only.

// Keyboard focus, on white and on the grey slab alike.
export const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white";

// The same ring drawn inside the element (table rows, menu lines, inputs
// that already have a border).
export const FOCUS_RING_INSET = "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand";

// The only shadow: floating layers (the cabinet's menu shadow).
export const FLOAT_SHADOW = "shadow-[0px_2px_6px_0px_rgba(29,29,31,0.1)]";

// A deeper lift for layers that float over other floating layers
// (toasts, the command palette).
export const LIFT_SHADOW = "shadow-[0px_12px_32px_-8px_rgba(29,29,31,0.22)]";

// The scrim under modals and drawers (the cabinet's #343435 at 50 %).
export const SCRIM = "bg-[#343435]/50 backdrop-blur-[4px]";

// Motion.
export const EASE_OUT = "ease-[cubic-bezier(0.22,1,0.36,1)]";
export const COLOR_TRANSITION = "transition-colors duration-200";

// Type scale.
export const TEXT = {
  // Page title: one per screen. Pair it with `TEXT.pageTitleLight` for the
  // light run the cabinet's titles use ("Замовлення" bold + "усі" light).
  pageTitle: "text-[28px] font-bold leading-9 tracking-[-0.02em] text-neutral-900 min-[1024px]:text-[32px] min-[1024px]:leading-10",
  pageTitleLight: "font-light text-neutral-500",
  // A section inside a page.
  sectionTitle: "text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-neutral-900",
  // The title of a card or a modal block.
  cardTitle: "text-[16px] font-bold leading-[22px] tracking-[0.01em] text-neutral-900",
  body: "text-[14px] leading-5 text-neutral-900",
  bodyStrong: "text-[14px] font-semibold leading-5 text-neutral-900",
  muted: "text-[14px] leading-5 text-neutral-500",
  // Captions, hints, table head.
  caption: "text-[12px] font-medium leading-4 text-neutral-500",
  // A field label.
  label: "text-[13px] font-semibold leading-[18px] text-neutral-800",
  // Big figures (KPI tiles).
  figure: "text-[32px] font-bold leading-9 tracking-[-0.02em] tabular-nums",
  // Any number in a table or a total.
  numeric: "tabular-nums",
} as const;

// Surfaces.
export const SURFACE = {
  // The grey slab pages sit on.
  slab: "bg-bg-cabinet",
  // A white card on the slab.
  card: "rounded-3xl bg-white",
  cardPadding: "p-5 min-[1024px]:p-6",
  // A quieter tile inside a white card.
  inset: "rounded-2xl bg-bg-subtle",
  // The dark tile of key figures (the cabinet's KPI tile).
  dark: "rounded-3xl bg-neutral-900 text-white",
  // Floating layers: menus, popovers.
  float: "rounded-2xl bg-white " + FLOAT_SHADOW,
  divider: "border-stroke-subtle",
} as const;

// Heights of controls: buttons, inputs, selects share them so they line up
// in one row.
export const CONTROL = {
  sm: "h-8 text-[13px] leading-[18px]",
  md: "h-10 text-[14px] leading-5",
  lg: "h-12 text-[15px] leading-[22px]",
} as const;

export type ControlSize = keyof typeof CONTROL;

// A text field (input, select trigger): a pill with a hairline that turns
// brand on focus (the cabinet's field, one size down).
export const FIELD =
  "w-full rounded-[20px] border border-stroke-subtle bg-white px-4 text-neutral-900 placeholder:text-neutral-400 " +
  "transition-colors duration-200 hover:border-neutral-400 " +
  "focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand " +
  "disabled:cursor-not-allowed disabled:bg-bg-subtle disabled:text-neutral-400 " +
  "aria-invalid:border-negative aria-invalid:focus:ring-negative";

// Tones of status pills and highlights: the cabinet's nine tones
// (src/components/platform/ui/StatusPill.tsx STATUS_TONES) re-exported so
// admin components do not import cabinet files for colours.
export type Tone = "blue" | "orange" | "indigo" | "green" | "amber" | "mint" | "red" | "neutral" | "brand";

export const TONES: Record<Tone, { bg: string; text: string; dot: string }> = {
  blue: { bg: "#e8f7ff", text: "#0a6f9e", dot: "#0b8fc5" },
  orange: { bg: "#fff1eb", text: "#d94e0b", dot: "#f85a0b" },
  indigo: { bg: "#eef2ff", text: "#4569d4", dot: "#4f7de8" },
  green: { bg: "#e8f8f4", text: "#178d72", dot: "#27ae85" },
  amber: { bg: "#fff5dd", text: "#805300", dot: "#d89a00" },
  mint: { bg: "#eaf7ee", text: "#197a4d", dot: "#219653" },
  red: { bg: "#fff0f0", text: "#b33a3a", dot: "#d9534f" },
  neutral: { bg: "#e8e8e9", text: "#616162", dot: "#616162" },
  brand: { bg: "#f85a0b", text: "#ffffff", dot: "#ffffff" },
};

// Layers, lowest first. The site's own overlays use 50-60; the panel never
// shows them, so it has the range to itself.
export const Z = {
  sticky: "z-20",
  topbar: "z-30",
  sidebar: "z-40",
  dropdown: "z-50",
  drawer: "z-[60]",
  modal: "z-[70]",
  palette: "z-[80]",
  toast: "z-[90]",
} as const;
