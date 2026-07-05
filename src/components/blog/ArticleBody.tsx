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
    <section className="lg-pad-x flex flex-col gap-12 px-6 pt-12 pb-12 sm:px-10 sm:pt-16 lg:flex-row lg:items-start lg:gap-8 lg:pt-[160px] lg:pb-20">
      {/* Prose column. Mobile master (3176:5634) stacks lede/sections/list at
          a uniform 48px (gap-12); the 1440 desktop master uses a tighter 40px
          rhythm (lg:gap-10), so the gap is breakpoint-scoped. */}
      <div className="flex flex-col gap-12 text-neutral-900 lg:w-[707px] lg:shrink-0 lg:gap-10 lg:pr-10">
        {/* The Figma intro node carries two trailing empty lines before the
            first sub-section, so the gap after the lede is larger (~96px on
            the 1440 master) than the 40px rhythm between later sections. The
            lede itself is Body Small (14/20) on the phone master, Body Medium
            (20/28) on desktop. */}
        <p className="text-body-sm lg:mb-14 lg:text-body-md">{ARTICLE_BODY.intro}</p>

        {ARTICLE_BODY.sections.map((section) => (
          <div key={section.heading} className="flex flex-col gap-4">
            <h2 className="text-title-lg text-neutral-900">{section.heading}</h2>
            <div className="flex flex-col gap-5 lg:gap-6">
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
          {/* max-lg:mt-5: the phone master's list text node opens with a
              LEADING empty 20px line (heading->first bullet = 16 + 20). */}
          <ul className="flex list-disc flex-col gap-5 ps-[21px] text-body-sm marker:text-neutral-900 max-lg:mt-5 lg:gap-6 lg:ps-6">
            {ARTICLE_BODY.listSection.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sidebar. Mobile gap CTA->«Поділитись» is 108 (the master's
          article-frame pb-60 + the share-frame pt-48); lg keeps 40. */}
      <div className="flex flex-col gap-[108px] lg:w-[441px] lg:shrink-0 lg:gap-10">
        {/* CTA card — Figma 3176:6124: bg-subtle rounded-40, px-32 py-40,
            48-px gap to the small CTA button. */}
        <div className="flex flex-col gap-12 rounded-[40px] bg-bg-subtle px-8 py-10">
          <div className="flex flex-col gap-4 text-neutral-800">
            {/* Title is Text/Default #1d1d1f in the master (pixel-probed),
                one shade darker than the neutral-800 body. */}
            <h2 className="text-neutral-900">
              <span className="text-h2-light">Хочете </span>
              <span className="text-h2">отримати консультацію?</span>
            </h2>
            <p className="text-body-sm">
              Наші фахівці допоможуть підібрати рішення під потреби вашого
              готелю.
            </p>
          </div>
          <Button href="/#contact-form" size="responsive" arrow>
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
            <ul className="flex flex-wrap gap-2 lg:gap-4">
              {ARTICLE_BODY.tags.map((tag) => (
                <li key={tag}>
                  {/* py-[7px]: the master's 36px chips count the stroke
                      INSIDE (7 + 20 + 7 + 2 = 36), same as the blog list
                      filter chips. */}
                  <Link
                    href="/blog"
                    className="inline-flex cursor-pointer items-center rounded-[60px] border border-stroke-default px-4 py-[7px] text-[14px] font-medium leading-5 text-neutral-800 transition-colors duration-300 hover:border-brand hover:text-brand lg:py-3 lg:text-[16px]"
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
