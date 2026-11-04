import Link from "next/link";
import type { ReactNode } from "react";
import { BackCrumbBody } from "@/components/ui/Breadcrumb";

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
export function TitleLight({ children }: { children: ReactNode }) {
  return <span className="font-light">{children}</span>;
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
};

export function CabinetPageHead({ title, subtitle, back, meta, actions, className = "" }: CabinetPageHeadProps) {
  return (
    <section
      className={`flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-[26px] lg:py-8 lg:pl-10 lg:pr-8 ${className}`}
    >
      <div className="flex min-w-0 flex-col items-start gap-6">
        {back && <BackButton {...back} />}
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-9 tracking-[-0.64px] text-neutral-900 lg:text-[44px] lg:leading-[48px] lg:tracking-[-0.88px]">
            {title}
          </h1>
          {subtitle && <p className="text-[14px] leading-6 text-neutral-500">{subtitle}</p>}
        </div>
        {meta && <div className="flex flex-wrap items-start gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-4 lg:shrink-0 lg:justify-end">{actions}</div>}
    </section>
  );
}
