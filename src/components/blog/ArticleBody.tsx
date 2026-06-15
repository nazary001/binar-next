import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ARTICLE_BODY } from "./data";
import { FacebookIcon, InstagramIcon, TelegramIcon } from "./icons";

const SITE_URL = "https://binar-2000.com";

// Share targets reuse the Figma share-icon set (dark, inverting to white on
// hover via currentColor). Facebook + Telegram open a real share dialog for
// the article; Instagram has no web share URL, so its button links to the
// brand profile (matching the Figma icon order Facebook · Instagram · Telegram).
function shareLinks(slug: string) {
  const url = `${SITE_URL}/blog/${slug}`;
  return [
    {
      label: "Поділитись у Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      Icon: FacebookIcon,
      iconClass: "h-[23px] w-[14px]",
    },
    {
      label: "Instagram",
      href: "https://instagram.com/binar2000",
      Icon: InstagramIcon,
      iconClass: "h-[23px] w-[24px]",
    },
    {
      label: "Поділитись у Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}`,
      Icon: TelegramIcon,
      iconClass: "h-[20px] w-[24px]",
    },
  ];
}

// Figma «Frame 1010106848» (2670:6446): a two-column article body — the
// 707-wide prose column (intro + sub-sections + criteria list) beside the
// 441-wide sidebar (a CTA card on bg-subtle, then «Поділитись» social
// buttons and «Теги» chips).
export function ArticleBody({ slug }: { slug: string }) {
  const socials = shareLinks(slug);

  return (
    <section className="lg-pad-x flex flex-col gap-12 px-5 pt-12 pb-12 sm:px-10 sm:pt-16 lg:flex-row lg:items-start lg:gap-8 lg:pt-[160px] lg:pb-20">
      {/* Prose column */}
      <div className="flex flex-col gap-10 text-neutral-900 lg:w-[707px] lg:shrink-0 lg:pr-10">
        {/* The Figma intro node carries two trailing empty lines before the
            first sub-section, so the gap after the lede is larger (~96px on
            the 1440 master) than the 40px rhythm between later sections. */}
        <p className="text-body-md lg:mb-14">{ARTICLE_BODY.intro}</p>

        {ARTICLE_BODY.sections.map((section) => (
          <div key={section.heading} className="flex flex-col gap-4">
            <h2 className="text-title-lg text-neutral-900">{section.heading}</h2>
            <div className="flex flex-col gap-6">
              {section.paragraphs.map((p, i) => (
                <p key={i} className="text-body-sm">
                  {p}
                </p>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-4">
          <h2 className="text-title-lg text-neutral-900">
            {ARTICLE_BODY.listSection.heading}
          </h2>
          <ul className="flex list-disc flex-col gap-6 ps-6 text-body-sm marker:text-neutral-900">
            {ARTICLE_BODY.listSection.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-10 lg:w-[441px] lg:shrink-0">
        {/* CTA card */}
        <div className="flex flex-col gap-10 rounded-[32px] bg-bg-subtle px-6 py-8 sm:rounded-[40px] sm:px-8 sm:py-10 lg:gap-12 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-4 text-neutral-800">
            <h2 className="text-neutral-800">
              <span className="text-h2-light">Хочете </span>
              <span className="text-h2">отримати консультацію?</span>
            </h2>
            <p className="text-body-sm">
              Наші фахівці допоможуть підібрати рішення під потреби вашого
              готелю.
            </p>
          </div>
          <Button href="/#contact-form" arrow>
            Зв&apos;язатись з нами
          </Button>
        </div>

        {/* Share + tags */}
        <div className="flex flex-col gap-10 sm:px-8">
          <div className="flex flex-col gap-6">
            <h3 className="text-title-lg text-neutral-900">Поділитись</h3>
            <ul className="flex items-center gap-[19px]">
              {socials.map(({ label, href, Icon, iconClass }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex size-[46px] cursor-pointer items-center justify-center rounded-lg border border-neutral-600 text-neutral-900 transition-colors duration-300 hover:border-brand hover:bg-brand hover:text-white"
                  >
                    <Icon className={iconClass} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-6">
            <h3 className="text-title-lg text-neutral-900">Теги</h3>
            <ul className="flex flex-wrap gap-4">
              {ARTICLE_BODY.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href="/blog"
                    className="inline-flex cursor-pointer items-center rounded-[60px] border border-neutral-800 px-4 py-3 text-[16px] leading-4 text-neutral-800 transition-colors duration-300 hover:border-brand hover:text-brand"
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
