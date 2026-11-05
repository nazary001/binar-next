import { XMarkIcon } from "@/components/catalog/icons";

const COPY = {
  reset: "Скинути фільтрацію",
  remove: (label: string) => `Прибрати фільтр «${label}»`,
} as const;

// Applied-filter chips of the search rows (TR-10, system spec A11; blog
// chip 3176:5479, catalog 4329:39611): a 36-px r60 chip with a 1-px
// #8e8e8f ring and 14/20 Medium #343435 label (desktop #1d1d1f) inside a
// 44-px hit box, the label truncating inside the row; then the
// "Скинути фільтрацію" text button (44 hit). Resets filters only - the
// query lives in the search field. Renders nothing without chips; the
// caller places it 16 under the search row (`className="mt-4 lg:hidden"`).
export type AppliedChip = { key: string; label: string; onRemove: () => void };

export function AppliedChips({
  chips,
  onReset,
  resetLabel = COPY.reset,
  className = "",
}: {
  chips: AppliedChip[];
  onReset: () => void;
  resetLabel?: string;
  className?: string;
}) {
  if (chips.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          aria-label={COPY.remove(chip.label)}
          className="group -my-1 flex h-11 min-w-0 max-w-full cursor-pointer items-center focus-visible:outline-none"
        >
          <span className="flex h-9 min-w-0 max-w-full items-center gap-2 rounded-[60px] border border-stroke-default px-[15px] text-[14px] font-medium leading-5 text-neutral-800 transition-colors duration-200 motion-reduce:transition-none group-hover:border-brand group-hover:text-brand group-active:border-brand group-active:text-brand group-focus-visible:ring-2 group-focus-visible:ring-brand group-focus-visible:ring-offset-2 lg:text-neutral-900">
            <span className="min-w-0 truncate">{chip.label}</span>
            <XMarkIcon className="size-4 shrink-0" />
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="-my-1 flex h-11 cursor-pointer items-center gap-[2px] whitespace-nowrap text-[14px] font-medium leading-5 text-neutral-700 transition-colors duration-200 motion-reduce:transition-none hover:text-brand active:text-brand focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {resetLabel}
        <XMarkIcon className="size-4 shrink-0" />
      </button>
    </div>
  );
}
