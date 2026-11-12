import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { BackCrumb, ShopCrumbs, Slash } from "@/components/ui/Breadcrumb";
import { FIGMA_TEXT_BOX } from "@/components/catalog/textBox";
import { checkoutSearchEnabled } from "@/server/integrations/nova-poshta/public";

export const metadata: Metadata = {
  title: "Оформити замовлення",
  description: "Оформлення замовлення в Binar 2000: контактні дані, доставка та оплата.",
  robots: { index: false, follow: false },
};

// Figma «Оформити замовлення» (section 4329:40696, frame 4329:40697):
// the three-level breadcrumb (Головна / Каталог / Оформити замовлення),
// the H1, then the order table + form panel. Rhythm: 72 header ->
// breadcrumb, 48 to the H1, 104 to the two columns, 148 to the footer.
// Phones (checkout spec 2.0-2.2, template T1): header -> crumb 48, the
// one-line back crumb to the parent "Каталог" (system spec A19; the trail
// is the desktop half of the same nav), crumb -> H1 48, H1 -> lines 48.
//
// Whether the form searches Nova Poshta's real cities and branches is the
// shop's switch in the panel (settings novaPoshta.checkoutSearch), read
// per request: connection() keeps the page out of the build-time
// prerender, which would freeze the value the database had then.
export default async function CheckoutPage() {
  await connection();
  const npSearch = await checkoutSearchEnabled();
  return (
    <div className="px-6 pb-[60px] sm:px-10 lg-shop-pad-x lg:pb-[148px]">
      <section className="flex flex-col gap-12 pt-12 lg:gap-12 lg:pt-[72px]">
        <ShopCrumbs back={{ href: "/catalog", label: "Каталог" }}>
          <BackCrumb href="/" label="Головна" />
          <Slash />
          <Link
            href="/catalog"
            style={FIGMA_TEXT_BOX}
            className="cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
          >
            Каталог
          </Link>
          <Slash />
          <span className="text-button-md text-brand" aria-current="page">
            Оформити замовлення
          </span>
        </ShopCrumbs>

        <h1 className="text-h1 text-neutral-900">Оформити замовлення</h1>
      </section>

      <div className="mt-12 lg:mt-[104px]">
        <CheckoutClient npSearch={npSearch} />
      </div>
    </div>
  );
}
