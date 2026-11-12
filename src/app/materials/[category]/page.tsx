import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { filesCount, filesOf, findCategory } from "@/components/materials/data";
import { MaterialsCategory } from "@/components/materials/MaterialsCategory";
import { getMaterialCategories, getMaterialFiles } from "@/server/repos/materials";

type Params = { category: string };

export async function generateStaticParams(): Promise<Params[]> {
  return (await getMaterialCategories()).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category } = await params;
  const [categories, files] = await Promise.all([getMaterialCategories(), getMaterialFiles()]);
  const found = findCategory(categories, category);
  if (!found) return { title: "Матеріали" };
  return {
    title: `${found.title} - Матеріали`,
    description: `${found.title} Binar 2000: ${filesCount(filesOf(files, found.slug).length)} для перегляду та завантаження.`,
    alternates: { canonical: `/materials/${found.slug}` },
  };
}

// Figma «Матеріали B2C» category page (4634:64897): the files of one
// category with search, filters and the preview panel. Only this folder's
// files go to the client.
export default async function MaterialsCategoryPage({ params }: { params: Promise<Params> }) {
  const { category } = await params;
  const [categories, files] = await Promise.all([getMaterialCategories(), getMaterialFiles()]);
  const found = findCategory(categories, category);
  if (!found) notFound();
  return <MaterialsCategory category={found} files={filesOf(files, found.slug)} />;
}
