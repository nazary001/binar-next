import type { ReactNode } from "react";

// Empty «<TableCellRow>» under a cabinet table head, two masters:
//   md - orders 4990:72302 (ctx/4929-63091.md): 200 tall, px-24, centred
//        column gap 16: text block (gap 8) «Замовлень ще немає» Manrope
//        Bold 16/22 +1 % #1d1d1f + «Оформіть перше замовлення, щоб воно
//        з'явилося у цьому списку.» Regular 14/24 #343435, then one
//        Button/Small (accent «Зробити замовлення», 42 tall). Same row in
//        profile 4929:64257 / 4990:72320.
//   lg - assortment 4990:72271 (ctx/4929-65050.md): 250 tall, gap 24:
//        «Ваш асортимент ще не сформовано» ExtraBold 18/24 -2 % + Regular
//        16/24 #343435, then two Button/Small 24 px apart (outlined
//        «Завантажити з Excel» + accent «Переглянути каталог»).
// The head row is followed by Figma's 0.5-px #d2d2d2 Divider (15 px in
// from both sides, divider-head.svg), drawn here as the row's top
// hairline: 64 + 0.5 + 200 = the master's 264.5 block.
export type TableEmptyStateProps = {
  title: ReactNode;
  text?: ReactNode;
  // Button/Small elements (size="small"); md has one, lg two.
  actions?: ReactNode;
  size?: "md" | "lg";
  className?: string;
};

export function TableEmptyState({ title, text, actions, size = "md", className = "" }: TableEmptyStateProps) {
  const lg = size === "lg";
  return (
    <div
      className={`flex w-full flex-col items-center justify-center px-6 py-8 text-center ${
        lg ? "min-h-[250px] gap-6" : "min-h-[200px] gap-4"
      } ${className}`}
    >
      <div className="flex w-full flex-col gap-2">
        <p
          className={
            lg
              ? "text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-900"
              : "text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900"
          }
        >
          {title}
        </p>
        {text && (
          <p className={`${lg ? "text-[16px]" : "text-[14px]"} leading-6 text-neutral-800`}>{text}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-start justify-center gap-6">{actions}</div>}
    </div>
  );
}

const HAIRLINE =
  "[background:linear-gradient(var(--color-stroke-subtle),var(--color-stroke-subtle))_15px_0/calc(100%-30px)_0.5px_no-repeat]";

// The same block as a full-width table row: <tr><td colSpan> with the
// 0.5-px divider on top.
export function TableEmptyRow({
  colSpan,
  ...state
}: TableEmptyStateProps & { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className={`p-0 pt-[0.5px] ${HAIRLINE}`}>
        <TableEmptyState {...state} />
      </td>
    </tr>
  );
}
