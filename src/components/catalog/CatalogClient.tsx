"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiltersDrawer, type FilterSection } from "./FiltersDrawer";
import { ProductCard, ProductRow } from "./ProductCard";
import {
  CardViewIcon,
  ChevronDown16,
  ChevronSideIcon,
  FilterIcon,
  ListViewIcon,
  MagnifierIcon,
  XMarkIcon,
} from "./icons";
import {
  BRANDS,
  CATALOG_DIRECTIONS,
  PAGE_SIZES,
  PRODUCTS,
  SORT_OPTIONS,
  SUBCATEGORIES,
  directionSubcategorySet,
  productsPlural,
  type CatalogDirection,
  type Product,
  type SortOption,
} from "./data";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Shared close-on-outside-press / Escape wiring for the small popovers.
function useDismiss(
  open: boolean,
  ref: React.RefObject<HTMLDivElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const el = ref.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, close]);
}

// Inline text-button dropdown used by «Сортування» and «Кількість
// товарів на сторінці» — the Figma Text button (16/22 Medium #4a4a4c)
// with the exact 16-px chevron, opening the site's standard small white
// panel (rounded-2xl, stroke-subtle border, 240 ms fade+slide).
function TextDropdown<T extends string | number>({
  value,
  options,
  onSelect,
  label,
}: {
  value: T;
  options: readonly T[];
  onSelect: (v: T) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useDismiss(open, ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={`flex cursor-pointer items-center gap-[2px] text-button-md transition-colors duration-200 hover:text-brand ${
          open ? "text-brand" : "text-neutral-700"
        }`}
      >
        {value}
        <ChevronDown16
          className={`size-4 shrink-0 transition-[rotate] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`absolute right-0 top-full z-30 pt-3 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <ul
          role="listbox"
          aria-hidden={!open}
          inert={!open}
          className={`min-w-[180px] rounded-2xl border border-stroke-subtle bg-white p-2 shadow-lg transition-[opacity,translate] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,translate] ${
            open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
          }`}
        >
          {options.map((opt) => (
            <li key={String(opt)}>
              <button
                type="button"
                role="option"
                aria-selected={opt === value}
                onClick={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
                className={`block w-full cursor-pointer rounded-xl px-4 py-2 text-left text-button-md transition-colors duration-200 hover:text-brand ${
                  opt === value ? "text-brand" : "text-neutral-700"
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Search + view controls + applied-filter chips + results/sorting row +
// product grid + pagination — Figma frames 1010106935/1010106936 and
// the filters-applied state (3677:40553) wired to local state over the
// placeholder product list. The sub/brand filters live in the URL
// (?sub=…&brand=…) so mega-menu subcategory links deep-link into a
// pre-filtered catalog and the state is shareable. With a `direction`
// (the /catalog/<slug> pages, Figma «Напрям» 3682:46834) the product
// pool is scoped to that direction's subcategory vocabulary first.
// `fixedSubcategory` (the /catalog/<dir>/<category> pages, Figma
// «Категорія» 3685:48403) pins the listing to ONE subcategory — the
// page itself is the filter, so ?sub= params are ignored there and
// only the brand filter remains interactive.
export function CatalogClient({
  direction,
  fixedSubcategory,
}: {
  direction?: CatalogDirection;
  fixedSubcategory?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [sort, setSort] = useState<SortOption>(SORT_OPTIONS[0]);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const gridTopRef = useRef<HTMLDivElement | null>(null);

  const activeSubs = useMemo(
    () =>
      fixedSubcategory
        ? []
        : searchParams.getAll("sub").filter((s) => SUBCATEGORIES.includes(s)),
    [searchParams, fixedSubcategory],
  );
  const activeBrands = useMemo(
    () =>
      searchParams
        .getAll("brand")
        .filter((b) => (BRANDS as readonly string[]).includes(b)),
    [searchParams],
  );
  const hasFilters = activeSubs.length > 0 || activeBrands.length > 0;

  // A filter change (menu deep-link, chip removal, brand toggle) resets
  // pagination — render-phase adjustment, same pattern as Header.
  const paramsKey = searchParams.toString();
  const [prevParamsKey, setPrevParamsKey] = useState(paramsKey);
  if (prevParamsKey !== paramsKey) {
    setPrevParamsKey(paramsKey);
    setPage(1);
  }

  const applyFilters = (subs: string[], brands: string[]) => {
    const params = new URLSearchParams();
    subs.forEach((s) => params.append("sub", s));
    brands.forEach((b) => params.append("brand", b));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const directionSubs = useMemo(
    () => (direction ? directionSubcategorySet(direction) : null),
    [direction],
  );

  // Drawer sections adapt to the context, mirroring the three Figma
  // «Фільтри» frames (Готель 3685:53426 / ЗІЗ 3424:32503 / Прибирання
  // 3424:32651): each direction gets its context facet (готельні зони
  // / промислові ризики та галузі / зони клінінгу), its «Товари»
  // checklist and the manufacturers. Category pages pin their
  // subcategory (sub params are ignored there), so only the
  // manufacturer section stays.
  const filterSections = useMemo<FilterSection[]>(() => {
    const out: FilterSection[] = [];
    if (!fixedSubcategory) {
      if (direction) {
        out.push({
          title: direction.facet.title,
          param: "sub",
          options: direction.facet.options,
        });
        out.push({
          title: "Товари",
          param: "sub",
          options: direction.productFilters,
        });
      } else {
        out.push({
          title: "Товари",
          param: "sub",
          options: [
            ...new Set(CATALOG_DIRECTIONS.flatMap((d) => d.productFilters)),
          ],
        });
      }
    }
    out.push({ title: "Виробник", param: "brand", options: [...BRANDS] });
    return out;
  }, [direction, fixedSubcategory]);

  const toggleFilter = (param: "sub" | "brand", value: string) => {
    const current = param === "sub" ? activeSubs : activeBrands;
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    applyFilters(
      param === "sub" ? next : activeSubs,
      param === "brand" ? next : activeBrands,
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = directionSubs
      ? PRODUCTS.filter((p) => directionSubs.has(p.subcategory))
      : PRODUCTS;
    if (fixedSubcategory) {
      base = base.filter((p) => p.subcategory === fixedSubcategory);
    }
    if (activeSubs.length > 0) {
      base = base.filter((p) => activeSubs.includes(p.subcategory));
    }
    if (activeBrands.length > 0) {
      base = base.filter((p) => activeBrands.includes(p.brand));
    }
    if (q) base = base.filter((p) => p.title.toLowerCase().includes(q));
    if (sort === "за назвою") {
      return [...base].sort((a, b) => a.title.localeCompare(b.title, "uk"));
    }
    if (sort === "за ціною") {
      return [...base].sort((a, b) => a.price - b.price);
    }
    return base;
  }, [query, sort, activeSubs, activeBrands, directionSubs, fixedSubcategory]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);
  const rows = chunk(paged, 3);

  // Windowed page numbers — the Figma master shows five slots.
  const windowStart = Math.max(1, Math.min(current - 2, pages - 4));
  const numbers = Array.from(
    { length: Math.min(5, pages) },
    (_, i) => windowStart + i,
  );

  const goTo = (p: number) => {
    setPage(p);
    gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const appliedChips = [
    ...activeSubs.map((value) => ({ kind: "sub" as const, value })),
    ...activeBrands.map((value) => ({ kind: "brand" as const, value })),
  ];

  const removeChip = (chip: { kind: "sub" | "brand"; value: string }) => {
    applyFilters(
      chip.kind === "sub"
        ? activeSubs.filter((s) => s !== chip.value)
        : activeSubs,
      chip.kind === "brand"
        ? activeBrands.filter((b) => b !== chip.value)
        : activeBrands,
    );
  };

  return (
    <>
      {/* === Search row (Figma 3677:39763): the field spans exactly one
          banner column; the icon controls sit at the right edge. === */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-[372px]">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Пошук"
            aria-label="Пошук по каталогу"
            className="h-[52px] w-full rounded-[50px] border border-stroke-default bg-white pl-4 pr-12 text-[16px] leading-6 text-neutral-900 outline-none transition-colors duration-200 placeholder:text-neutral-500 focus:border-neutral-800 [&::-webkit-search-cancel-button]:hidden"
          />
          <MagnifierIcon className="pointer-events-none absolute right-4 top-1/2 size-6 -translate-y-1/2 text-neutral-700" />
        </div>

        <div className="flex items-center gap-4">
          {/* Card/list view switch — a black 32-px-radius pill holding two
              52-px icon buttons; the active one fills brand-orange. */}
          <div className="flex items-center rounded-[32px] bg-neutral-900">
            <button
              type="button"
              aria-label="Вид картками"
              aria-pressed={view === "cards"}
              onClick={() => setView("cards")}
              className={`flex size-[52px] cursor-pointer items-center justify-center rounded-[26px] text-white transition-colors duration-200 ${
                view === "cards" ? "bg-brand" : "hover:text-white/70"
              }`}
            >
              <CardViewIcon className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Вид списком"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`flex size-[52px] cursor-pointer items-center justify-center rounded-[26px] text-white transition-colors duration-200 ${
                view === "list" ? "bg-brand" : "hover:text-white/70"
              }`}
            >
              <ListViewIcon className="size-6" />
            </button>
          </div>

          {/* Filter button — opens the filters drawer (Figma «Фільтри ::
              Готель», 3685:53426). */}
          <button
            type="button"
            aria-label="Фільтри"
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
            onClick={() => setDrawerOpen(true)}
            className="flex size-[52px] cursor-pointer items-center justify-center rounded-[26px] bg-neutral-900 text-white transition-opacity duration-200 hover:opacity-85"
          >
            <FilterIcon className="size-6" />
          </button>
        </div>
      </div>

      {/* === Applied filters (Figma 3677:40579): removable chips 48 px
          below the search row + «Скинути фільтрацію», gap-16. === */}
      {hasFilters && (
        <div className="mt-8 flex flex-wrap items-center gap-4 lg:mt-12">
          {appliedChips.map((chip) => (
            <button
              key={`${chip.kind}-${chip.value}`}
              type="button"
              onClick={() => removeChip(chip)}
              aria-label={`Прибрати фільтр «${chip.value}»`}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-[60px] border border-stroke-default px-4 text-button-md text-neutral-900 transition-colors duration-200 hover:border-brand hover:text-brand"
            >
              {chip.value}
              <XMarkIcon className="size-4 shrink-0" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyFilters([], [])}
            className="flex cursor-pointer items-center gap-[2px] text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
          >
            Скинути фільтрацію
            <XMarkIcon className="size-4 shrink-0" />
          </button>
        </div>
      )}

      {/* === Results / sorting row (Figma 3677:39714), 48 px below. === */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 lg:mt-12">
        <p className="text-button-md text-neutral-900">
          Знайдено {filtered.length} {productsPlural(filtered.length)}
        </p>
        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-1">
            <span className="text-button-md text-neutral-500">
              Сортування:
            </span>
            <TextDropdown
              label="Сортування"
              value={sort}
              options={SORT_OPTIONS}
              onSelect={(v) => {
                setSort(v);
                setPage(1);
              }}
            />
          </div>
          <span
            aria-hidden
            className="hidden h-6 w-px bg-stroke-subtle lg:block"
          />
          <div className="flex items-center gap-1">
            <span className="text-button-md text-neutral-500">
              Кількість товарів на сторінці:
            </span>
            <TextDropdown
              label="Кількість товарів на сторінці"
              value={pageSize}
              options={PAGE_SIZES}
              onSelect={(v) => {
                setPageSize(v);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* === Products (Figma 1010106936 / 3677:39269): the card view is
          rows of three separated by full-height hairlines centred in
          80-px gutters with 80 px between rows; the list view stacks
          full-width horizontal cards, each closed by a #d2d2d2
          hairline. Pagination sits centred 80 px below either. === */}
      <div
        ref={gridTopRef}
        className="flex scroll-mt-[96px] flex-col gap-12 pb-[60px] pt-12 lg:gap-20 lg:pb-20 lg:pt-20"
      >
        {paged.length === 0 ? (
          <p className="text-body-md text-neutral-500">
            За запитом нічого не знайдено. Спробуйте змінити пошук або
            фільтри.
          </p>
        ) : view === "list" ? (
          <div className="flex flex-col">
            {paged.map((product: Product, i) => (
              <ProductRow key={`${product.id}-${i}`} product={product} />
            ))}
          </div>
        ) : (
          rows.map((row, ri) => (
            <div
              key={`${current}-${ri}`}
              className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:flex lg:gap-10"
            >
              {row.map((product: Product, ci) => (
                <Fragment key={`${product.id}-${ci}`}>
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
              {/* Invisible fillers keep a short last row on the 3-column
                  rhythm instead of stretching its cards wide. */}
              {row.length < 3 &&
                Array.from({ length: 3 - row.length }, (_, i) => (
                  <Fragment key={`filler-${i}`}>
                    <div aria-hidden className="hidden w-px shrink-0 lg:block" />
                    <div aria-hidden className="hidden min-w-0 lg:block lg:flex-1" />
                  </Fragment>
                ))}
            </div>
          ))
        )}

        {pages > 1 && (
          <nav
            aria-label="Сторінки каталогу"
            className="flex flex-wrap items-center justify-center gap-[10px] self-center"
          >
            <button
              type="button"
              aria-label="Попередня сторінка"
              disabled={current === 1}
              onClick={() => goTo(current - 1)}
              className="flex size-[52px] cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400"
            >
              <ChevronSideIcon className="size-6" />
            </button>
            {numbers.map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Сторінка ${n}`}
                aria-current={n === current ? "page" : undefined}
                onClick={() => goTo(n)}
                className={`flex size-[52px] cursor-pointer items-center justify-center rounded-[26px] text-[18px] font-semibold leading-[22px] tracking-[0.18px] transition-colors duration-200 ${
                  n === current
                    ? "bg-brand text-white"
                    : "text-neutral-900 hover:text-brand"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              aria-label="Наступна сторінка"
              disabled={current === pages}
              onClick={() => goTo(current + 1)}
              className="flex size-[52px] cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400"
            >
              <ChevronSideIcon mirrored className="size-6" />
            </button>
          </nav>
        )}
      </div>

      <FiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sections={filterSections}
        activeSubs={activeSubs}
        activeBrands={activeBrands}
        onToggle={toggleFilter}
        onReset={() => applyFilters([], [])}
      />
    </>
  );
}
