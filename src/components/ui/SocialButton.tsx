/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type SocialButtonStyle = {
  variant?: "default" | "primary";
  className?: string;
  iconSrc?: string;
  iconClassName?: string;
  iconNode?: ReactNode;
  "aria-label": string;
};

type SocialAsLink = SocialButtonStyle & {
  href: string;
} & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    keyof SocialButtonStyle | "href"
  >;

type SocialAsButton = SocialButtonStyle & {
  href?: undefined;
} & Omit<ComponentPropsWithoutRef<"button">, keyof SocialButtonStyle>;

export type SocialButtonProps = SocialAsLink | SocialAsButton;

// Figma "Social button" (726:5422) has 2 variants:
//   Default  → 1-px neutral-600 (#616162) border, transparent bg
//   Variant2 → brand-orange bg, no visible border
// The default→variant2 transition is the hover behaviour. No scale,
// no opacity changes.
const variantMap = {
  default:
    "group/social border border-neutral-600 text-white transition-colors duration-300 hover:bg-brand hover:border-brand",
  primary:
    "group/social bg-brand border border-brand text-white",
};

export function SocialButton(props: SocialButtonProps) {
  const variant = props.variant ?? "default";

  const wrapper = `inline-flex size-[46px] shrink-0 cursor-pointer items-center justify-center overflow-clip rounded-lg ${variantMap[variant]} ${props.className ?? ""}`.trim();
  const content =
    props.iconNode ??
    (props.iconSrc ? (
      <img
        src={props.iconSrc}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className={props.iconClassName ?? "size-6"}
      />
    ) : null);

  if ("href" in props && typeof props.href === "string") {
    const {
      variant: _variant,
      className: _className,
      iconSrc: _iconSrc,
      iconClassName: _iconClassName,
      iconNode: _iconNode,
      href,
      ...rest
    } = props;
    void _variant;
    void _className;
    void _iconSrc;
    void _iconClassName;
    void _iconNode;
    return (
      <Link href={href} className={wrapper} {...rest}>
        {content}
      </Link>
    );
  }

  const {
    variant: _variant,
    className: _className,
    iconSrc: _iconSrc,
    iconClassName: _iconClassName,
    iconNode: _iconNode,
    type,
    ...rest
  } = props as SocialAsButton;
  void _variant;
  void _className;
  void _iconSrc;
  void _iconClassName;
  void _iconNode;
  return (
    <button type={type ?? "button"} className={wrapper} {...rest}>
      {content}
    </button>
  );
}
