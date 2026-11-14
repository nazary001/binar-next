/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const ARROW_SRC = "/figma-export/hero/arrow-up-right.svg";

type ButtonStyle = {
  // "responsive" renders the compact (small) button below lg and the
  // large button at lg+ in a single instance — used where Figma's mobile
  // master shows the small CTA but desktop keeps the large one.
  // "xsmall" is the 38-px Button/Small of the B2B dashboard (5052:32306
  // «Написати менеджеру»): px-24 py-8, Manrope Medium 14/22.
  // "largeFixed" is Button/Large at every width, phones included (the
  // phone menu CTA 3117:14325, designer 2026-11-14: «Кнопка завузька»).
  size?: "large" | "small" | "responsive" | "xsmall" | "largeFixed";
  // "outlinedDark" is the Figma Button/Large «Outlined» on a white
  // surface (3865:19962 - the PDP «Купити зараз»): 1-px #343435 stroke,
  // dark label; hover inverts to the solid black pill.
  // "accent" is the brand-orange Button/Large (228:942 accent fill) the
  // cart drawer and stock modal use for «Оформити замовлення».
  variant?: "solid" | "outlined" | "outlinedDark" | "accent" | "light";
  // The trailing orange square with the up-right arrow. The plus / minus
  // squares of the «Показати більше» / «Приховати» buttons are gone: the
  // designer asked for the bare pill everywhere (2026-11-11, C13).
  arrow?: boolean;
  // Stretch the pill to the wrapper's full width (cart / modal CTAs).
  fullWidth?: boolean;
  // How a disabled <button> looks. "fade" (default) dims the whole
  // button to 50 %; "solid" is the Figma Button/Large disabled state of
  // the cabinet modals (4868:31335 / 4868:31495: Button/Disabled #e8e8e9
  // fill, Text/Disabled #a5a5a5 label, no hover).
  disabledStyle?: "fade" | "solid";
  className?: string;
  children: ReactNode;
};

type ButtonAsLink = ButtonStyle & {
  href: string;
} & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    keyof ButtonStyle | "href"
  >;

type ButtonAsButton = ButtonStyle & {
  href?: undefined;
} & Omit<ComponentPropsWithoutRef<"button">, keyof ButtonStyle>;

export type ButtonProps = ButtonAsLink | ButtonAsButton;

// Sizes shrink slightly on mobile so long Ukrainian labels (e.g.
// "Домовитись про зустріч" = 22 chars) fit the narrow column without
// wrapping. Desktop matches Figma exactly:
//   Small  → px-24 py-10  rounded-24  Manrope Medium  16/22  weight 500
//   Large  → px-24 py-15  rounded-25  Manrope SemiBold 18/22 weight 600
// The Figma hover state is an INVERSE: solid swaps to outlined (border
// appears, bg disappears, text flips dark). Keeping a 1-px transparent
// border on the default state means the hover border addition does not
// shift layout by 1 px when the user mouses over.
// The 1-px hover-stability border is part of the box (Figma draws its
// stroke INSIDE the box, CSS adds it outside the padding), so every
// pill pads one px less than the master on ALL four sides to hit
// Figma's exact outer box: small py-[9px] (9 + 22 + 9 + 2 border = 42 -
// py-[10px] rendered 44 px), large py-[14px] (14 + 22 + 14 + 2 = 52 -
// py-[15px] rendered 54 px, which pushed e.g. the 484-px blog hero to
// 486), and px-[23px] on every size (23 + 1 border = the master's 24,
// so a hug-width label is text + 48 like Figma, not text + 50).
// The border COLOUR lives on each variant (transparent for the filled
// ones) — putting `border-transparent` here as well made two utilities
// compete for the same property, and Tailwind's sort order let it beat
// the outlined variants' stroke.
const labelSize = {
  // Below 640 the "large" pill is the Figma mobile Button/Small (42 tall,
  // Manrope Medium 16/22 - hero 3082:3250); from 640 the sm: values are the
  // Figma Button/Large. The landing renders no size="large" Button below
  // 640 (all are max-lg:/max-sm:hidden there), so the phone half only
  // reaches the shop / cabinet phone layouts. The phone menu CTA is
  // Button/Large on phones too (3117:14325), so it uses "largeFixed".
  large:
    "rounded-[24px] border px-[23px] py-[9px] text-button-md whitespace-nowrap sm:rounded-[25px] sm:px-[23px] sm:py-[14px] sm:text-button-lg",
  small:
    "rounded-[24px] border px-[23px] py-[9px] text-button-md whitespace-nowrap",
  // Small below lg, large at lg (the lg overrides equal the `large`
  // value resolved at >=1024, so desktop is identical to size="large").
  responsive:
    "rounded-[24px] border px-[23px] py-[9px] text-button-md whitespace-nowrap lg:rounded-[25px] lg:py-[14px] lg:text-button-lg",
  // 7 + 22 + 7 + 2 border = 38 (Figma py-8 without a stroke).
  xsmall:
    "rounded-[24px] border px-[23px] py-[7px] text-[14px] font-medium leading-[22px] whitespace-nowrap",
  // Button/Large at every width: 14 + 22 + 14 + 2 border = 52, SemiBold
  // 18/22, tracking 1 % (0.18 px). Explicit values, because the
  // `text-button-lg` token is remapped to 16/22 on phones (globals.css).
  largeFixed:
    "rounded-[25px] border px-[23px] py-[14px] text-[18px] font-semibold leading-[22px] tracking-[0.18px] whitespace-nowrap",
};

const arrowWrap = {
  large: "size-[42px] rounded-[21px] sm:size-[52px] sm:rounded-[26px]",
  // Figma mobile compact button (e.g. 3082:3250): 42px arrow square.
  small: "size-[42px] rounded-[21px]",
  responsive: "size-[42px] rounded-[21px] lg:size-[52px] lg:rounded-[26px]",
  xsmall: "size-[38px] rounded-[19px]",
  largeFixed: "size-[52px] rounded-[26px]",
};

// Figma `heroicons-outline/arrow-up-right` lives inside a 24-px (large)
// / 16-px (small) container with an inset of 15.625 % around the SVG.
// The visual arrow is therefore ~16.5 px on large and ~11 px on small —
// noticeably smaller than my old `size-6` / `size-4` which let the path
// fill the full container. We size the img to that visual measurement
// (Tailwind arbitrary px values) so the rendered arrow matches Figma.
const arrowIcon = {
  large: "size-[11px] sm:size-[16.5px]",
  // Figma Button/Small (e.g. 3082:3250) puts the arrow in a 16-px icon
  // box whose asset has ~31% built-in padding — the visible glyph is
  // ~11 px. Our SVG is edge-to-edge, so size the img to the visible ink.
  small: "size-[11px]",
  responsive: "size-[11px] lg:size-[16.5px]",
  xsmall: "size-[11px]",
  largeFixed: "size-[16.5px]",
};

// All transitions are colour-only — no slide, no rotate, no scale on
// the arrow. Figma defines hover as bg/text/border inversion only.
// `solid` hover: black pill inverts to a SOLID-WHITE pill with a black
// outline and black text. Using bg-white (not bg-transparent) means
// the hover state shows pure white regardless of what's behind the
// button, which matches Figma's hover variant and reads cleanly on
// any section background.
// `accent` hover is the opposite: Figma 4593:59578 (State=Hover,
// Color=Accent) has NO fill, only the 1-px #f85a0b stroke and a #f85a0b
// label, so the surface shows through (white in the modals and the empty
// cart, #1d1d1f in the cart / order / checkout summaries). The white fill
// it used to paint was dropped at the designer's request (2026-11-13:
// «Тут ховер стан кнопки неправильний»), at every size.
//
// Hover triggers on TWO visible elements (the pill itself AND the
// orange arrow circle), but NOT on the 8 px gap between them or any
// invisible area of the link wrapper:
//   • `hover:…` rules fire when the cursor sits on the pill directly.
//   • `peer-hover:…` rules fire when the arrow (which is rendered with
//     `peer` BEFORE the pill in DOM order and brought back to its
//     visual right-of-pill position with `order-2`) is hovered, since
//     the peer-hover Tailwind variant follows the CSS `~` sibling
//     combinator (which only sees prior peers).
// Earlier `group-hover:` on the wrapper let the pill flip colour when
// the cursor was in the gap, which the user flagged ("когда наводишь
// мимо стрелочки").
const labelVariant = {
  solid:
    "border-transparent bg-neutral-900 text-white transition-colors duration-300 hover:bg-white hover:border-neutral-900 hover:text-neutral-900 peer-hover:bg-white peer-hover:border-neutral-900 peer-hover:text-neutral-900",
  outlined:
    "bg-transparent border-white text-white transition-colors duration-300 hover:bg-white hover:text-neutral-900 peer-hover:bg-white peer-hover:text-neutral-900",
  outlinedDark:
    "bg-transparent border-neutral-800 text-neutral-900 transition-colors duration-300 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white peer-hover:border-neutral-900 peer-hover:bg-neutral-900 peer-hover:text-white",
  accent:
    "border-transparent bg-brand text-white transition-colors duration-300 hover:border-brand hover:bg-transparent hover:text-brand peer-hover:border-brand peer-hover:bg-transparent peer-hover:text-brand",
  light:
    "border-transparent bg-bg-subtle text-neutral-900 transition-colors duration-300 hover:bg-white peer-hover:bg-white",
};

const mutedLabel = "border-transparent bg-button-disabled text-neutral-300";

function ButtonInner({
  size,
  variant,
  arrow,
  fullWidth,
  muted = false,
  children,
}: Required<Pick<ButtonStyle, "size" | "variant" | "arrow" | "fullWidth">> & {
  muted?: boolean;
  children: ReactNode;
}) {
  // DOM order is arrow → pill so the pill can pick up the arrow's
  // hover state via Tailwind's `peer-hover:` (the `~` CSS sibling
  // combinator only looks at PRIOR peers, so the peer has to come
  // first in markup). Visual order is restored with `order-1` on the
  // pill / `order-2` on the arrow inside the flex wrapper.
  // `cursor-pointer` lives on the two visible elements (pill + arrow
  // circle) so the pointer ONLY shows on those shapes — the 8-px gap
  // between them keeps the wrapper's `cursor-default`.
  return (
    <>
      {arrow && (
        <span
          className={`peer order-2 inline-flex cursor-pointer items-center justify-center bg-brand ${arrowWrap[size]}`}
        >
          <img
            src={ARROW_SRC}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className={arrowIcon[size]}
          />
        </span>
      )}
      <span
        className={`order-1 inline-flex ${muted ? "cursor-not-allowed" : "cursor-pointer"} items-center justify-center ${fullWidth ? "flex-1 " : ""}${labelSize[size]} ${muted ? mutedLabel : labelVariant[variant]}`}
      >
        {children}
      </span>
    </>
  );
}

// Wrapper holds the disabled-state affordances + the flex layout.
// `cursor-default` (not pointer) so the 8-px gap between the pill and
// the arrow circle reads as inert empty space — the two visible
// children each set `cursor-pointer` on themselves so the pointer
// shows up only when the cursor sits on the actual interactive
// shapes. `gap-2` keeps the 8-px space; the link is still navigable
// across the whole wrapper area, the cursor change is purely visual.
// A full-width button is a flex item that may shrink (two of them share
// a row in the stock modal); the inline one keeps its intrinsic width.
const wrapperClass = (className?: string, fullWidth?: boolean, muted?: boolean) =>
  `${fullWidth ? "flex w-full min-w-0 flex-1" : "inline-flex shrink-0"} cursor-default items-center gap-2 disabled:cursor-not-allowed ${muted ? "" : "disabled:opacity-50 "}${className ?? ""}`.trim();

export function Button(props: ButtonProps) {
  const size = props.size ?? "large";
  const variant = props.variant ?? "solid";
  const arrow = props.arrow ?? false;
  const fullWidth = props.fullWidth ?? false;
  const muted =
    props.disabledStyle === "solid" &&
    !("href" in props && typeof props.href === "string") &&
    Boolean((props as ButtonAsButton).disabled);

  const inner = (
    <ButtonInner
      size={size}
      variant={variant}
      arrow={arrow}
      fullWidth={fullWidth}
      muted={muted}
    >
      {props.children}
    </ButtonInner>
  );

  if ("href" in props && typeof props.href === "string") {
    const {
      size: _size,
      variant: _variant,
      arrow: _arrow,
      fullWidth: _fullWidth,
      disabledStyle: _disabledStyle,
      className,
      children: _children,
      href,
      ...rest
    } = props;
    void _disabledStyle;
    void _size;
    void _variant;
    void _arrow;
    void _fullWidth;
    void _children;
    return (
      <Link href={href} className={wrapperClass(className, fullWidth)} {...rest}>
        {inner}
      </Link>
    );
  }

  const {
    size: _size,
    variant: _variant,
    arrow: _arrow,
    fullWidth: _fullWidth,
    disabledStyle: _disabledStyle,
    className,
    children: _children,
    type,
    ...rest
  } = props as ButtonAsButton;
  void _disabledStyle;
  void _size;
  void _variant;
  void _arrow;
  void _fullWidth;
  void _children;
  return (
    <button
      type={type ?? "button"}
      className={wrapperClass(className, fullWidth, muted)}
      {...rest}
    >
      {inner}
    </button>
  );
}
