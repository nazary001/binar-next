import type { Metadata } from "next";
import { MaterialsHome } from "@/components/materials/MaterialsHome";
import { getMaterialCategories, getMaterialFiles } from "@/server/repos/materials";

export const metadata: Metadata = {
  title: "Матеріали",
  description:
    "Каталоги, сертифікати, презентації, технічні карти та інші матеріали Binar 2000 в одному місці.",
  alternates: { canonical: "/materials" },
};

// Figma «Матеріали B2C» landing (4634:63597): the category folders of
// the materials library, read from the database (cached, tag
// "materials") and handed to the client view.
export default async function MaterialsPage() {
  const [categories, files] = await Promise.all([getMaterialCategories(), getMaterialFiles()]);
  return <MaterialsHome categories={categories} files={files} />;
}
