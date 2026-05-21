/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ScrollToTopButton } from "./ScrollToTopButton";
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
      className="relative w-full text-white"
      style={{ background: "#2d2d2f" }}
    >
      <div className="absolute inset-x-0 -top-[60px] h-[60px] bg-white" aria-hidden />
      <div
        className="relative rounded-t-[40px] sm:rounded-t-[48px] lg:rounded-t-[60px]"
        style={{ background: "#2d2d2f" }}
      >
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-5 pb-12 pt-8 sm:gap-16 sm:px-10 sm:pb-16 sm:pt-10 lg:gap-[80px] lg:px-[130px] lg:pb-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-[100px]">
            <div className="flex flex-1 flex-wrap items-end gap-x-6 gap-y-2">
              <h2 className="text-h1 font-semibold text-white">Контакти</h2>
              <p className="text-body-sm text-neutral-500">Відділ продажу</p>
            </div>

            <div className="flex flex-1 items-center justify-between gap-4 sm:gap-6">
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
              <ScrollToTopButton />
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
                  <div className="flex flex-1 flex-col gap-[10px] min-w-0">
                    <span className="text-body-sm font-medium text-neutral-400">
                      {c.label}
                    </span>
                    <Link
                      href={c.href}
                      className={`inline-block cursor-pointer text-title-lg font-semibold text-white break-words transition-colors duration-300 hover:text-brand ${
                        i > 0 ? "underline underline-offset-4 decoration-1 hover:decoration-brand" : ""
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
                    className="group flex h-[80px] cursor-pointer items-end justify-between p-4 transition-colors duration-300 hover:bg-white/5 sm:h-[92px]"
                  >
                    <span className="text-title-lg font-semibold text-white transition-transform duration-300 group-hover:translate-x-1">
                      {link.label}
                    </span>
                    <span className="relative size-9 shrink-0 transition-transform duration-300 group-hover:scale-110 sm:size-10">
                      <img
                        src="/figma-export/footer-arrow-circle.svg"
                        alt=""
                        aria-hidden
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 size-full transition-transform duration-300 group-hover:rotate-45"
                      />
                      <img
                        src="/figma-export/footer-arrow-inner.svg"
                        alt=""
                        aria-hidden
                        loading="lazy"
                        decoding="async"
                        className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 group-hover:-translate-x-[40%] group-hover:-translate-y-[60%] sm:size-8"
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
          <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start justify-between gap-4 px-5 py-5 sm:h-[60px] sm:flex-row sm:items-center sm:gap-3 sm:overflow-clip sm:px-10 sm:py-0 lg:px-[130px]">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:gap-x-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <img
                  src="/figma-export/footer-mini-logo.svg"
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="h-[28px] w-[24px] shrink-0 sm:h-[34px] sm:w-[29px]"
                />
                <p className="text-[14px] leading-[22px] text-white sm:text-[16px] sm:leading-[30px] sm:whitespace-nowrap">
                  © {new Date().getFullYear()} Binar-2000. All rights reserved
                </p>
              </div>
              <Link
                href="/privacy"
                className="cursor-pointer text-[14px] leading-[22px] text-white underline decoration-white/60 underline-offset-2 transition-all duration-300 hover:decoration-white sm:text-[16px] sm:leading-[30px] sm:whitespace-nowrap"
              >
                Політика конфіденційності
              </Link>
              <Link
                href="/terms"
                className="cursor-pointer text-[14px] leading-[22px] text-white underline decoration-white/60 underline-offset-2 transition-all duration-300 hover:decoration-white sm:text-[16px] sm:leading-[30px] sm:whitespace-nowrap"
              >
                Угода про публічну оферту
              </Link>
            </div>
            <Link
              href="https://chilline.studio"
              target="_blank"
              rel="noreferrer"
              aria-label="Made by Chilline"
              className="shrink-0 cursor-pointer transition-transform duration-300 hover:scale-105"
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
