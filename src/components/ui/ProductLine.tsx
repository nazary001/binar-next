/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { TrashIcon } from "@/components/cart/icons";

// Product line (TR-08, system spec A8) for the cart sheet, stock sheet,
// checkout lines, order / return items, wizard rows and assortment rows:
// the 64-px r16 photo + 16 + the text column (gap 4): an optional status
// eyebrow (12/20 Medium uppercase, exception states only), the name 16/22
// Bold (2 or 3 lines), meta / price 14/20 #777779 and a 12/16 note; a
// trailing control (trash 44 / RowDisc) top-right and an optional bottom
// row (stepper + total, or read-only meta + amount) 16 below. With
// `href` the photo and the text are ONE link. Lists are `ul role="list"`
// with `divide-y divide-stroke-subtle` (framed lists add `border-y`);
// a line nested in a list item (`as="div"`) adds no padding of its own.
export type ProductLineStatus = { label: string; tone: "positive" | "negative" | "brand" | "muted" };

const TONE: Record<ProductLineStatus["tone"], string> = {
  positive: "text-positive",
  negative: "text-negative",
  brand: "text-brand",
  muted: "text-neutral-500",
};

// The one uppercase type on phones (A27 / 3.1.1; blog eyebrow 3176:5546):
// 12/20 Medium UPPERCASE in the tone colour - ProductLine status, RecordRow
// eyebrow, and the catalog / PDP status lines and price captions (callers
// that also render on desktop append their lg: restores).
export const PHONE_EYEBROW = "text-[12px] font-medium uppercase leading-5";

// The line total of the bottom row (wraps to its own right-aligned line
// at 320).
export const PRODUCT_LINE_TOTAL =
  "ml-auto whitespace-nowrap text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900";
// The list around the lines.
export const PRODUCT_LINE_LIST = "flex flex-col divide-y divide-stroke-subtle";

export function ProductLine({
  image,
  title,
  href,
  onNavigate,
  status,
  meta,
  price,
  note,
  grey = false,
  titleLines = 2,
  leading,
  trailing,
  bottom,
  as = "li",
  padded,
  className = "",
}: {
  image: string;
  title: string;
  href?: string;
  onNavigate?: () => void;
  status?: ProductLineStatus;
  meta?: ReactNode;
  price?: ReactNode;
  note?: ReactNode;
  grey?: boolean;
  titleLines?: 2 | 3;
  leading?: ReactNode;
  trailing?: ReactNode;
  bottom?: ReactNode;
  as?: "li" | "div";
  padded?: boolean;
  className?: string;
}) {
  const Root = as;
  const pad = padded ?? as === "li";
  const BLOCK =
    "flex min-w-0 flex-1 items-start gap-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
  const inner = (
    <>
      <span className="relative block size-16 shrink-0 overflow-clip rounded-2xl bg-bg-product">
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 size-full object-cover ${grey ? "grayscale" : ""}`}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {status && (
          <span className={`whitespace-nowrap ${PHONE_EYEBROW} ${TONE[status.tone]}`}>
            {status.label}
          </span>
        )}
        <span
          className={`${titleLines === 3 ? "line-clamp-3" : "line-clamp-2"} text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900`}
        >
          {title}
        </span>
        {meta && <span className="text-[14px] leading-5 text-neutral-500">{meta}</span>}
        {price && <span className="text-[14px] leading-5 text-neutral-500">{price}</span>}
        {note && <span className="text-[12px] leading-4 text-neutral-500">{note}</span>}
      </span>
    </>
  );
  return (
    <Root className={`flex flex-col gap-4 ${pad ? "py-6" : ""} ${className}`}>
      <div className="flex items-start">
        {leading}
        {href ? (
          <Link href={href} onClick={onNavigate} aria-label={title} className={BLOCK}>
            {inner}
          </Link>
        ) : (
          <div className={BLOCK}>{inner}</div>
        )}
        {trailing}
      </div>
      {bottom && <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">{bottom}</div>}
    </Root>
  );
}

// The 44-px trash control of an editable line (24 glyph, its edge on the
// content edge and the photo top).
export function ProductLineRemove({
  label,
  onClick,
  buttonRef,
}: {
  label: string;
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      onClick={onClick}
      className="-mr-[10px] -mt-[10px] flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:text-brand active:text-brand motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <TrashIcon className="size-6" />
    </button>
  );
}
