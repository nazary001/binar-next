import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { BackCrumbBody, PhoneBackCrumb } from "@/components/ui/Breadcrumb";

// Cabinet title block, the first block of every content column right of
// the side rail (pl-40 pr-32 py-32, left column + right buttons centred
// against it, justify-between):
//   list pages (orders 4573:37251, dashboard 5052:32113, profile
//     4868:30963): H2 Manrope Bold 44/48 -2 % + 8 px + Body/Small 14/24
//     #777779 subtitle = a 144-px block; the dashboard greeting mixes a
//     Light «Вітаю,» with the Bold company name (TitleLight);
//   detail pages (return 5192:79073, order 5052:56816): Back button
//     (40-px #1d1d1f ring with the arrow, 16 px gap, Button/Large label
//     18/22 SemiBold +1 % #343435) + 24 px + the H2 «Замовлення» +
//     Light «№48291037» + 24 px + the badge row (gap 8: order badge +
//     payment badge) = 238;
//   right side: Button/Large group, gap 16 (5052:32117).
// Phones (< 640, system spec A20 / shell-cabinet 2.5): pt 48 / pb 48 on
// the slab, 24 gutters; the one-line PhoneBackCrumb, 48 to the title;
// title 30/36 Bold (text-h2 phone token), 16 to the 14/20 subtitle; 24 to
// the badges; 32 to the actions: one action hugs, two or more stack full
// width 8 apart (labels may wrap inside the pill). The page's first block
// after the head has no top padding on phones (head pb 48 = head -> block).

// Shared head type (consumers import these from this file directly).
// Cabinet page title: phone 30/36 Bold -0.6, desktop 44/48 -0.88 Bold.
export const CABINET_TITLE = "text-h2 text-neutral-900";
// Subtitle / meta line on the #f5f5f5 slab: 14/20 #616162 on phones
// (O-17: #777779 is under 4.5:1 on the slab), desktop 14/24 #777779.
export const CABINET_SUBTITLE = "text-[14px] leading-5 text-neutral-600 lg:leading-6 lg:text-neutral-500";
// The same line on a white page (B2B catalog / PDP heads): #777779.
export const CABINET_SUBTITLE_ON_WHITE = "text-[14px] leading-5 text-neutral-500 lg:leading-6";
// In-card / in-page section title: phone 22/28 SemiBold, desktop Bold.
export const CABINET_SECTION_TITLE =
  "text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900 lg:font-bold";

// The Light run of a title. `line` starts it on its own line below 640
// (detail titles "Замовлення" + the order number: a stable two lines).
export function TitleLight({ children, line = false }: { children: ReactNode; line?: boolean }) {
  return <span className={line ? "font-light max-lg:block" : "font-light"}>{children}</span>;
}

export type BackButtonProps = {
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
};

// «Back button» 5192:79075: the same ring + label as every shop crumb
// (ui/Breadcrumb, one Figma master, one glyph size), as a link or, with
// `onClick`, a button. Hover: brand ring fill + brand label.
export function BackButton({ label, href, onClick, className = "" }: BackButtonProps) {
  const inner = <BackCrumbBody label={label} />;
  const cls = `group inline-flex cursor-pointer items-center gap-4 ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export type CabinetPageHeadProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: BackButtonProps;
  // Badge row under the title (detail pages).
  meta?: ReactNode;
  // Right-side Button/Large group.
  actions?: ReactNode;
  className?: string;
  // The h1 (tabIndex -1): focus target after a confirm / sign-in.
  titleRef?: Ref<HTMLHeadingElement>;
};

// Actions: a column on phones (one action hugs; with two or more every
// action stretches and its pill - Button's last child - fills it, labels
// may wrap); the desktop row of today from 640.
const ACTIONS =
  "flex flex-col items-start gap-2 max-lg:has-[>*+*]:items-stretch max-lg:[&>*>span:last-child]:flex-1 max-lg:[&>*>span:last-child]:whitespace-normal max-lg:[&>*>span:last-child]:text-center lg:shrink-0 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-4";

export function CabinetPageHead({ title, subtitle, back, meta, actions, className = "", titleRef }: CabinetPageHeadProps) {
  return (
    <section
      className={`flex flex-col gap-8 px-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-[26px] lg:py-8 lg:pl-10 lg:pr-8 ${className}`}
    >
      <div className="flex min-w-0 flex-col items-start gap-6">
        {back &&
          (back.href ? (
            <>
              <PhoneBackCrumb href={back.href} label={back.label} className="mb-6" />
              <BackButton {...back} className={`max-lg:hidden ${back.className ?? ""}`} />
            </>
          ) : (
            <BackButton {...back} className={`max-lg:mb-6 ${back.className ?? ""}`} />
          ))}
        <div className="flex flex-col gap-4 lg:gap-2">
          <h1 ref={titleRef} tabIndex={-1} className={`${CABINET_TITLE} outline-none`}>
            {title}
          </h1>
          {subtitle && <p className={CABINET_SUBTITLE}>{subtitle}</p>}
        </div>
        {meta && <div className="flex flex-wrap items-start gap-2">{meta}</div>}
      </div>
      {actions && <div className={ACTIONS}>{actions}</div>}
    </section>
  );
}
