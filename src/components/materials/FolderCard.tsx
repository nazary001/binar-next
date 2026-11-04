import Link from "next/link";
import { filesCount, type MaterialCategory } from "./data";
import { FolderIcon } from "./icons";

// One folder of the landing grid. Public «Матеріали» card 4634:64377: a
// #f8f8f8 r24 tile padded 24, the 48-px folder, then 16 px lower the
// Title/Small ExtraBold name over the «9 файлів» count in 16/24
// #777779. The partner card (B2B component 4396:11870) is the same box,
// white on the #f5f5f5 cabinet panel, its content centred vertically.
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
      className={`group flex h-full flex-col gap-4 rounded-3xl p-6 ${SURFACE[surface]}`}
    >
      <FolderIcon className="size-12 shrink-0 text-neutral-900" />
      <span className="flex flex-col gap-0.5">
        <span className="text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-900 transition-colors duration-200 group-hover:text-brand">
          {category.title}
        </span>
        <span className="text-body-sm text-neutral-500">{filesCount(count)}</span>
      </span>
    </Link>
  );
}
