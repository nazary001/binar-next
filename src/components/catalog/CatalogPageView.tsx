"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { CatalogClient } from "./CatalogClient";
import { CategoryBanners } from "./CategoryBanners";
import { SubcategoryCarousel } from "./SubcategoryCarousel";
import { ArrowBack } from "./icons";
import {
  directionCatalogHref,
  type CatalogDirection,
  type SubcategoryCard,
} from "./data";

// The three catalog pages in their two skins. The public (B2C) markup
// is the one the server pages always rendered; the B2B skin (Figma
// «Каталог :: B2B» 4329:56124 - «Напрям» 4329:56219 is the reference
// frame) takes over inside the platform shell once a partner is signed
// in: content blocks with their own 32-px vertical rhythm on the
// 40 / 32 side gutters of the 12-column «B2B Platform» grid, the «До
// каталогу» back crumb, the H2 title with its tagline, the «Мій
// асортимент» toggle and the B2B listing.
type PageKind =
  | { kind: "root" }
  | { kind: "direction"; dir: CatalogDirection }
  | { kind: "category"; dir: CatalogDirection; card: SubcategoryCard };

function BackCrumb({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4">
      <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
        <ArrowBack className="w-[20px]" />
      </span>
      <span className="text-[16px] font-semibold leading-[22px] tracking-[0.16px] text-neutral-800 transition-colors duration-300 group-hover:text-brand lg:text-[18px] lg:tracking-[0.18px]">
        {label}
      </span>
    </Link>
  );
}

function Slash() {
  return <span className="text-[18px] font-semibold leading-[22px] text-stroke-subtle">/</span>;
}

function Crumb({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
    >
      {label}
    </Link>
  );
}

function Current({ label }: { label: string }) {
  return <span className="text-button-md text-brand">{label}</span>;
}

// ---------------------------------------------------------------- B2C

function PublicView({ page }: { page: PageKind }) {
  const dir = page.kind === "root" ? undefined : page.dir;
  const card = page.kind === "category" ? page.card : undefined;
  const title = page.kind === "root" ? "Каталог" : page.kind === "direction" ? page.dir.title : page.card.label;

  return (
    <div className="px-6 sm:px-10 lg-shop-pad-x">
      <section className="flex flex-col gap-8 pt-12 lg:gap-12 lg:pt-[72px]">
        <div className="flex flex-wrap items-center gap-4">
          <BackCrumb href="/" label="Головна" />
          <Slash />
          {page.kind === "root" ? <Current label="Каталог" /> : <Crumb href="/catalog" label="Каталог" />}
          {dir && (
            <>
              <Slash />
              {card ? <Crumb href={directionCatalogHref(dir)} label={dir.title} /> : <Current label={dir.title} />}
            </>
          )}
          {card && (
            <>
              <Slash />
              <Current label={card.label} />
            </>
          )}
        </div>
        <h1 className="text-h1 text-neutral-900">{title}</h1>
      </section>

      {page.kind === "root" && (
        <section className="mt-12 lg:mt-20">
          <CategoryBanners />
        </section>
      )}
      {page.kind === "direction" && (
        <section className="mt-8 lg:mt-12">
          <SubcategoryCarousel direction={page.dir} />
        </section>
      )}
      {page.kind === "category" && (
        <section className="mt-12 lg:mt-20">
          <div className="relative h-[240px] w-full overflow-clip rounded-[32px] sm:h-[320px] lg:h-[640px] lg:rounded-[40px]">
            {page.card.bg && <span aria-hidden className="absolute inset-0" style={{ background: page.card.bg }} />}
            <img src={page.card.image} alt={page.card.label} fetchPriority="high" decoding="async" className="absolute inset-0 size-full object-cover" />
          </div>
        </section>
      )}

      <section className="mt-[60px] lg:mt-[148px]">
        <Suspense>
          <CatalogClient direction={dir} fixedSubcategory={card?.label} />
        </Suspense>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- B2B

// «Мій асортимент» — the Button/Large at the right of the title block
// (4329:56235). A toggle kept in the URL (?mine=1) so the listing,
// filters and pagination all read one source.
function AssortmentToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("mine") === "1";
  const toggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (active) params.delete("mine");
    else params.set("mine", "1");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  return (
    <Button
      type="button"
      size="responsive"
      variant={active ? "accent" : "solid"}
      aria-pressed={active}
      onClick={toggle}
      className="shrink-0"
    >
      Мій асортимент
    </Button>
  );
}

function PlatformTitle({
  crumb,
  title,
  tagline,
}: {
  crumb: ReactNode | null;
  title: string;
  tagline?: string;
}) {
  return (
    <section className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:gap-[10px] lg:py-8 lg:pl-10 lg:pr-8">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {crumb && <div className="flex flex-wrap items-center gap-4">{crumb}</div>}
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-9 tracking-[-0.64px] text-neutral-900 lg:text-[44px] lg:leading-[48px] lg:tracking-[-0.88px]">
            {title}
          </h1>
          {tagline && <p className="text-[14px] leading-6 text-neutral-500">{tagline}</p>}
        </div>
      </div>
      <Suspense>
        <AssortmentToggle />
      </Suspense>
    </section>
  );
}

function PlatformView({ page }: { page: PageKind }) {
  const dir = page.kind === "root" ? undefined : page.dir;
  const card = page.kind === "category" ? page.card : undefined;

  // Crumbs per frame: the root («Каталог :: картки товарів» 4329:56125)
  // has none (144-px title block), the direction (4329:56219) goes
  // «До каталогу / <напрям>», the category (4329:56314) «До каталогу /
  // <напрям> / <категорія>».
  const crumb =
    page.kind === "root" ? null : page.kind === "direction" ? (
      <>
        <BackCrumb href="/catalog" label="До каталогу" />
        <Slash />
        <Current label={page.dir.title} />
      </>
    ) : (
      <>
        <BackCrumb href="/catalog" label="До каталогу" />
        <Slash />
        <Crumb href={directionCatalogHref(page.dir)} label={page.dir.title} />
        <Slash />
        <Current label={page.card.label} />
      </>
    );

  const title = page.kind === "root" ? "Каталог" : page.kind === "direction" ? page.dir.title : page.card.label;
  const tagline =
    page.kind === "root"
      ? "Усі напрями, ціни вашого договору та швидке замовлення"
      : page.kind === "direction"
        ? page.dir.tagline
        : page.dir.title;

  return (
    <div className="flex flex-col">
      <PlatformTitle crumb={crumb} title={title} tagline={tagline} />

      {page.kind === "root" && (
        <section className="px-6 py-6 lg:py-8 lg:pl-10 lg:pr-8">
          <CategoryBanners gap="b2b" />
        </section>
      )}
      {page.kind === "direction" && (
        <section className="px-6 py-6 lg:px-2 lg:py-8">
          <SubcategoryCarousel direction={page.dir} pagers="inline" />
        </section>
      )}
      {page.kind === "category" && (
        <section className="px-6 py-6 lg:py-8 lg:pl-10 lg:pr-8">
          {/* «Категорія» 4329:56334: the 1534 x 640 rounded-40 hero. */}
          <div className="relative h-[240px] w-full overflow-clip rounded-[32px] sm:h-[320px] lg:h-[640px] lg:rounded-[40px]">
            {page.card.bg && <span aria-hidden className="absolute inset-0" style={{ background: page.card.bg }} />}
            <img src={page.card.image} alt={page.card.label} fetchPriority="high" decoding="async" className="absolute inset-0 size-full object-cover" />
          </div>
        </section>
      )}

      <section className="px-6 py-6 lg:py-8 lg:pl-10 lg:pr-8">
        <Suspense>
          <CatalogClient direction={dir} fixedSubcategory={card?.label} mode="b2b" />
        </Suspense>
      </section>
    </div>
  );
}

export function CatalogPageView({ page }: { page: PageKind }) {
  const { user } = useAuth();
  return user?.type === "b2b" ? <PlatformView page={page} /> : <PublicView page={page} />;
}
