"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { cx, initials } from "../lib/format";

// Avatar: a person or a company as a dark disc with white initials (the
// account chip of the top bar and the cabinet's company chip), or their
// picture when there is one.
//
//   <Avatar name="Олена Коваль" />
//   <Avatar name={company.name} src={company.logo} size="lg" />
//   <Avatar name={staff.name} size="sm" decorative />    next to the printed name
//
// Props
// - name: used for the initials and as the accessible name.
// - src: a picture (an /api/media url, a data url). If it fails to load,
//   the initials come back.
// - size: "sm" 24 px, "md" 32 px (default, the top bar's chip), "lg" 40 px,
//   "xl" 56 px (a profile head).
// - decorative: hides the avatar from screen readers; use it when the name
//   is printed next to it, so it is not read twice.
// - className: spacing.

export type AvatarSize = "sm" | "md" | "lg" | "xl";

const BOX: Record<AvatarSize, string> = {
  sm: "size-6 text-[10px]",
  md: "size-8 text-[12px]",
  lg: "size-10 text-[14px]",
  xl: "size-14 text-[18px]",
};

export type AvatarProps = {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  decorative?: boolean;
  className?: string;
};

export function Avatar({ name, src, size = "md", decorative = false, className }: AvatarProps) {
  // The src that failed, so a new src gets its own chance.
  const [broken, setBroken] = useState<string | null>(null);
  const showImage = Boolean(src) && broken !== src;
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      title={decorative ? undefined : name}
      className={cx(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-bold leading-none",
        showImage ? "bg-bg-subtle" : "bg-neutral-900 text-white",
        BOX[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt=""
          className="size-full object-cover"
          // An image that failed before hydration fired its error event
          // before React listened; decode() reports it once mounted.
          ref={(node) => {
            node?.decode().catch(() => {
              if (!node.complete || node.naturalWidth === 0) setBroken(src ?? null);
            });
          }}
          onError={() => setBroken(src ?? null)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
