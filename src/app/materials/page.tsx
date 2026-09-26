import type { Metadata } from "next";
import { MaterialsHome } from "@/components/materials/MaterialsHome";

export const metadata: Metadata = {
  title: "Матеріали",
  description:
    "Каталоги, сертифікати, презентації, технічні карти та інші матеріали Binar 2000 в одному місці.",
  alternates: { canonical: "/materials" },
};

// Figma «Матеріали B2C» landing (4634:63597): the category folders of
// the materials library. Content is a placeholder feed (data.ts) until
// the CMS is wired.
export default function MaterialsPage() {
  return <MaterialsHome />;
}
