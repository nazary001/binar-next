"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Fragment, useState } from "react";
import {
  CartButton,
  ChipsRow,
  PriceAndQty,
  StatusLine,
} from "@/components/catalog/ProductCard";
import { productHref, type Product } from "@/components/catalog/data";

// «Купують разом» band (Frame 1010106720, 4329:51391): a #343435 section
// with 68-px top corners, 80-px gutters, 80 above the H2, 80 between the
// H2 and the cards, and 152 below — the next (white) section overlaps
// the last 72 of those with its own rounded top, so 80 px of the dark
// band stay visible under the cards.
//
// The two wide cards (735×328) sit either side of a 1-px #8e8e8f rule
// centred in an 80-px gap.
export function BoughtTogether({
  items,
}: {
  items: { product: Product; benefits: string[] }[];
}) {
  return (
    <section
      aria-labelledby="bought-together-title"
      className="relative rounded-t-[32px] bg-neutral-800 px-6 pb-[112px] pt-[60px] sm:rounded-t-[48px] sm:px-10 sm:pb-[132px] lg:rounded-t-[68px] lg-shop-pad-x lg:pb-[152px] lg:pt-20"
    >
      <h2 id="bought-together-title" className="text-h2 text-white">
        Купують разом
      </h2>
      <div className="mt-12 flex flex-col gap-10 lg:mt-20 lg:flex-row lg:items-stretch lg:gap-[39.5px]">
        {items.map((item, i) => (
          <Fragment key={item.product.id}>
            {i > 0 && (
              <div
                aria-hidden
                className="h-px w-full shrink-0 bg-neutral-400 lg:h-auto lg:w-px lg:self-stretch"
              />
            )}
            <WideCard product={item.product} benefits={item.benefits} />
          </Fragment>
        ))}
      </div>
    </section>
  );
}

// «B2C :: Product card» wide variant (4329:51395): a 328-px square
// photo (r40, white backdrop) beside a content column — status / Title
// Large / white-outlined chips, a disc list of three benefits, and the
// price row pinned to the bottom (price · hairline · stepper, white
// cart ring). Everything neutral is white on the dark band.
function WideCard({ product, benefits }: { product: Product; benefits: string[] }) {
  const [qty, setQty] = useState(1);
  const out = !product.available;
  const href = productHref(product);

  return (
    <article className="group/card flex min-w-0 flex-1 flex-col gap-6 sm:flex-row sm:gap-8">
      <Link
        href={href}
        aria-label={product.title}
        className="relative block aspect-square w-full shrink-0 overflow-clip rounded-[32px] bg-white sm:w-[240px] lg:w-[min(328px,44.6%)] lg:rounded-[40px]"
      >
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 size-full object-cover ${out ? "grayscale" : ""}`}
        />
      </Link>

      {/* The content column is the container the price row queries: it
          is 375 wide on the 1710 master but ~300 in the 1440 layout,
          where the stepper gaps drop to 12 so price · stepper · cart
          still share one line. */}
      <div className="@container flex min-w-0 flex-1 flex-col gap-8 text-white">
        <div className="flex flex-col gap-4">
          <StatusLine out={out} tone="light" />
          <h3 className="text-title-lg text-white">
            <Link href={href}>{product.title}</Link>
          </h3>
          <ChipsRow product={product} tone="light" />
        </div>

        <ul className="flex list-disc flex-col gap-2 ps-6 text-body-sm text-white">
          {benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-y-3">
          {/* 300-px column at 1440: price 126 + 24·2 + hairline + stepper
              76 + cart 52 = 303, so the gaps drop to 12 below 340. */}
          <PriceAndQty
            product={product}
            qty={qty}
            onQty={setQty}
            out={out}
            tone="light"
            className="@max-[340px]:gap-3"
          />
          <CartButton product={product} out={out} tone="light" qty={qty} />
        </div>
      </div>
    </article>
  );
}
