import { cx } from "../lib/format";

// Skeletons: the loading state of cards and tables (the shimmer is the
// `.admin-skeleton` class of globals.css, which also stops for reduced
// motion). The page-settle helper of the audit kit waits until no
// `.admin-skeleton` is left on screen, so every loading block uses it.
//
//   <Skeleton className="h-5 w-40" />                 one bar
//   <Skeleton shape="circle" className="size-8" />    an avatar
//   <SkeletonText lines={3} />                         a paragraph
//   <SkeletonRows rows={6} columns={5} />              a whole table card while it loads
//   <tbody><SkeletonRows as="tr" rows={6} columns={5} /></tbody>   rows inside an existing table
//
// Skeleton props
// - className: size and spacing (h-*, w-*, mt-*).
// - shape: "bar" (8-px corners, default), "pill", "circle", "tile" (16 px),
//   "card" (24 px). The radius is set inline: `.admin-skeleton` is plain CSS
//   outside Tailwind's layers, so a rounded-* class would lose to it.
//
// SkeletonText props: lines (default 3), className. The last line is shorter.
//
// SkeletonRows props
// - rows (default 5), columns (default 4).
// - as: "div" (default) draws the table's look itself: the dark head and
//   hairline rows, ready to stand in for a table card; "tr" returns bare
//   <tr> rows for the <tbody> of a table that is already on screen.
// - head: draw the dark head ("div" only, default true).
// - className: on the outer block ("div" only).
//
// Every skeleton is aria-hidden; SkeletonText and SkeletonRows carry a
// visually hidden "Завантаження" in a status region, so a screen reader
// hears that something is loading once.

export type SkeletonShape = "bar" | "pill" | "circle" | "tile" | "card";

const RADIUS: Record<SkeletonShape, string> = {
  bar: "8px",
  pill: "9999px",
  circle: "9999px",
  tile: "16px",
  card: "24px",
};

// The grey under the shimmer keeps a bar visible wherever the global rule
// has not loaded yet; the rule is unlayered, so its gradient wins when it
// is there. DataTable, StatCard and the media widgets draw their loading
// bars with this component too.
export function Skeleton({ className, shape = "bar" }: { className?: string; shape?: SkeletonShape }) {
  return <span aria-hidden className={cx("admin-skeleton block bg-[#ececed]", className)} style={{ borderRadius: RADIUS[shape] }} />;
}

// Fixed widths (no randomness during render): the pattern repeats, but
// neighbouring lines and cells never look the same.
const LINE_WIDTHS = ["w-full", "w-[94%]", "w-[97%]", "w-[88%]", "w-[92%]"];
const CELL_WIDTHS = ["w-[72%]", "w-[54%]", "w-[86%]", "w-[40%]", "w-[64%]", "w-[48%]", "w-[78%]"];

function LoadingNote() {
  return (
    <span role="status" className="sr-only">
      Завантаження
    </span>
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx("flex flex-col", className)}>
      <LoadingNote />
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} aria-hidden className="flex h-5 items-center">
          <Skeleton
            className={cx("h-3", lines > 1 && index === lines - 1 ? "w-[60%]" : LINE_WIDTHS[index % LINE_WIDTHS.length])}
          />
        </span>
      ))}
    </div>
  );
}

export type SkeletonRowsProps = {
  rows?: number;
  columns?: number;
  as?: "div" | "tr";
  head?: boolean;
  className?: string;
};

export function SkeletonRows({ rows = 5, columns = 4, as = "div", head = true, className }: SkeletonRowsProps) {
  const cells = (row: number) =>
    Array.from({ length: columns }, (_, column) => (
      <Skeleton key={column} className={cx("h-3.5", CELL_WIDTHS[(row * 3 + column) % CELL_WIDTHS.length])} />
    ));

  if (as === "tr") {
    return (
      <>
        {Array.from({ length: rows }, (_, row) => (
          <tr key={row} aria-hidden={row > 0 || undefined}>
            {Array.from({ length: columns }, (_, column) => (
              // The hairline sits on the cells: a table with separate
              // borders (the panel's tables) draws no row borders.
              <td key={column} className="h-14 border-b border-stroke-subtle px-4 align-middle first:pl-5 last:pr-5 min-[1024px]:first:pl-6 min-[1024px]:last:pr-6">
                {row === 0 && column === 0 && <LoadingNote />}
                <Skeleton className={cx("h-3.5", CELL_WIDTHS[(row * 3 + column) % CELL_WIDTHS.length])} />
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  const grid = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
  return (
    <div className={cx("overflow-hidden rounded-3xl bg-white", className)}>
      <LoadingNote />
      {head && (
        // DataTable's head: 44 px, the same side padding as its cells.
        <div aria-hidden className="grid h-11 items-center gap-4 bg-neutral-800 px-5 min-[1024px]:px-6" style={grid}>
          {Array.from({ length: columns }, (_, column) => (
            <span key={column} className="block h-2.5 w-16 max-w-[70%] rounded-full bg-white/20" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          aria-hidden
          className="grid h-14 items-center gap-4 border-b border-stroke-subtle px-5 last:border-b-0 min-[1024px]:px-6"
          style={grid}
        >
          {cells(row)}
        </div>
      ))}
    </div>
  );
}
