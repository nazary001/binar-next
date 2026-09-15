import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPageView } from "@/components/catalog/CatalogPageView";
import { CATALOG_DIRECTIONS, findCategory } from "@/components/catalog/data";

export function generateStaticParams() {
  return CATALOG_DIRECTIONS.flatMap((d) =>
    d.carousel.map((c) => ({ direction: d.slug, category: c.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ direction: string; category: string }>;
}): Promise<Metadata> {
  const { direction, category } = await params;
  const dir = CATALOG_DIRECTIONS.find((d) => d.slug === direction);
  const card = dir && findCategory(dir, category);
  if (!dir || !card) return {};
  return {
    title: `${card.label} — ${dir.title}`,
    description: `${card.label} у каталозі Binar 2000 (${dir.title.toLowerCase()}). B2B-постачання з кастомізацією під бренд.`,
    alternates: {
      canonical: `/catalog/${dir.slug}/${card.slug}`,
    },
  };
}

// Figma «Категорія» (3685:48403): the subcategory landing inside a
// direction — a four-level breadcrumb (Головна / Каталог / <напрям> /
// <категорія>), the subcategory H1, a full-content-width 640-px
// rounded hero photo (the subcategory's own image band-cropped), then
// the product listing pinned to this subcategory 148 px below.
// Signed-in partners get the B2B skin instead - see CatalogPageView.
export default async function CatalogCategoryPage({
  params,
}: {
  params: Promise<{ direction: string; category: string }>;
}) {
  const { direction, category } = await params;
  const dir = CATALOG_DIRECTIONS.find((d) => d.slug === direction);
  const card = dir ? findCategory(dir, category) : undefined;
  if (!dir || !card) notFound();

  return <CatalogPageView page={{ kind: "category", dir, card }} />;
}
