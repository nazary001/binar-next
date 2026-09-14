import type { Metadata } from "next";
import Link from "next/link";
import { ArrowBack } from "@/components/catalog/icons";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Оформити замовлення",
  description: "Оформлення замовлення в Binar 2000: контактні дані, доставка та оплата.",
  robots: { index: false, follow: false },
};

// Figma «Оформити замовлення» (section 4329:40696, frame 4329:40697):
// the three-level breadcrumb (Головна / Каталог / Оформити замовлення),
// the H1, then the order table + form panel. Rhythm: 72 header ->
// breadcrumb, 48 to the H1, 104 to the two columns, 148 to the footer.
export default function CheckoutPage() {
  return (
    <div className="px-6 pb-[60px] sm:px-10 lg-shop-pad-x lg:pb-[148px]">
      <section className="flex flex-col gap-8 pt-12 lg:gap-12 lg:pt-[72px]">
        <nav aria-label="Навігація" className="flex flex-wrap items-center gap-4">
          <Link href="/" className="group flex items-center gap-4">
            <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
              <ArrowBack className="w-[20px]" />
            </span>
            <span className="text-[16px] font-semibold leading-[22px] tracking-[0.16px] text-neutral-800 transition-colors duration-300 group-hover:text-brand lg:text-[18px] lg:tracking-[0.18px]">
              Головна
            </span>
          </Link>
          <span className="text-[18px] font-semibold leading-[22px] text-stroke-subtle">/</span>
          <Link
            href="/catalog"
            className="cursor-pointer text-button-md text-neutral-700 transition-colors duration-200 hover:text-brand"
          >
            Каталог
          </Link>
          <span className="text-[18px] font-semibold leading-[22px] text-stroke-subtle">/</span>
          <span className="text-button-md text-brand" aria-current="page">
            Оформити замовлення
          </span>
        </nav>

        <h1 className="text-h1 text-neutral-900">Оформити замовлення</h1>
      </section>

      <div className="mt-12 lg:mt-[104px]">
        <CheckoutClient />
      </div>
    </div>
  );
}
