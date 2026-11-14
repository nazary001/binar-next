"use client";
/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { useCatalogAdd } from "@/components/catalog/phoneParts";
import { PriceAndQty, SaleChip, StatusLine } from "@/components/catalog/ProductCard";
import { B2BPriceAndQty, B2BStatusLine } from "@/components/catalog/B2BProductCard";
import { discountPercent, type Product } from "@/components/catalog/data";
import type { ProductDetails } from "./data";
import { SpecTable } from "./SpecTable";
import { NoteBaseIcon, NoteMiddleIcon, NoteTopIcon } from "./icons";
import { DotList } from "./phoneParts";
import { PhoneBuyBlock } from "./PhoneBuyBlock";
import { StickyBuyBar } from "./StickyBuyBar";

const COPY = {
  photo: "фото",
} as const;

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
//
// «Немає в наявності» / «Під замовлення» (4329:51786 / 4929:66198):
// «Rectangle 130», a #1d1d1f layer over the photo with mix-blend
// SATURATION - the photo keeps its luminance and hue and takes the
// layer's zero saturation, i.e. a full desaturation. The blend only
// sees the photo because every photo box is its own isolated group
// (`isolate`); without it the layer would blend with the page.
function Veil() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-neutral-900 mix-blend-saturation"
    />
  );
}

function Gallery({
  product,
  images,
  out,
  b2b,
}: {
  product: Product;
  images: string[];
  out: boolean;
  b2b: boolean;
}) {
  const [active, setActive] = useState(0);
  const multi = images.length > 1;
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Desktop: the tapped thumb leaves the row (its photo is now on the
  // stage), so focus moves to the thumb that took the previous photo
  // instead of falling to <body>. Phones keep every thumb: focus stays.
  const select = (i: number, from: HTMLButtonElement) => {
    const prev = active;
    setActive(i);
    if (document.activeElement !== from) return;
    requestAnimationFrame(() => {
      if (from.offsetParent === null) thumbRefs.current[prev]?.focus({ preventScroll: true });
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Phones (pdp 2.4, TR-30): one static stage switched by the thumbs,
          capped at 342 tall (272 square at 320, 382 x 342 at 430), the
          square studio photo contained on the #d5d5d5 box (never cropped). */}
      <div
        className={`relative isolate w-full overflow-clip rounded-[32px] bg-bg-product lg:rounded-[40px] ${
          multi
            ? "aspect-[627/413] max-lg:aspect-square max-lg:max-h-[342px]"
            : "aspect-square max-h-[342px] lg:max-h-none"
        }`}
      >
        <img
          key={images[active]}
          src={images[active]}
          alt={active === 0 ? product.title : `${product.title}, ${COPY.photo} ${active + 1}`}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover max-lg:object-contain"
        />
        {out && <Veil />}
        {/* Sale chip (4329:51644): brand pill 24 px from the top-right
            corner, 14/24 Bold label + 16-px tag glyph, 4-px gap. The
            B2B gallery (4329:57559) has no chip - partners see their
            own price, not the shop promotion. */}
        {!b2b && <SaleChip product={product} />}
      </div>

      {/* Thumbs: desktop shows the three photos NOT on the stage (the
          active one is lg:hidden); phones show all four as 64-px r16 tiles
          (62 at 320), the current one ringed (1-px #1d1d1f, 2-px offset). */}
      {multi && (
        <div className="flex flex-wrap gap-2 lg:grid lg:grid-cols-3 lg:gap-4">
          {images.map((src, i) => (
            <button
              key={src}
              ref={(el) => {
                thumbRefs.current[i] = el;
              }}
              type="button"
              aria-label={`Показати фото ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              onClick={(e) => select(i, e.currentTarget)}
              className={`relative isolate aspect-square w-[calc((100%-24px)/4)] max-w-16 cursor-pointer overflow-clip rounded-2xl bg-bg-product transition-opacity duration-200 hover:opacity-80 max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand max-lg:focus-visible:ring-offset-2 lg:w-auto lg:max-w-none lg:rounded-[40px] ${
                i === active ? "ring-1 ring-neutral-900 ring-offset-2 lg:hidden" : ""
              }`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover"
              />
              {out && <Veil />}
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
// Phones (pdp 2.7, TR-13): the same tablist as wrapping chips (the blog
// filter chips 3176:5478): 36 tall r60, 14/20 Medium, 8 apart, the active
// one brand-filled, the rest on a #8e8e8f ring; a 44-px hit area from the
// `after:` box. Keyboard (all widths, behaviour only): roving tabindex,
// arrows / Home / End move focus and select.
const TAB_PHONE =
  "max-lg:relative max-lg:inline-flex max-lg:h-9 max-lg:items-center max-lg:rounded-[60px] max-lg:border max-lg:px-[15px] max-lg:py-0 max-lg:text-[14px] max-lg:leading-5 max-lg:after:absolute max-lg:after:inset-x-0 max-lg:after:-inset-y-1 max-lg:focus-visible:outline-none max-lg:focus-visible:ring-2 max-lg:focus-visible:ring-brand max-lg:focus-visible:ring-offset-2";

function Tabs({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = TABS.findIndex((t) => t.id === active);
    const last = TABS.length - 1;
    const next =
      e.key === "ArrowRight"
        ? (at + 1) % TABS.length
        : e.key === "ArrowLeft"
          ? (at + last) % TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(TABS[next].id);
    refs.current[next]?.focus({ preventScroll: true });
  };
  return (
    <div className="relative mt-12 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-stroke-subtle max-lg:after:hidden">
      <div
        role="tablist"
        aria-label="Інформація про товар"
        onKeyDown={onKeyDown}
        className="relative z-[1] flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-lg:flex-wrap max-lg:gap-2 max-lg:overflow-visible"
      >
        {TABS.map((t, i) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`product-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`product-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(t.id)}
              className={`shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-4 pb-[14px] pt-4 text-button-md transition-colors duration-200 ${TAB_PHONE} ${
                selected
                  ? "border-brand text-brand max-lg:bg-brand max-lg:text-white"
                  : "border-transparent text-neutral-800 hover:text-brand max-lg:border-stroke-default"
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
// text/medium (#343435), 24-px stack, a disc list of benefits. The
// promotional-price frame's panel (4329:51674) opens straight with the
// description - no «Артикул» line - so `sku` is optional.
function DescriptionPanel({ details, sku }: { details: ProductDetails; sku: boolean }) {
  return (
    <div className="flex flex-col gap-6 text-neutral-800">
      {/* Phones show the SKU as the caption under the H1 (pdp 2.2). */}
      {sku && <p className="text-title-md max-lg:hidden">Артикул: {details.sku}</p>}
      <p className="text-body-sm">{details.description}</p>
      <p className="text-title-lg lg:text-title-md">Переваги:</p>
      <DotList items={details.benefits} className="list-disc ps-6 text-body-sm" />
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

// The notes cell of the scent table (4329:52112 / 4329:52295): «Items2»
// is a centred row, 4 px apart, of the notes («Component 3», Regular
// 16/24) and «Component 5» - an EMPTY 51 x 24 slot (nothing is drawn in
// it in either frame). One line: the notes hug their text and the slot
// follows 4 px after it (x 286 for the 282-px top notes). Two lines: the
// notes shrink to 428 px (515 - 32 - 4 - 51), wrap, and the slot sits
// at 432, centred on the 48-px text (y 12) in the 96-px row. A
// shrinkable auto-width text item reproduces both. «Component 6» of the
// one-line bottom row is the same text without the slot; the empty slot
// changes nothing visible there. Phones (stacked cells, no master) drop
// the slot.
function NotesValue({ text }: { text: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1">
      <span className="min-w-0">{text}</span>
      <span aria-hidden className="hidden h-6 w-[51px] shrink-0 lg:block" />
    </span>
  );
}

// «Піраміда запаху» (4329:52093, two-line notes 4329:52276): an intro
// line, then the three note levels with brand-orange glyphs (sparkles /
// heart / hexagon) in a 280-px label cell and the notes beside. Rows are
// 72 tall; when the notes wrap the row grows to 96 while the label cell
// stays top-aligned (the master's Items is items-start).
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
            <span className="flex items-center gap-3 max-lg:gap-2">
              <Icon className="size-6 shrink-0 text-brand max-lg:size-5" />
              {label}
            </span>
          ),
          value: <NotesValue text={value} />,
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
    <div className="flex flex-col gap-10 max-lg:gap-12">
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-6">
          <p className="text-title-lg text-neutral-800 lg:text-title-md">{g.title}</p>
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
  const { buyNow } = useCart();
  const catalogAdd = useCatalogAdd();
  const router = useRouter();
  // The in-flow phone CTA stack; the sticky buy bar observes it.
  const ctaRef = useRef<HTMLDivElement>(null);
  // The B2C promo frame (4329:51621) drops the «Артикул» line; the B2B
  // frames keep it for the same product (4329:57598).
  const showSku = b2b || discountPercent(product) === null;
  const onBuyNow = () => {
    if (buyNow(product.id, qty)) router.push("/checkout");
  };
  // Every «Додати у кошик» (desktop row, phone CTA, phone sticky bar)
  // adds without opening the cart: the product flies from the pressed
  // button into the header cart (phones: plus the «Додано у кошик» toast).
  const onAdd = (e: MouseEvent<HTMLElement>) => {
    catalogAdd(product.id, qty, { el: e.currentTarget, image: product.image });
  };

  // Phones: photo -> status 32 (gap-8; lg:gap-20 unchanged).
  return (
    <div
      className={`grid gap-8 pb-[60px] lg:gap-20 ${
        b2b ? "lg:grid-cols-[627fr_827fr] lg:pb-16" : "lg:grid-cols-[627fr_843fr] lg:pb-20"
      }`}
    >
      <Gallery
        product={product}
        images={b2b ? details.platformImages : details.images}
        out={out}
        b2b={b2b}
      />

      <div className="@container flex min-w-0 flex-col">
        <PhoneBuyBlock
          product={product}
          mode={mode}
          out={out}
          qty={qty}
          onQty={setQty}
          onBuyNow={onBuyNow}
          onAdd={onAdd}
          ctaRef={ctaRef}
        />
        <div className="flex flex-col gap-6 max-lg:hidden">
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
                {/* «Додати у кошик» puts the chosen quantity in the cart
                    without opening it: the product flies into the header
                    cart (designer 2026-11-11); «Купити зараз» adds it
                    silently and goes to /checkout through the cart's stock
                    check (a sold-out line opens the stock modal instead). */}
                <Button variant="outlinedDark" size="responsive" onClick={onBuyNow}>
                  Купити зараз
                </Button>
                <Button size="responsive" onClick={onAdd}>
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
            {t.id === "description" && <DescriptionPanel details={details} sku={showSku} />}
            {t.id === "specs" && <SpecsPanel details={details} />}
            {t.id === "scent" && <ScentPanel details={details} />}
            {t.id === "delivery" && <DeliveryPanel details={details} />}
          </div>
        ))}
      </div>

      {!out && <StickyBuyBar product={product} mode={mode} qty={qty} onAdd={onAdd} ctaRef={ctaRef} />}
    </div>
  );
}
