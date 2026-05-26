/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const ARROW_SRC = "/figma-export/hero/arrow-up-right.svg";

type ButtonStyle = {
  size?: "large" | "small";
  variant?: "solid" | "outlined" | "light";
  arrow?: boolean;
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
const labelSize = {
  large:
    "rounded-[25px] border border-transparent px-5 py-3 text-[15px] whitespace-nowrap sm:rounded-[25px] sm:px-6 sm:py-[15px] sm:text-button-lg",
  small:
    "rounded-[24px] border border-transparent px-5 py-[10px] text-button-md whitespace-nowrap sm:px-6",
};

const arrowWrap = {
  large: "size-[44px] rounded-[22px] sm:size-[52px] sm:rounded-[26px]",
  small: "size-[38px] rounded-[19px] sm:size-[42px] sm:rounded-[21px]",
};

// Figma `heroicons-outline/arrow-up-right` lives inside a 24-px (large)
// / 16-px (small) container with an inset of 15.625 % around the SVG.
// The visual arrow is therefore ~16.5 px on large and ~11 px on small —
// noticeably smaller than my old `size-6` / `size-4` which let the path
// fill the full container. We size the img to that visual measurement
// (Tailwind arbitrary px values) so the rendered arrow matches Figma.
const arrowIcon = {
  large: "size-[14px] sm:size-[16.5px]",
  small: "size-[11px]",
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
  children,
}: Required<Pick<ButtonStyle, "size" | "variant" | "arrow">> & {
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

  const inner = (
    <ButtonInner size={size} variant={variant} arrow={arrow}>
      {props.children}
    </ButtonInner>
  );

  if ("href" in props && typeof props.href === "string") {
    const {
      size: _size,
      variant: _variant,
      arrow: _arrow,
      className,
      children: _children,
      href,
      ...rest
    } = props;
    void _size;
    void _variant;
    void _arrow;
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
    className,
    children: _children,
    type,
    ...rest
  } = props as ButtonAsButton;
  void _size;
  void _variant;
  void _arrow;
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
