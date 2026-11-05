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
  // Phones (pdp spec 2.8, TR-27 key / value rows): r32 card, rows py 16 on
  // the 24 inset, the label 14/20 Medium #777779 8 above the 16/24 value,
  // 1-px #d2d2d2 dividers on the same 24 inset (no 0.5-px lines, D10).
  return (
    <div className="flex w-full flex-col rounded-3xl bg-bg-subtle max-lg:rounded-[32px]">
      {rows.map((row, i) => (
        <div key={row.key} className="flex flex-col">
          {i > 0 && (
            <div aria-hidden className="mx-4 h-[0.5px] shrink-0 bg-stroke-subtle max-lg:mx-6 max-lg:h-px" />
          )}
          <div className="flex flex-col px-6 lg:flex-row lg:items-start lg:px-6 max-lg:gap-2 max-lg:py-4">
            <div
              className={`flex shrink-0 items-start px-4 pt-5 pb-1 text-[16px] leading-6 text-neutral-900 lg:py-6 ${labelWeight} ${labelClassName} max-lg:px-0 max-lg:pt-0 max-lg:pb-0 max-lg:text-[14px] max-lg:font-medium max-lg:leading-5 max-lg:text-neutral-500`}
            >
              {row.label}
            </div>
            <div
              className={`flex min-w-0 flex-1 items-start px-4 pt-1 pb-5 text-[16px] leading-6 text-neutral-900 lg:py-6 ${valueWeight} max-lg:px-0 max-lg:pt-0 max-lg:pb-0`}
            >
              {row.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
