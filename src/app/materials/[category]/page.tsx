import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORIES, filesCount, filesOf, findCategory } from "@/components/materials/data";
import { MaterialsCategory } from "@/components/materials/MaterialsCategory";

type Params = { category: string };

export function generateStaticParams(): Params[] {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category } = await params;
  const found = findCategory(category);
  if (!found) return { title: "Матеріали" };
  return {
    title: `${found.title} - Матеріали`,
    description: `${found.title} Binar 2000: ${filesCount(filesOf(found.slug).length)} для перегляду та завантаження.`,
    alternates: { canonical: `/materials/${found.slug}` },
  };
}

// Figma «Матеріали B2C» category page (4634:64897): the files of one
// category with search, filters and the preview panel.
export default async function MaterialsCategoryPage({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  const found = findCategory(category);
  if (!found) notFound();
  return <MaterialsCategory category={found} />;
}
