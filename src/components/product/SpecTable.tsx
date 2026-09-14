import type { ReactNode } from "react";

// The rounded #f8f8f8 table the product tabs share (Figma
// «<TableCellRow>» stack, e.g. 4329:52376): rows padded 24 px at the
// sides, cells padded 16/24, a fixed-width label cell and a flexible
// value cell, 0.5-px #d2d2d2 dividers inset 16 px from the table edge.
// Below lg the two cells stack so long values read as a paragraph.
export type SpecTableRow = {
  key: string;
  label: ReactNode;
  value: ReactNode;
};

export function SpecTable({
  rows,
  labelClassName = "lg:w-[316px]",
  labelWeight = "font-normal",
  valueWeight = "font-semibold",
}: {
  rows: SpecTableRow[];
  // Label-cell width at lg (316 on characteristics / delivery, 280 on
  // the scent pyramid).
  labelClassName?: string;
  labelWeight?: string;
  valueWeight?: string;
}) {
  return (
    <div className="flex w-full flex-col rounded-3xl bg-bg-subtle">
      {rows.map((row, i) => (
        <div key={row.key} className="flex flex-col">
          {i > 0 && (
            <div aria-hidden className="mx-4 h-[0.5px] shrink-0 bg-stroke-subtle" />
          )}
          <div className="flex flex-col px-3 lg:flex-row lg:items-start lg:px-6">
            <div
              className={`flex shrink-0 items-start px-4 pt-5 pb-1 text-[16px] leading-6 text-neutral-900 lg:py-6 ${labelWeight} ${labelClassName}`}
            >
              {row.label}
            </div>
            <div
              className={`flex min-w-0 flex-1 items-start px-4 pt-1 pb-5 text-[16px] leading-6 text-neutral-900 lg:py-6 ${valueWeight}`}
            >
              {row.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
