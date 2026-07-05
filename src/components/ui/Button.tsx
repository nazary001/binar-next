/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const ARROW_SRC = "/figma-export/hero/arrow-up-right.svg";
const PLUS_SRC = "/figma-export/plus.svg";
const MINUS_SRC = "/figma-export/minus.svg";

type ButtonStyle = {
  // "responsive" renders the compact (small) button below lg and the
  // large button at lg+ in a single instance — used where Figma's mobile
  // master shows the small CTA but desktop keeps the large one.
  size?: "large" | "small" | "responsive";
  variant?: "solid" | "outlined" | "light";
  arrow?: boolean;
  // Swap the trailing up-right arrow for a plus glyph (Figma 1327:4985 -
  // the FAQ "Показати більше" button). Same orange square, plus icon.
  plus?: boolean;
  // Like `plus` but a minus glyph - the FAQ button uses this for its
  // expanded "Приховати" state. Takes precedence over `plus` / `arrow`.
  minus?: boolean;
  // Hide the icon square below lg (bare pill on mobile, icon on desktop).
  // The Figma mobile FAQ "Показати більше" button has no icon square.
  iconDesktopOnly?: boolean;
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
// The 1-px hover-stability border is part of the box, so the small pill
// uses py-[9px] (9 + 22 line + 9 + 2 border = 42) to hit Figma's exact
// 42-px Button/Small height — py-[10px] rendered 44 px.
const labelSize = {
  large:
    "rounded-[25px] border border-transparent px-5 py-3 text-[15px] whitespace-nowrap sm:rounded-[25px] sm:px-6 sm:py-[15px] sm:text-button-lg",
  small:
    "rounded-[24px] border border-transparent px-6 py-[9px] text-button-md whitespace-nowrap",
  // Small below lg, large at lg (the lg overrides equal the `large`
  // value resolved at >=1024, so desktop is identical to size="large").
  responsive:
    "rounded-[24px] border border-transparent px-6 py-[9px] text-button-md whitespace-nowrap lg:rounded-[25px] lg:py-[15px] lg:text-button-lg",
};

const arrowWrap = {
  large: "size-[44px] rounded-[22px] sm:size-[52px] sm:rounded-[26px]",
  // Figma mobile compact button (e.g. 3082:3250): 42px arrow square.
  small: "size-[42px] rounded-[21px]",
  responsive: "size-[42px] rounded-[21px] lg:size-[52px] lg:rounded-[26px]",
};

// Figma `heroicons-outline/arrow-up-right` lives inside a 24-px (large)
// / 16-px (small) container with an inset of 15.625 % around the SVG.
// The visual arrow is therefore ~16.5 px on large and ~11 px on small —
// noticeably smaller than my old `size-6` / `size-4` which let the path
// fill the full container. We size the img to that visual measurement
// (Tailwind arbitrary px values) so the rendered arrow matches Figma.
const arrowIcon = {
  large: "size-[14px] sm:size-[16.5px]",
  // Figma Button/Small (e.g. 3082:3250) puts the arrow in a 16-px icon
  // box whose asset has ~31% built-in padding — the visible glyph is
  // ~11 px. Our SVG is edge-to-edge, so size the img to the visible ink.
  small: "size-[11px]",
  responsive: "size-[11px] lg:size-[16.5px]",
};

// The plus (Figma 1327:4985) is an 18.75-px vector centred in the 52-px
// orange square - slightly larger in its box than the arrow glyph.
const plusIcon = {
  large: "size-[16px] sm:size-[18.75px]",
  small: "size-[13px]",
  responsive: "size-[16px] lg:size-[18.75px]",
};

// All transitions are colour-only — no slide, no rotate, no scale on
// the arrow. Figma defines hover as bg/text/border inversion only.
// `solid` hover: black pill inverts to a SOLID-WHITE pill with a black
// outline and black text. Using bg-white (not bg-transparent) means
// the hover state shows pure white regardless of what's behind the
// button, which matches Figma's hover variant and reads cleanly on
// any section background.
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
    "bg-neutral-900 text-white transition-colors duration-300 hover:bg-white hover:border-neutral-900 hover:text-neutral-900 peer-hover:bg-white peer-hover:border-neutral-900 peer-hover:text-neutral-900",
  outlined:
    "bg-transparent border-white text-white transition-colors duration-300 hover:bg-white hover:text-neutral-900 peer-hover:bg-white peer-hover:text-neutral-900",
  light:
    "bg-bg-subtle text-neutral-900 transition-colors duration-300 hover:bg-white peer-hover:bg-white",
};

function ButtonInner({
  size,
  variant,
  arrow,
  plus,
  minus,
  iconDesktopOnly,
  children,
}: Required<
  Pick<
    ButtonStyle,
    "size" | "variant" | "arrow" | "plus" | "minus" | "iconDesktopOnly"
  >
> & {
  children: ReactNode;
}) {
  const showIcon = arrow || plus || minus;
  const iconSrc = minus ? MINUS_SRC : plus ? PLUS_SRC : ARROW_SRC;
  // Plus and minus share the same (larger) glyph box; only the arrow differs.
  const iconClass = plus || minus ? plusIcon[size] : arrowIcon[size];
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
      {showIcon && (
        <span
          className={`peer order-2 ${iconDesktopOnly ? "max-lg:hidden " : ""}inline-flex cursor-pointer items-center justify-center bg-brand ${arrowWrap[size]}`}
        >
          <img
            src={iconSrc}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className={iconClass}
          />
        </span>
      )}
      <span
        className={`order-1 inline-flex cursor-pointer items-center justify-center ${labelSize[size]} ${labelVariant[variant]}`}
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
const wrapperClass = (className?: string) =>
  `inline-flex shrink-0 cursor-default items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`.trim();

export function Button(props: ButtonProps) {
  const size = props.size ?? "large";
  const variant = props.variant ?? "solid";
  const arrow = props.arrow ?? false;
  const plus = props.plus ?? false;
  const minus = props.minus ?? false;
  const iconDesktopOnly = props.iconDesktopOnly ?? false;

  const inner = (
    <ButtonInner
      size={size}
      variant={variant}
      arrow={arrow}
      plus={plus}
      minus={minus}
      iconDesktopOnly={iconDesktopOnly}
    >
      {props.children}
    </ButtonInner>
  );

  if ("href" in props && typeof props.href === "string") {
    const {
      size: _size,
      variant: _variant,
      arrow: _arrow,
      plus: _plus,
      minus: _minus,
      iconDesktopOnly: _iconDesktopOnly,
      className,
      children: _children,
      href,
      ...rest
    } = props;
    void _size;
    void _variant;
    void _arrow;
    void _plus;
    void _minus;
    void _iconDesktopOnly;
    void _children;
    return (
      <Link href={href} className={wrapperClass(className)} {...rest}>
        {inner}
      </Link>
    );
  }

  const {
    size: _size,
    variant: _variant,
    arrow: _arrow,
    plus: _plus,
    minus: _minus,
    iconDesktopOnly: _iconDesktopOnly,
    className,
    children: _children,
    type,
    ...rest
  } = props as ButtonAsButton;
  void _size;
  void _variant;
  void _arrow;
  void _plus;
  void _minus;
  void _iconDesktopOnly;
  void _children;
  return (
    <button
      type={type ?? "button"}
      className={wrapperClass(className)}
      {...rest}
    >
      {inner}
    </button>
  );
}
