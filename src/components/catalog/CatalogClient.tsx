"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiltersDrawer,
  FiltersSheet,
  type FilterParam,
  type FilterSection,
  type FilterState,
} from "./FiltersDrawer";
import { ProductCard, ProductRow } from "./ProductCard";
import { B2BProductCard, B2BProductRow } from "./B2BProductCard";
import { FIGMA_TEXT_BOX } from "./textBox";
import {
  CardViewIcon,
  ChevronDown16,
  ChevronSideIcon,
  ListViewIcon,
  XMarkIcon,
} from "./icons";
import { usePhone } from "@/components/ui/useMediaQuery";
import { SearchField } from "@/components/ui/SearchField";
import { FilterButton } from "@/components/ui/FilterButton";
import { AppliedChips } from "@/components/ui/AppliedChips";
import { SortMenu } from "@/components/ui/SortMenu";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { LoadMore } from "@/components/ui/LoadMore";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  BRANDS,
  CATALOG_DIRECTIONS,
  PAGE_SIZES,
  PRODUCT_TYPE_OPTIONS,
  SORT_OPTIONS,
  ZONE_OPTIONS,
  directionSubcategorySet,
  productsPlural,
  type CatalogDirection,
  type Product,
  type SortOption,
} from "./data";
import { useListingProducts } from "./CatalogRegistry";

// "N товарів" of the result counters (the count rolls, ui/RollingNumber.tsx).
const countPhrase = (n: number) => `${n} ${productsPlural(n)}`;

// Phone copy (mobile pass, catalog-b2c 2.10 / 2.14, S20).
const COPY = {
  found: "Знайдено",
  search: "Пошук по каталогу",
  list: "Товари",
  viewCards: "Вид картками",
  viewList: "Вид списком",
  emptyTitle: "За запитом нічого не знайдено.",
  emptyText: "Спробуйте змінити пошук або фільтри.",
  emptyReset: "Скинути пошук і фільтри",
} as const;

// Phones list 10 products per batch and append the next 10 in place
// (D3 / D4); the desktop pager pages by the page-size pill as today.
const PHONE_BATCH = 10;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Shared close-on-outside-press / Escape wiring for the small popovers.
// Escape hands focus back to `trigger` when it was inside the popover:
// the closed list turns inert, which would otherwise drop it to <body>.
function useDismiss(
  open: boolean,
  ref: React.RefObject<HTMLDivElement | null>,
  close: () => void,
  trigger: React.RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const el = ref.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = ref.current;
      const focus = document.activeElement;
      const inside = !!el && focus instanceof Node && el.contains(focus);
      close();
      if (inside) trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, close, trigger]);
}

// Moves focus to option `i` of a listbox (wrapping; -1 = the last).
function focusOptionIn(list: HTMLUListElement | null, i: number) {
  const els = [...(list?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
  if (els.length) els[((i % els.length) + els.length) % els.length].focus();
}

// Inline text-button dropdown used by «Сортування» and «Кількість
// товарів на сторінці» — the grey 16/22 Medium label («Сортування:»,
// #777779) + the Figma Text button (16/22 Medium #4a4a4c) with the exact
// 16-px chevron, opening the site's standard small white panel
// (rounded-2xl, stroke-subtle border, 240 ms fade+slide). The trigger is
// named by the visible label AND its value («Сортування: за
// популярністю», WCAG 2.5.3). The list follows the collapsible listbox
// pattern: Enter / Space / ArrowDown / ArrowUp open it on the selected
// option, arrows / Home / End move between options, Enter or a click
// selects, Escape / Tab / an outside press close it, and focus comes
// back to the trigger after a choice or Escape.
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  // Option to focus once the list is open (keyboard opening): the list
  // is inert while closed, so focus has to wait for the commit.
  const pendingFocus = useRef<number | null>(null);
  const id = useId();
  const labelId = `${id}-label`;
  const buttonId = `${id}-button`;
  const listId = `${id}-list`;
  useDismiss(open, ref, () => setOpen(false), triggerRef);

  useEffect(() => {
    if (!open || pendingFocus.current === null) return;
    focusOptionIn(listRef.current, pendingFocus.current);
    pendingFocus.current = null;
  }, [open]);

  const selected = Math.max(0, options.indexOf(value));
  const openOnSelected = () => {
    if (open) focusOptionIn(listRef.current, selected);
    else {
      pendingFocus.current = selected;
      setOpen(true);
    }
  };
  const choose = (opt: T) => {
    onSelect(opt);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-1">
      {/* Label and value take their whole-pixel Figma boxes («Сортування:»
          99, «за популярністю» 147, «Кількість товарів на сторінці:»
          225, «20» 38), so the right-aligned row starts on the Figma x. */}
      <span id={labelId} style={FIGMA_TEXT_BOX} className="text-button-md text-neutral-500">
        {`${label}:`}
      </span>
      <div ref={ref} className="relative">
        <button
          ref={triggerRef}
          id={buttonId}
          type="button"
          style={FIGMA_TEXT_BOX}
          aria-labelledby={`${labelId} ${buttonId}`}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          onClick={(e) => {
            // detail 0 = a keyboard click (Enter / Space): open on the
            // selected option so the arrows work straight away.
            if (!open && e.detail === 0) openOnSelected();
            else setOpen((v) => !v);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              openOnSelected();
            } else if (e.key === "Tab" && open) {
              setOpen(false);
            }
          }}
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
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            aria-hidden={!open}
            inert={!open}
            onKeyDown={(e) => {
              const els = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]')];
              const i = els.indexOf(document.activeElement as HTMLButtonElement);
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                focusOptionIn(e.currentTarget, i + (e.key === "ArrowDown" ? 1 : -1));
              } else if (e.key === "Home" || e.key === "End") {
                e.preventDefault();
                focusOptionIn(e.currentTarget, e.key === "Home" ? 0 : -1);
              } else if (e.key === "Tab") {
                setOpen(false);
              }
            }}
            className={`min-w-[180px] rounded-2xl border border-stroke-subtle bg-white p-2 shadow-lg transition-[opacity,translate] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,translate] ${
              open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
            }`}
          >
            {options.map((opt) => (
              <li key={String(opt)} role="presentation">
                <button
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={opt === value}
                  onClick={() => choose(opt)}
                  className={`block w-full cursor-pointer rounded-xl px-4 py-2 text-left text-button-md transition-colors duration-200 hover:text-brand focus-visible:text-brand ${
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
    </div>
  );
}

// Search + view controls + applied-filter chips + results/sorting row +
// product grid + pagination — Figma frames 1010106935/1010106936 and
// the filters-applied state (4329:39587) wired to local state over the
// placeholder product list. The three filter groups live in the URL
// (?zone=…&type=…&brand=…, repeated) so the state is shareable; OR
// inside a group, AND across groups. With a `direction` (the
// /catalog/<slug> pages, Figma «Напрям» 4329:39333) the product pool is
// scoped to that direction's categories first. `fixedSubcategory` (the
// /catalog/<dir>/<category> pages, Figma «Категорія» 4329:39403) pins
// the listing to ONE category; its sheet still carries all three groups
// (4329:39472 / B2B 4329:56409).
// `mode="b2b"` is the signed-in platform listing (Figma «Каталог ::
// B2B» 4329:56124): B2B cards with the wholesale / retail / partner
// prices, rows 80 px apart on a 32-px block padding. The light #e8e8e9
// view switcher is the same in both modes (designer 2026-11-11).
export function CatalogClient({
  direction,
  fixedSubcategory,
  mode = "b2c",
}: {
  direction?: CatalogDirection;
  fixedSubcategory?: string;
  mode?: "b2c" | "b2b";
}) {
  const b2b = mode === "b2b";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [sort, setSort] = useState<SortOption>(SORT_OPTIONS[0]);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Stable: the sheet's modal effect depends on it (a new function per
  // render would re-run it on every checkbox tick and bounce focus).
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const gridTopRef = useRef<HTMLDivElement | null>(null);
  // Phones (< 640): one-column list with load-more batches, the phone
  // filters sheet. False on the server and in the hydration pass, so the
  // first paint is the desktop slice (items 1-10 are the same in both).
  const phone = usePhone();
  const [shown, setShown] = useState(PHONE_BATCH);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const phoneListId = `${useId()}-products`;

  // The vocabulary each group accepts in this context; unknown values
  // in a hand-edited URL are dropped.
  const vocab = useMemo<Record<FilterParam, readonly string[]>>(
    () => ({
      zone: direction ? direction.facet.options : ZONE_OPTIONS,
      type: direction ? direction.productFilters : PRODUCT_TYPE_OPTIONS,
      brand: BRANDS,
    }),
    [direction],
  );
  const active = useMemo<Record<FilterParam, string[]>>(() => {
    const read = (param: FilterParam) =>
      [...new Set(searchParams.getAll(param))].filter((v) => vocab[param].includes(v));
    return { zone: read("zone"), type: read("type"), brand: read("brand") };
  }, [searchParams, vocab]);
  const hasFilters =
    active.zone.length > 0 || active.type.length > 0 || active.brand.length > 0;

  // A filter change (menu deep-link, chip removal, brand toggle) resets
  // pagination — render-phase adjustment, same pattern as Header.
  const paramsKey = searchParams.toString();
  const [prevParamsKey, setPrevParamsKey] = useState(paramsKey);
  if (prevParamsKey !== paramsKey) {
    setPrevParamsKey(paramsKey);
    setPage(1);
    setShown(PHONE_BATCH);
  }

  const applyFilters = (next: Record<FilterParam, string[]>) => {
    const params = new URLSearchParams();
    (["zone", "type", "brand"] as const).forEach((param) =>
      next[param].forEach((v) => params.append(param, v)),
    );
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const directionSubs = useMemo(
    () => (direction ? directionSubcategorySet(direction) : null),
    [direction],
  );

  // Sheet sections per context, mirroring the three Figma «Фільтри»
  // sheets (Готель 4329:39542 / ЗІЗ 4329:39659 / Прибирання
  // 4329:39692): on direction AND category pages the direction's facet
  // (готельні зони / промислові ризики та галузі / зони клінінгу), its
  // «Товари» checklist and the manufacturers. The root /catalog has no
  // direction context: every direction's «Товари» + the manufacturers.
  const filterSections = useMemo<FilterSection[]>(() => {
    const out: FilterSection[] = [];
    if (direction) {
      out.push({ title: direction.facet.title, param: "zone", options: direction.facet.options });
      out.push({ title: "Товари", param: "type", options: direction.productFilters });
    } else {
      out.push({
        title: "Товари",
        param: "type",
        options: [...new Set(CATALOG_DIRECTIONS.flatMap((d) => d.productFilters))],
      });
    }
    out.push({ title: "Виробник", param: "brand", options: [...BRANDS] });
    return out;
  }, [direction]);

  const toggleFilter = (param: FilterParam, value: string) => {
    const current = active[param];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    applyFilters({ ...active, [param]: next });
  };

  // Every listing product, in listing order (the registry the root layout
  // primed from the database; the same array on every render, and the
  // request's own snapshot in the server pass).
  const pool = useListingProducts();

  // The pool after the filters + the search (unsorted). Also counts the
  // phone sheet's DRAFT for its «Знайдено N товарів» status.
  const match = useCallback(
    (f: FilterState) => {
      const q = query.trim().toLowerCase();
      let base = directionSubs
        ? pool.filter((p) => directionSubs.has(p.subcategory))
        : pool;
      if (fixedSubcategory) {
        base = base.filter((p) => p.subcategory === fixedSubcategory);
      }
      if (f.zone.length > 0) {
        base = base.filter((p) => p.zone !== undefined && f.zone.includes(p.zone));
      }
      if (f.type.length > 0) {
        base = base.filter(
          (p) => p.productType !== undefined && f.type.includes(p.productType),
        );
      }
      if (f.brand.length > 0) {
        base = base.filter((p) => f.brand.includes(p.brand));
      }
      if (q) base = base.filter((p) => p.title.toLowerCase().includes(q));
      return base;
    },
    [pool, query, directionSubs, fixedSubcategory],
  );
  const countFor = useCallback((f: FilterState) => match(f).length, [match]);

  const filtered = useMemo(() => {
    const base = match(active);
    if (sort === "за назвою") {
      return [...base].sort((a, b) => a.title.localeCompare(b.title, "uk"));
    }
    if (sort === "за ціною") {
      return [...base].sort((a, b) => a.price - b.price);
    }
    return base;
  }, [match, sort, active]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);
  const rows = chunk(paged, 4);

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

  const appliedChips = (["zone", "type", "brand"] as const).flatMap((kind) =>
    active[kind].map((value) => ({ kind, value })),
  );

  const removeChip = (chip: { kind: FilterParam; value: string }) => {
    applyFilters({
      ...active,
      [chip.kind]: active[chip.kind].filter((v) => v !== chip.value),
    });
  };

  const clearFilters = () => applyFilters({ zone: [], type: [], brand: [] });

  // ---- phone helpers
  const phoneItems = filtered.slice(0, shown);
  const resetAll = () => {
    setQuery("");
    setShown(PHONE_BATCH);
    if (hasFilters) clearFilters();
  };
  // After «Показати» (the sheet has closed and committed): bring the
  // toolbar back under the 66-px bar when the list shrank under it.
  const showToolbar = () => {
    requestAnimationFrame(() => {
      const el = toolbarRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top >= 66) return;
      window.scrollTo({ top: top + window.scrollY - 66 - 16, behavior: "instant" });
    });
  };
  // LoadMore focus target: the title link of the first newly shown item
  // (index = the count shown when the tap happened).
  const firstNewLink = (from: number) => () =>
    document.getElementById(phoneListId)?.children[from]?.querySelector<HTMLElement>("h3 a") ?? null;

  return (
    <>
      {/* === Search row (Figma 3677:39763): the field spans exactly one
          banner column; the icon controls sit at the right edge. === */}
      {/* Phones (C-47, TR-10): ONE row = the search field (flex-1) + the
          52 view toggle disc + the 52 filter disc with its count badge,
          gap 8 (152 / 222 px of search at 320 / 390). The SearchField
          atom keeps today's input string; its phone clear button and the
          role=search form are invisible changes on desktop. */}
      <div ref={toolbarRef} className="flex items-center gap-2 lg:justify-between lg:gap-4">
        <SearchField
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(1);
            setShown(PHONE_BATCH);
          }}
          label={COPY.search}
          // The partner's pill is transparent: on the desktop cabinet slab
          // the grey shows through it (4329:56125); the phone page is white.
          surface={b2b ? "none" : "white"}
          className={`min-w-0 flex-1 lg:min-w-auto lg:flex-initial ${b2b ? "lg:w-[495px]" : "lg:w-[calc((100%-64px)/3)]"}`}
        />

        <div className="flex items-center gap-2 lg:gap-4">
          {/* Card/list view switch — the «Switcher» (3917:35178, linked by
              the designer on 2026-11-11 as 4329:39608): a light #e8e8e9
              (Colour/Neutral/50) 32-px-radius pill holding two 52-px icon
              buttons, the same for visitors, retail customers and
              partners (it was black with white glyphs for B2C). Active =
              brand fill with a white glyph (Icons/Inverted); inactive =
              #777779 glyph (Icons/Subtle), brand on hover. */}
          <div className="flex items-center rounded-[32px] bg-[#e8e8e9] max-lg:hidden">
            <button
              type="button"
              aria-label="Вид картками"
              aria-pressed={view === "cards"}
              onClick={() => setView("cards")}
              className={`flex size-[52px] cursor-pointer items-center justify-center rounded-[26px] transition-colors duration-200 ${
                view === "cards" ? "bg-brand text-white" : "text-neutral-500 hover:text-brand"
              }`}
            >
              <CardViewIcon className="size-6" />
            </button>
            <button
              type="button"
              aria-label="Вид списком"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`flex size-[52px] cursor-pointer items-center justify-center rounded-[26px] transition-colors duration-200 ${
                view === "list" ? "bg-brand text-white" : "text-neutral-500 hover:text-brand"
              }`}
            >
              <ListViewIcon className="size-6" />
            </button>
          </div>

          {/* Phones: ONE outlined 52 disc (the master icon button
              3117:12801) showing the OTHER view; its label names the
              action, so no aria-pressed. After the desktop pill in the
              DOM (scripts that take the first «Вид списком» get the
              desktop one there). Hidden with no results. */}
          {filtered.length > 0 && (
            <button
              type="button"
              aria-label={view === "cards" ? COPY.viewList : COPY.viewCards}
              onClick={() => setView(view === "cards" ? "list" : "cards")}
              className="flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-[26px] border border-neutral-900 bg-white text-neutral-900 transition-colors duration-200 active:bg-bg-subtle motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:hidden"
            >
              {view === "cards" ? <ListViewIcon className="size-6" /> : <CardViewIcon className="size-6" />}
            </button>
          )}

          {/* Filter button — opens the filters drawer (Figma «Фільтри ::
              Готель», 3685:53426); on phones the full-screen sheet, with
              the applied-filter count badge (A11). */}
          <FilterButton
            count={appliedChips.length}
            expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          />
        </div>
      </div>

      {/* === Applied filters (Figma 4329:39611): removable 36-px chips
          48 px below the search row + «Скинути фільтрацію», gap-16
          (px-15 + the 1-px border = the master's px-16, stroke inside:
          «Allegrini» = 117). === */}
      {/* Phones: the A11 chips 16 under the search row (14/20, one line
          with an ellipsis inside a 44 hit box). */}
      <AppliedChips
        chips={appliedChips.map((chip) => ({
          key: `${chip.kind}-${chip.value}`,
          label: chip.value,
          onRemove: () => removeChip(chip),
        }))}
        onReset={clearFilters}
        className="mt-4 lg:hidden"
      />
      {hasFilters && (
        <div className="mt-8 flex flex-wrap items-center gap-4 max-lg:hidden lg:mt-12">
          {appliedChips.map((chip) => (
            <button
              key={`${chip.kind}-${chip.value}`}
              type="button"
              onClick={() => removeChip(chip)}
              aria-label={`Прибрати фільтр «${chip.value}»`}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-[60px] border border-stroke-default px-[15px] text-button-md text-neutral-900 transition-colors duration-200 hover:border-brand hover:text-brand"
            >
              {chip.value}
              <XMarkIcon className="size-4 shrink-0" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="flex cursor-pointer items-center gap-[2px] text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
          >
            Скинути фільтрацію
            <XMarkIcon className="size-4 shrink-0" />
          </button>
        </div>
      )}

      {/* Phones: the T2 meta line 16 under the search row (or the chips),
          44 tall: the count 14/20 #777779 left (not announced while the
          sheet is open: its own status line speaks), the SortMenu right
          (anchored to this relative row). No per-page control (D4).
          gap-x-2: at 320 a 1-2 digit count (129 px) + the trigger (132)
          share the 272 row; a 3-digit count wraps the trigger right. */}
      <div className="relative mt-4 flex min-h-11 flex-wrap items-center justify-between gap-x-2 gap-y-2 lg:hidden">
        <p aria-live={drawerOpen ? "off" : "polite"} className="whitespace-nowrap text-[14px] leading-5 text-neutral-500">
          {COPY.found} <RollingNumber value={filtered.length} format={countPhrase} />
        </p>
        {filtered.length > 0 && (
          <SortMenu
            value={sort}
            options={SORT_OPTIONS.map((o) => ({ value: o, label: o }))}
            onChange={(v) => {
              setSort(v as SortOption);
              setPage(1);
              setShown(PHONE_BATCH);
            }}
            className="ml-auto"
          />
        )}
      </div>

      {/* === Results / sorting row (Figma 3677:39714), 48 px below. === */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 max-lg:hidden lg:mt-12">
        <p className="text-button-md text-neutral-900">
          {COPY.found} <RollingNumber value={filtered.length} format={countPhrase} />
        </p>
        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
          <TextDropdown
            label="Сортування"
            value={sort}
            options={SORT_OPTIONS}
            onSelect={(v) => {
              setSort(v);
              setPage(1);
            }}
          />
          {/* «Line 2» (B2C 4329:39212, B2B 4329:56157) takes no width in the
              Figma auto-layout (0 x 24, 24-px gaps either side, the
              group is 250 + 24 + 24 + 267 = 565); the 1-px stroke is
              drawn from its x without pushing the sort group left. */}
          <span aria-hidden className="relative hidden h-6 w-0 lg:block">
            <span className="absolute inset-y-0 left-0 w-px bg-stroke-subtle" />
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

      {/* === Products (Figma 1010106936 / 3677:39269): the card view is
          rows of three separated by full-height hairlines centred in
          80-px gutters with 80 px between rows; the list view stacks
          full-width horizontal cards, each closed by a #d2d2d2
          hairline. Pagination sits centred 80 px below either. === */}
      {/* B2B («Напрям» 4329:56219 / «Каталог :: список» 4329:56549): the
          toolbar block ends 32 px under the results row; the grid block
          opens with 32 px (rows 80 apart, the pager 80 under the last
          row, 32 at the bottom - carried by the page block), the list
          block with 80 (rows of 224, the pager 80 under, 80 at the
          bottom). */}
      <div
        ref={gridTopRef}
        // Phones: the list starts 24 under the meta line; load-more 48
        // under the list; 60 to the public footer (B2C) / the section's
        // 48 to the legal bar (B2B). Every lg:pt-* / lg:pb-* is today's.
        className={`flex scroll-mt-[96px] flex-col gap-12 pt-6 lg:gap-20 ${
          b2b
            ? view === "list"
              ? "pb-0 lg:pb-12 lg:pt-28"
              : "pb-0 lg:pt-16"
            : "pb-[60px] lg:pb-20 lg:pt-20"
        }`}
      >
        {paged.length === 0 ? (
          <>
            <p className="text-body-md text-neutral-500 max-lg:hidden">
              За запитом нічого не знайдено. Спробуйте змінити пошук або фільтри.
            </p>
            {/* Phones: TR-24 empty state on the page, the in-place reset
                solid (no other solid primary in view). */}
            <EmptyState
              title={COPY.emptyTitle}
              text={COPY.emptyText}
              action={
                query.trim() || hasFilters ? (
                  <Button size="small" onClick={resetAll}>
                    {COPY.emptyReset}
                  </Button>
                ) : undefined
              }
              className="lg:hidden"
            />
          </>
        ) : phone ? (
          // Phones: ONE column of D3 cards 24 apart, or the compact rows
          // between 1-px #d2d2d2 lines; keyed by product id, so a batch
          // appends without remounting the items above.
          <ul
            id={phoneListId}
            role="list"
            aria-label={COPY.list}
            className={view === "list" ? "flex flex-col border-t border-stroke-subtle" : "flex flex-col gap-6"}
          >
            {phoneItems.map((product) => (
              <li key={product.id}>
                {view === "list" ? (
                  b2b ? (
                    <B2BProductRow product={product} />
                  ) : (
                    <ProductRow product={product} />
                  )
                ) : b2b ? (
                  <B2BProductCard product={product} />
                ) : (
                  <ProductCard product={product} />
                )}
              </li>
            ))}
          </ul>
        ) : view === "list" ? (
          <div className="flex flex-col">
            {paged.map((product: Product, i) =>
              b2b ? (
                <B2BProductRow key={`${product.id}-${i}`} product={product} />
              ) : (
                <ProductRow key={`${product.id}-${i}`} product={product} />
              ),
            )}
          </div>
        ) : (
          // The server / hydration pass of a phone renders this desktop
          // slice before usePhone() resolves: its phone gaps equal the
          // phone list's 24 (catalog-b2c 2.11), so nothing jumps.
          <div className="flex flex-col gap-6 lg:gap-20">
          {rows.map((row, ri) => (
            <div
              key={`${current}-${ri}`}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:flex lg:gap-[39.5px]"
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
                    {b2b ? (
                      <B2BProductCard product={product} />
                    ) : (
                      <ProductCard product={product} />
                    )}
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
        )}

        {/* Phones: load-more instead of the pager (D4, blog 3176:5601):
            the counter + «Показати більше», 48 under the list; gone once
            everything is shown. */}
        {phone && paged.length > 0 && (
          <LoadMore
            shown={phoneItems.length}
            total={filtered.length}
            onMore={() => setShown((n) => n + PHONE_BATCH)}
            focusAfterLast={firstNewLink(phoneItems.length)}
            className="lg:hidden"
          />
        )}

        {pages > 1 && (
          <nav
            aria-label="Сторінки каталогу"
            className="flex flex-wrap items-center justify-center gap-1 self-center max-lg:hidden sm:gap-[10px]"
          >
            <button
              type="button"
              aria-label="Попередня сторінка"
              disabled={current === 1}
              onClick={() => goTo(current - 1)}
              className="flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400 sm:size-[52px]"
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
                className={`flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-[18px] font-semibold leading-[22px] tracking-[0.18px] transition-colors duration-200 sm:size-[52px] ${
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
              className="flex size-10 cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:text-brand disabled:cursor-default disabled:text-neutral-400 sm:size-[52px]"
            >
              <ChevronSideIcon mirrored className="size-6" />
            </button>
          </nav>
        )}
      </div>

      <FiltersDrawer
        open={drawerOpen && !phone}
        onClose={closeDrawer}
        sections={filterSections}
        active={active}
        onToggle={toggleFilter}
        onReset={clearFilters}
      />
      {/* Phones: the full-screen sheet with the draft model (T5a). */}
      <FiltersSheet
        open={drawerOpen && phone}
        onClose={closeDrawer}
        sections={filterSections}
        active={active}
        onApply={applyFilters}
        countFor={countFor}
        onShow={showToolbar}
      />
    </>
  );
}
