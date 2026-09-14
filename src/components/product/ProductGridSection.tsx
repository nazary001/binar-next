import { Fragment } from "react";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/catalog/ProductCard";
import type { Product } from "@/components/catalog/data";

// Titled product grid used twice on the product page:
//   «З цієї серії» (Frame 1010106723, 4329:51454) — white, 68-px top
//   corners overlapping the dark band above, «Перейти в каталог» CTA,
//   two rows of four cards;
//   «Схожі товари в наявності» (4329:51815, the out-of-stock page) —
//   plain white, «Переглянути всі» CTA, one row.
// Rows follow the catalog grid: four cards separated by full-height
// #d2d2d2 hairlines centred in 80-px gutters, 80 px between rows.
export function ProductGridSection({
  id,
  title,
  cta,
  products,
  className = "",
}: {
  id?: string;
  title: string;
  cta: { label: string; href: string };
  products: Product[];
  className?: string;
}) {
  const rows: Product[][] = [];
  for (let i = 0; i < products.length; i += 4) rows.push(products.slice(i, i + 4));

  return (
    <section
      id={id}
      aria-labelledby={`${id ?? "grid"}-title`}
      // html already carries scroll-padding-top: 96px for the sticky
      // header; the global unlayered `[id] { scroll-margin-top: 96px }`
      // rule would add a second 96 on top (and beats any layered
      // utility), so the «Схожі товари» jump zeroes the margin inline.
      style={{ scrollMarginTop: 0 }}
      className={`px-6 py-[60px] sm:px-10 lg-shop-pad-x lg:py-20 ${className}`}
    >
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <h2 id={`${id ?? "grid"}-title`} className="text-h2 text-neutral-900">
          {title}
        </h2>
        <Button href={cta.href} arrow size="responsive" className="shrink-0">
          {cta.label}
        </Button>
      </div>

      <div className="mt-12 flex flex-col gap-12 lg:mt-20 lg:gap-20">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:flex lg:gap-[39.5px]"
          >
            {row.map((product, ci) => (
              <Fragment key={product.id}>
                {ci > 0 && (
                  <div
                    aria-hidden
                    className="hidden w-px shrink-0 self-stretch bg-stroke-subtle lg:block"
                  />
                )}
                <div className="min-w-0 lg:flex-1">
                  <ProductCard product={product} />
                </div>
              </Fragment>
            ))}
            {/* Invisible fillers keep a short last row on the 4-column
                rhythm instead of stretching its cards wide. */}
            {row.length < 4 &&
              Array.from({ length: 4 - row.length }, (_, i) => (
                <Fragment key={`filler-${i}`}>
                  <div aria-hidden className="hidden w-px shrink-0 lg:block" />
                  <div aria-hidden className="hidden min-w-0 lg:block lg:flex-1" />
                </Fragment>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
