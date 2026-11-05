import { FilterIcon } from "@/components/catalog/icons";

const COPY = {
  label: "Фільтри",
  labelCount: (count: number) => `Фільтри, обрано ${count}`,
} as const;

// Filter disc of the search rows (TR-10 / A-6, system spec A11): the
// shop's black 52-px r26 "Icon button" (materials 3677:39698, catalog
// 3685:53426) - a deliberate departure from the outlined master disc
// 3117:12801 (3 of 4 consumers already draw the black one). The count
// badge is the header cart badge (20 tall, 1.5-px white ring, 12 Bold)
// with the brand fill kept for contrast on the black disc; from 640 it
// is hidden unless `badgeDesktop` (materials), where the `lg:` pair
// restores today's ringless SemiBold badge.
export function FilterButton({
  count,
  expanded,
  onClick,
  badgeDesktop = false,
  className = "",
}: {
  count: number;
  expanded: boolean;
  onClick: () => void;
  badgeDesktop?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={count ? COPY.labelCount(count) : COPY.label}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      onClick={onClick}
      className={`relative flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] bg-neutral-900 text-white transition-opacity duration-200 hover:opacity-85 max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand max-lg:focus-visible:ring-offset-2 ${className}`}
    >
      <FilterIcon className="size-6" />
      {count > 0 && (
        <span
          aria-hidden
          className={`absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-[1.5px] border-white bg-brand px-1 text-[12px] font-bold leading-none text-white lg:border-0 lg:font-semibold ${
            badgeDesktop ? "" : "lg:hidden"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
