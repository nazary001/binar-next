import type { Metadata } from "next";
import { CatalogPageView } from "@/components/catalog/CatalogPageView";

export const metadata: Metadata = {
  title: "Каталог",
  description:
    "Каталог товарів Binar 2000: усе для готелів, засоби індивідуального захисту, засоби та інвентар для прибирання. B2B-постачання з кастомізацією під бренд.",
  alternates: {
    canonical: "/catalog",
  },
};

// Figma «Каталог :: картки товарів :: фільтри не застосовані»
// (4329:39182, 1710-px shop frame): breadcrumb + H1, three category
// banners, the search / view-controls block and the product grid with
// pagination. The vertical rhythm follows the master: 72
// header→breadcrumb, 48 to the H1, 80 to the banners, 148 to the search
// block, grid rows on an 80-px cadence.
//
// Horizontal model: the shop frames are FLUID with fixed 80-px gutters
// (content 1550 at 1710) - unlike the 1440 landing masters that sit in
// a centred 130-px column - so this page uses `.lg-shop-pad-x` (80-px
// gutters that only grow past 1710 to keep the 1550 column centred),
// not `.lg-pad-x`, and every row (banners, search, 4-up product grid)
// stretches between the gutters while type stays at Figma px.
//
// Signed-in partners get the B2B skin instead (CatalogPageView).
export default function CatalogPage() {
  return <CatalogPageView page={{ kind: "root" }} />;
}
