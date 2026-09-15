import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPageView } from "@/components/catalog/CatalogPageView";
import { CATALOG_DIRECTIONS } from "@/components/catalog/data";

export function generateStaticParams() {
  return CATALOG_DIRECTIONS.map((d) => ({ direction: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ direction: string }>;
}): Promise<Metadata> {
  const { direction } = await params;
  const dir = CATALOG_DIRECTIONS.find((d) => d.slug === direction);
  if (!dir) return {};
  return {
    title: `${dir.title} — Каталог`,
    description: `Каталог товарів Binar 2000: ${dir.title.toLowerCase()}. B2B-постачання з кастомізацією під бренд.`,
    alternates: {
      canonical: `/catalog/${dir.slug}`,
    },
  };
}

// Figma «Напрям» (3682:46834): the catalog listing scoped to one
// direction — a three-level breadcrumb (Головна / Каталог / <напрям>),
// the direction H1, the subcategory carousel with side pagers (48 px
// under the H1 block), then the familiar search / controls / grid
// stack 148 px below the carousel. Signed-in partners get the B2B
// «Напрям» (4329:56219) skin instead - see CatalogPageView.
export default async function CatalogDirectionPage({
  params,
}: {
  params: Promise<{ direction: string }>;
}) {
  const { direction } = await params;
  const dir = CATALOG_DIRECTIONS.find((d) => d.slug === direction);
  if (!dir) notFound();

  return <CatalogPageView page={{ kind: "direction", dir }} />;
}
