import Link from "next/link";
import { ArrowBack } from "@/components/catalog/icons";
import { FIGMA_TEXT_BOX } from "@/components/catalog/textBox";

// Breadcrumb pieces shared by the shop pages (catalog, PDP, checkout,
// materials) and the cabinet title block (platform/ui CabinetPageHead).
// Every one of them is an instance of the same Figma «Back button»
// (Icon button 2670:6334 + label; e.g. 4329:39135 catalog, 4329:40703
// checkout, 4634:63603 materials, 5192:79075 cabinet): a 40-px r26
// #1d1d1f ring holding the «Arrow back» glyph, 16 px to the Button/Large
// label 18/22 SemiBold +1 % #343435 (16/22 +0.16 on phones). Hover fills
// the ring brand and turns the label brand.
// Glyph: the master draws a 24-px heroicon box whose ink spans 21 x 15.13
// (public/figma-export/returns/icon-arrow-back-24.svg); ArrowBack is the
// tight 21 x 15 export of the same path, drawn 21 wide so the ink matches.

// Ring + label, for wrappers other than a link (the cabinet BackButton
// also renders as a <button>). The parent needs the `group` class.
export function BackCrumbBody({ label }: { label: string }) {
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
        <ArrowBack className="w-[21px]" />
      </span>
      <span className="whitespace-nowrap text-[16px] font-semibold leading-[22px] tracking-[0.16px] text-neutral-800 transition-colors duration-300 group-hover:text-brand lg:text-[18px] lg:tracking-[0.18px]">
        {label}
      </span>
    </>
  );
}

// The link takes the instance's whole-pixel width (Figma 130 for
// «Головна», 165 for «До каталогу»): Chrome lays the label out 0.3-0.6 px
// narrower, and the 16-px gaps would carry that shortfall along the row.
export function BackCrumb({ href, label, className = "" }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} style={FIGMA_TEXT_BOX} className={`group flex items-center gap-4 ${className}`}>
      <BackCrumbBody label={label} />
    </Link>
  );
}

// «/» between crumbs: 18/22 SemiBold with the Button/Large 0.18-px
// tracking in #d2d2d2. Every master draws its «/» text box 8 wide (the
// glyph renders 7.7), so the box is pinned to 8 with the glyph centred.
export function Slash() {
  return (
    <span aria-hidden className="inline-block w-2 text-center text-[18px] font-semibold leading-[22px] tracking-[0.18px] text-stroke-subtle">
      /
    </span>
  );
}
