import type { Product } from "./data";

// Moved out of ProductCard.tsx (which re-exports it) for the mobile pass
// (system spec A18 / catalog SN-C2). Never import ProductCard.tsx from
// here (circular).

// Chips - 36-px pills, stroke-default border; hover flips the border +
// label to brand (Figma Chip State=Hover). On the dark band the chips
// are white-outlined with white labels (4329:51408). px-15 + the 1-px
// border = the master's px-16 with the stroke inside the box (text +
// 32: "40 мл" = 76, "Botanica" = 99), same as the applied-filter and
// popover chips.
// Phones: the master chip type 14/20 Medium (blog chip 3176:5479); a
// chip never grows past its row and its label truncates (desktop keeps
// Button/Medium 16/22, `lg:leading-[22px]` re-declares the leading).
export function ChipsRow({
  product,
  tone = "dark",
  className = "",
}: {
  product: Product;
  tone?: "dark" | "light";
  className?: string;
}) {
  const chips = product.chips ?? [product.volume, product.brand];
  const look =
    tone === "light"
      ? "border-white text-white"
      : "border-stroke-default text-neutral-900";
  return (
    <div className={`flex flex-wrap content-center items-center gap-2 ${className}`}>
      {chips.map((chip) => (
        <span
          key={chip}
          className={`flex h-9 items-center justify-center whitespace-nowrap rounded-[60px] border px-[15px] text-[14px] font-medium leading-5 transition-colors duration-200 hover:border-brand hover:text-brand max-lg:min-w-0 max-lg:max-w-full lg:text-button-md lg:leading-[22px] ${look}`}
        >
          <span className="max-lg:min-w-0 max-lg:truncate">{chip}</span>
        </span>
      ))}
    </div>
  );
}
