/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

const ARROW_SRC = "/figma-export/hero/arrow-up-right.svg";

type IconButtonStyle = {
  variant?: "primary" | "outlined";
  size?: "large" | "small";
  className?: string;
  iconSrc?: string;
  iconClassName?: string;
  "aria-label": string;
};

type IconAsLink = IconButtonStyle & {
  href: string;
} & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    keyof IconButtonStyle | "href"
  >;

type IconAsButton = IconButtonStyle & {
  href?: undefined;
} & Omit<ComponentPropsWithoutRef<"button">, keyof IconButtonStyle>;

export type IconButtonProps = IconAsLink | IconAsButton;

const sizeMap = {
  large: "size-[52px] rounded-[26px]",
  small: "size-[42px] rounded-[21px]",
};

// Same Figma 15.625 % inset around the SVG path as the standard Button —
// see Button.tsx for the math. Visual arrow ~16.5 px on large, ~11 px
// on small.
const iconSizeMap = {
  large: "size-[16.5px]",
  small: "size-[11px]",
};

// Figma "Icon button" (230:904) has only 2 variants — Primary (orange
// solid) and Outlined (1-px black border). No hover variant defined,
// so we keep both states static with no scale/rotate.
const variantMap = {
  primary:
    "bg-brand text-white",
  outlined:
    "border border-neutral-900 text-neutral-900",
};

export function IconButton(props: IconButtonProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "large";
  const iconSrc = props.iconSrc ?? ARROW_SRC;
  const iconClassName = props.iconClassName ?? iconSizeMap[size];

  const wrapper = `inline-flex shrink-0 cursor-pointer items-center justify-center ${sizeMap[size]} ${variantMap[variant]} ${props.className ?? ""}`.trim();
  const icon = (
    <img src={iconSrc} alt="" aria-hidden loading="lazy" decoding="async" className={iconClassName} />
  );

  if ("href" in props && typeof props.href === "string") {
    const {
      variant: _variant,
      size: _size,
      className: _className,
      iconSrc: _iconSrc,
      iconClassName: _iconClassName,
      href,
      ...rest
    } = props;
    void _variant;
    void _size;
    void _className;
    void _iconSrc;
    void _iconClassName;
    return (
      <Link href={href} className={wrapper} {...rest}>
        {icon}
      </Link>
    );
  }

  const {
    variant: _variant,
    size: _size,
    className: _className,
    iconSrc: _iconSrc,
    iconClassName: _iconClassName,
    type,
    ...rest
  } = props as IconAsButton;
  void _variant;
  void _size;
  void _className;
  void _iconSrc;
  void _iconClassName;
  return (
    <button type={type ?? "button"} className={wrapper} {...rest}>
      {icon}
    </button>
  );
}
