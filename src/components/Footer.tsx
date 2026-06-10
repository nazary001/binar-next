/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { SocialButton } from "./ui/SocialButton";

const SOCIALS = [
  {
    href: "https://facebook.com/binar2000",
    label: "Facebook",
    src: "/figma-export/footer-facebook.svg",
    iconClass: "h-[23px] w-[14px]",
  },
  {
    href: "https://instagram.com/binar2000",
    label: "Instagram",
    src: "/figma-export/footer-instagram.svg",
    iconClass: "h-[24px] w-[24px]",
  },
  {
    href: "https://t.me/binar2000",
    label: "Telegram",
    src: "/figma-export/footer-telegram.svg",
    iconClass: "h-[20px] w-[24px]",
  },
];

const CONTACTS = [
  {
    n: "01.",
    label: "Телефон *",
    value: "+38 (089) 739-08-30",
    href: "tel:+380897390830",
  },
  {
    n: "02.",
    label: "Email",
    value: "info@binar-2000.com",
    href: "mailto:info@binar-2000.com",
  },
  {
    n: "03.",
    label: "Адреса",
    value: "Україна, м. Київ, вул. Хрещатик, 1",
    href: "https://maps.google.com/?q=Київ+Хрещатик+1",
  },
];

const SECTION_LINKS = [
  { label: "Напрями роботи", href: "/#segments" },
  { label: "Часті запитання", href: "/#faq" },
  { label: "Співпраця", href: "/spivpratsya" },
];

export function Footer() {
  return (
    <footer
      id="contacts"
      className="relative w-full overflow-clip text-white"
      style={{ background: "#2d2d2f" }}
    >
      <div
        className="relative rounded-t-[40px] sm:rounded-t-[48px] lg:rounded-t-[60px]"
        style={{ background: "#2d2d2f" }}
      >
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-5 pb-12 pt-8 sm:gap-16 sm:px-10 sm:pb-16 sm:pt-10 lg:gap-[80px] lg:px-[130px] lg:pb-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-[100px]">
            {/* Figma: «Контакти» = Manrope SemiBold 62/68 (weight 600).
                The shared text-h1 token sits at weight 700 — override to
                600 here with `font-semibold` to stay on-spec. */}
            <div className="flex flex-1 flex-wrap items-end gap-x-6 gap-y-2">
              <h2 className="text-h1 font-semibold text-white">Контакти</h2>
              <p className="text-button-md text-neutral-500">Відділ продажу</p>
            </div>

            {/* Figma master `568:3880`: socials cluster bottom-aligns with
                the 130-px scroll-up circle. items-end at lg pins the 46-px
                social buttons to the bottom edge of the row so they sit on
                the same baseline as the orange up-arrow. */}
            <div className="flex flex-1 items-center justify-between gap-4 sm:gap-6 lg:items-end">
              <ul className="flex items-center gap-3 sm:gap-[19px] sm:px-4">
                {SOCIALS.map((s) => (
                  <li key={s.label}>
                    <SocialButton
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={s.label}
                      iconSrc={s.src}
                      iconClassName={s.iconClass}
                    />
                  </li>
                ))}
              </ul>
              {/* Empty docking slot — the single travelling scroll-to-top
                  button (ScrollUpDock, fixed) rises to this row's height as
                  the footer enters view (vertical-only; horizontally it stays
                  at its corner offset from the right viewport edge). Reserves
                  the button's footprint so the row layout is unchanged
                  whether or not it has docked yet. */}
              <div
                data-scrollup-slot
                aria-hidden
                className="shrink-0 size-[88px] sm:size-[110px] lg:size-[130px]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-10 sm:gap-12 lg:flex-row lg:items-end lg:gap-[100px]">
            <ul className="flex flex-1 flex-col">
              {CONTACTS.map((c, i) => (
                <li
                  key={c.n}
                  className={`flex items-start gap-4 py-4 sm:gap-6 ${i === 0 ? "border-y" : "border-b"}`}
                  style={{ borderColor: "#616162" }}
                >
                  <span className="text-body-md text-neutral-400 whitespace-nowrap">
                    {c.n}
                  </span>
                  {/* Figma cell `568:3199` vertically centres the label/value
                      block inside the 16-px-padded row and pads the right
                      edge by 32 px so long values like the address don't
                      crowd the trailing edge. */}
                  <div className="flex flex-1 flex-col justify-center gap-[10px] min-w-0 lg:pr-[32px]">
                    <span className="text-button-md text-neutral-400">
                      {c.label}
                    </span>
                    <Link
                      href={c.href}
                      className={`inline-block cursor-pointer text-title-lg font-semibold text-white break-words transition-colors duration-300 hover:text-brand ${
                        i > 0 ? "underline underline-offset-4 decoration-1" : ""
                      }`}
                    >
                      {c.value}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <ul className="flex flex-1 flex-col self-stretch">
              {SECTION_LINKS.map((link) => (
                <li
                  key={link.href}
                  className="border-b"
                  style={{ borderColor: "#616162" }}
                >
                  <Link
                    href={link.href}
                    className="group flex h-[80px] cursor-pointer items-end justify-between p-4 transition-colors duration-300 sm:h-[92px]"
                  >
                    <span className="text-title-lg font-semibold text-white transition-colors duration-300 group-hover:text-brand">
                      {link.label}
                    </span>
                    <span className="relative size-9 shrink-0 sm:size-10">
                      <img
                        src="/figma-export/footer-arrow-circle.svg"
                        alt=""
                        aria-hidden
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 size-full"
                      />
                      <img
                        src="/figma-export/footer-arrow-inner.svg"
                        alt=""
                        aria-hidden
                        loading="lazy"
                        decoding="async"
                        className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 sm:size-8"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="bg-brand"
          style={{ fontFamily: "var(--font-onest)" }}
        >
          {/* Orange band — Figma master `568:3219` is a 60-px-tall flex-row
              at 1440 with px-[130px], gap-24 between items, and Chilline
              pushed to the right via justify-between. Combined width of
              logo + copyright + 2 underlined links + Chilline (~890 px)
              doesn't fit until ~1280, so we stack everything vertically
              below lg and only switch to the single-row Figma layout at
              1024+. flex-wrap on the inner group catches the tight
              1024-1280 band so the second link drops to a second row
              inside the 60-px container rather than overflowing. */}
          <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-3 px-5 py-5 sm:gap-4 sm:px-10 lg:h-[60px] lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:overflow-clip lg:py-0 lg:px-[130px]">
            <div className="flex flex-col items-start gap-3 sm:gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-2">
              <div className="flex items-center gap-3 sm:gap-4">
                <img
                  src="/figma-export/footer-mini-logo.svg"
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="h-[28px] w-[24px] shrink-0 sm:h-[33.684px] sm:w-[29.237px]"
                />
                <p className="text-[14px] leading-[22px] text-white sm:leading-[30px] lg:whitespace-nowrap">
                  © {new Date().getFullYear()} Binar-2000. All rights reserved
                </p>
              </div>
              <Link
                href="/privacy"
                className="cursor-pointer text-[14px] leading-[22px] text-white underline decoration-white underline-offset-2 sm:leading-[30px] lg:whitespace-nowrap"
              >
                Політика конфіденційності
              </Link>
              <Link
                href="/terms"
                className="cursor-pointer text-[14px] leading-[22px] text-white underline decoration-white underline-offset-2 sm:leading-[30px] lg:whitespace-nowrap"
              >
                Угода про публічну оферту
              </Link>
            </div>
            <Link
              href="https://chilline.studio"
              target="_blank"
              rel="noreferrer"
              aria-label="Made by Chilline"
              className="shrink-0 cursor-pointer self-start lg:self-auto"
            >
              <img
                src="/figma-export/footer-chilline-logo.svg"
                alt="Chilline"
                loading="lazy"
                decoding="async"
                className="h-[24px] w-[80px] sm:h-[27px] sm:w-[92px]"
              />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
