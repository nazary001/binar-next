import Link from "next/link";
import { filesCount, type MaterialCategory } from "./data";
import { FolderIcon } from "./icons";

// One folder of the landing grid. Public «Матеріали» card 4634:64377: a
// #f8f8f8 r24 tile padded 24, the 48-px folder, then 16 px lower the
// Title/Small ExtraBold name over the «9 файлів» count in 16/24
// #777779. The partner card (B2B component 4396:11870) is the same box,
// white on the #f5f5f5 cabinet panel, its content centred vertically.
// Hover (designer, 2026-11-13: variant `User=Hower` 5474:44835): a 2-px
// #f85a0b border, the #f8f8f8 fill (the white partner card too), the
// folder and the name in #f85a0b, the count stays #777779. Figma lays the
// stroke out around the 24 padding (a 166-tall box); here the 2 px is a
// transparent border at rest taken out of the padding (22 + 2), so the
// card stays 162 tall and nothing moves when the border shows.
// Phones (< 640, materials spec 2.5, TR-25 folder cards): one row - the
// 48 folder, 16, the name in Title Large 22/28 SemiBold over the 14/20
// count; r32, padded 24, 100 tall (128 when the name wraps); no chevron
// (it would break "Сертифікати" / "Прайс-листи" mid-word at 320).
const SURFACE = {
  subtle: "bg-bg-subtle",
  white: "justify-center bg-white",
} as const;

export function FolderCard({
  category,
  count,
  surface = "subtle",
}: {
  category: MaterialCategory;
  count: number;
  surface?: keyof typeof SURFACE;
}) {
  return (
    <Link
      href={`/materials/${category.slug}`}
      className={`group flex h-full flex-col gap-4 rounded-3xl p-6 transition-colors duration-200 lg:border-2 lg:border-transparent lg:p-[22px] lg:hover:border-brand lg:hover:bg-bg-subtle max-lg:flex-row max-lg:items-center max-lg:rounded-[32px] max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand ${SURFACE[surface]}`}
    >
      <FolderIcon className="size-12 shrink-0 text-neutral-900 transition-colors duration-200 group-hover:text-brand" />
      <span className="flex flex-col gap-0.5 max-lg:min-w-0 max-lg:flex-1 max-lg:gap-1">
        <span className="text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-900 transition-colors duration-200 group-hover:text-brand max-lg:text-[22px] max-lg:font-semibold max-lg:leading-7 max-lg:tracking-[-0.44px] max-lg:group-active:text-brand">
          {category.title}
        </span>
        <span className="text-body-sm text-neutral-500">{filesCount(count)}</span>
      </span>
    </Link>
  );
}
