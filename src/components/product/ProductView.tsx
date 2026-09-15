"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { PriceAndQty, SaleChip, StatusLine } from "@/components/catalog/ProductCard";
import { B2BPriceAndQty, B2BStatusLine } from "@/components/catalog/B2BProductCard";
import type { Product } from "@/components/catalog/data";
import type { ProductDetails } from "./data";
import { SpecTable } from "./SpecTable";
import { NoteBaseIcon, NoteMiddleIcon, NoteTopIcon } from "./icons";

// Figma «Сторінка товару» product block (Frame 1010107020, 4329:51357):
// a 627-px photo column and an 843-px info column 80 px apart inside
// the 1550 content width — reproduced as a 627fr/843fr grid so the two
// keep the master's proportions across the fluid shop layout.
//
// Info column rhythm (4329:51360): status line, 24, price row (52),
// 48, tab strip (54), 48, the active tab's content.

const TABS = [
  { id: "description", label: "Опис" },
  { id: "specs", label: "Характеристики" },
  { id: "scent", label: "Піраміда запаху" },
  { id: "delivery", label: "Доставка та оплата" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// Photo column. One image = the single square 627-px photo (4329:51358);
// several = the master's «Галерея» layout (4329:51496): a 627×413 main
// photo over a row of three square thumbnails, 16-px gaps, all r40. The
// thumbnails are the images that are NOT on the main stage, so with four
// photos the row is always three wide as drawn.
function Gallery({
  product,
  images,
  out,
}: {
  product: Product;
  images: string[];
  out: boolean;
}) {
  const [active, setActive] = useState(0);
  const multi = images.length > 1;
  const thumbs = images
    .map((src, i) => ({ src, i }))
    .filter(({ i }) => i !== active);

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`relative w-full overflow-clip rounded-[32px] bg-bg-product lg:rounded-[40px] ${
          multi ? "aspect-[627/413]" : "aspect-square"
        }`}
      >
        <img
          key={images[active]}
          src={images[active]}
          alt={product.title}
          fetchPriority="high"
          decoding="async"
          className={`absolute inset-0 size-full object-cover ${out ? "grayscale" : ""}`}
        />
        {/* Sale chip (4329:51644): brand pill 24 px from the top-right
            corner, 14/24 Bold label + 16-px tag glyph, 4-px gap. */}
        <SaleChip product={product} />
      </div>

      {multi && (
        <div className="grid grid-cols-3 gap-4">
          {thumbs.map(({ src, i }) => (
            <button
              key={src}
              type="button"
              aria-label={`Показати фото ${i + 1}`}
              onClick={() => setActive(i)}
              className="relative aspect-square cursor-pointer overflow-clip rounded-[24px] bg-bg-product transition-opacity duration-200 hover:opacity-80 lg:rounded-[40px]"
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 size-full object-cover ${out ? "grayscale" : ""}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// «Tabs linear» strip (4329:51380): 16-px padded labels in Button/Medium,
// a 1-px #d2d2d2 rule under the whole row and a 2-px brand underline
// on the active tab sitting on that rule. Below lg the strip scrolls
// sideways instead of wrapping.
function Tabs({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="relative mt-12 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-stroke-subtle">
      <div
        role="tablist"
        aria-label="Інформація про товар"
        className="relative z-[1] flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`product-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`product-panel-${t.id}`}
              onClick={() => onChange(t.id)}
              className={`shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-4 pb-[14px] pt-4 text-button-md transition-colors duration-200 ${
                selected
                  ? "border-brand text-brand"
                  : "border-transparent text-neutral-800 hover:text-brand"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// «Опис» (4329:51385): Title/Medium headings and Body/Medium copy in
// text/medium (#343435), 24-px stack, a disc list of benefits.
function DescriptionPanel({ details }: { details: ProductDetails }) {
  return (
    <div className="flex flex-col gap-6 text-neutral-800">
      <p className="text-title-md">Артикул: {details.sku}</p>
      <p className="text-body-sm">{details.description}</p>
      <p className="text-title-md">Переваги:</p>
      <ul className="list-disc ps-6 text-body-sm">
        {details.benefits.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

// «Характеристики» (4329:52376): ten label/value rows, values bold.
function SpecsPanel({ details }: { details: ProductDetails }) {
  return (
    <SpecTable
      rows={details.characteristics.map((r) => ({
        key: r.label,
        label: r.label,
        value: r.value,
      }))}
    />
  );
}

// «Піраміда запаху» (4329:52093): an intro line, then the three note
// levels with brand-orange glyphs (sparkles / heart / hexagon) in a
// 280-px label cell and the note list beside.
function ScentPanel({ details }: { details: ProductDetails }) {
  const levels = [
    { key: "top", label: "Верхні ноти", Icon: NoteTopIcon, value: details.scent.top },
    { key: "middle", label: "Середні ноти", Icon: NoteMiddleIcon, value: details.scent.middle },
    { key: "base", label: "Нижні ноти", Icon: NoteBaseIcon, value: details.scent.base },
  ];
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body-sm text-neutral-800">{details.scent.intro}</p>
      <SpecTable
        labelClassName="lg:w-[280px]"
        labelWeight="font-semibold"
        valueWeight="font-normal"
        rows={levels.map(({ key, label, Icon, value }) => ({
          key,
          label: (
            <span className="flex items-center gap-3">
              <Icon className="size-6 shrink-0 text-brand" />
              {label}
            </span>
          ),
          value,
        }))}
      />
    </div>
  );
}

// «Доставка та оплата» (4329:51876): two titled tables 40 px apart,
// bold labels and regular copy.
function DeliveryPanel({ details }: { details: ProductDetails }) {
  const groups = [
    { title: "Варіанти оплати", rows: details.payment },
    { title: "Варіанти доставки", rows: details.delivery },
  ];
  return (
    <div className="flex flex-col gap-10">
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-6">
          <p className="text-title-md text-neutral-800">{g.title}</p>
          <SpecTable
            labelWeight="font-semibold"
            valueWeight="font-normal"
            rows={g.rows.map((r) => ({ key: r.label, label: r.label, value: r.value }))}
          />
        </div>
      ))}
    </div>
  );
}

// `mode="b2b"` is the platform product page (Figma «PDP B2B» 4329:56628):
// the info column is 827 wide beside the 627 photo (1534 content), the
// status line carries the B2B states, the price row is «ваша ціна» ·
// hairline · stepper (4329:56656) and a «Під замовлення» product offers
// only «Схожі товари» (4329:57756); the block closes with 64 instead of 80.
export function ProductView({
  product,
  details,
  mode = "b2c",
}: {
  product: Product;
  details: ProductDetails;
  mode?: "b2c" | "b2b";
}) {
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<TabId>("description");
  const b2b = mode === "b2b";
  const out = b2b ? Boolean(product.preorder) || !product.available : !product.available;
  const { add } = useCart();

  return (
    <div
      className={`grid gap-10 pb-[60px] lg:gap-20 ${
        b2b ? "lg:grid-cols-[627fr_827fr] lg:pb-16" : "lg:grid-cols-[627fr_843fr] lg:pb-20"
      }`}
    >
      <Gallery product={product} images={details.images} out={out} />

      <div className="@container flex min-w-0 flex-col">
        <div className="flex flex-col gap-6">
          {b2b ? <B2BStatusLine product={product} /> : <StatusLine out={out} />}
          {/* Price row (4329:51368): price · hairline · stepper on the
              left, the CTA pair on the right. Out of stock (4329:51795)
              swaps the pair for a single «Схожі товари» button that
              jumps to the in-stock alternatives below.
              The info column is 843 wide on the 1710 master but 688 in
              the 1440 layout every laptop gets through the zoom cap;
              there the sale variant (price + struck price + stepper +
              two CTAs) is a few px too wide, so the container query
              tightens every gap to 12 and, if it still has to wrap, the
              CTAs drop to a second line kept flush right. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4 @max-[720px]:gap-x-3">
            {b2b ? (
              <B2BPriceAndQty
                product={product}
                qty={qty}
                onQty={setQty}
                className="@max-[720px]:gap-3"
              />
            ) : (
              <PriceAndQty
                product={product}
                qty={qty}
                onQty={setQty}
                out={out}
                className="@max-[720px]:gap-3"
              />
            )}
            {out ? (
              <Button href="#similar" size="responsive" className="ml-auto">
                Схожі товари
              </Button>
            ) : (
              <div className="ml-auto flex flex-wrap items-center gap-4 @max-[720px]:gap-3">
                {/* Both CTAs put the chosen quantity in the cart and open the
                    drawer; «Купити зараз» will jump straight to checkout
                    once that page exists. */}
                <Button
                  variant="outlinedDark"
                  size="responsive"
                  onClick={() => add(product.id, qty)}
                >
                  Купити зараз
                </Button>
                <Button size="responsive" onClick={() => add(product.id, qty)}>
                  Додати у кошик
                </Button>
              </div>
            )}
          </div>
        </div>

        <Tabs active={tab} onChange={setTab} />

        {/* Every panel is in the DOM (hidden when inactive) so each tab's
            aria-controls resolves to a real element. */}
        {TABS.map((t) => (
          <div
            key={t.id}
            role="tabpanel"
            id={`product-panel-${t.id}`}
            aria-labelledby={`product-tab-${t.id}`}
            hidden={t.id !== tab}
            className="mt-12"
          >
            {t.id === "description" && <DescriptionPanel details={details} />}
            {t.id === "specs" && <SpecsPanel details={details} />}
            {t.id === "scent" && <ScentPanel details={details} />}
            {t.id === "delivery" && <DeliveryPanel details={details} />}
          </div>
        ))}
      </div>
    </div>
  );
}
