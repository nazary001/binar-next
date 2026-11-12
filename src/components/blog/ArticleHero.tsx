/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { BlogPost } from "./data";
import { ArrowBack } from "./icons";

// Who wrote an article, when it went live and how long it reads. Only
// posts written in the admin panel carry it; the classic posts show none.
export type ArticleBylineData = {
  author: string;
  // ISO moment; null = not published yet (the editor's preview of a draft).
  publishedAt: string | null;
  readingMinutes: number | null;
};

// "12 листопада 2026" in Kyiv time (the day the site's readers live in),
// without the trailing "р." of the long Ukrainian format.
function kyivDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("day")} ${part("month")} ${part("year")}`;
}

// The byline under the H1, in the breadcrumb's language: medium 14 / 16 px
// runs with the same light "/" between them.
export function ArticleByline({ byline }: { byline: ArticleBylineData }) {
  const date = byline.publishedAt ? kyivDate(byline.publishedAt) : null;
  const items = [
    byline.author.trim() ? <span key="author" className="text-neutral-800">{byline.author.trim()}</span> : null,
    date && byline.publishedAt ? (
      <time key="date" dateTime={byline.publishedAt}>
        {date}
      </time>
    ) : null,
    byline.readingMinutes ? <span key="minutes">{byline.readingMinutes} хв читання</span> : null,
  ].filter((item) => item !== null);
  if (items.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] font-medium leading-5 text-neutral-500 lg:text-[16px] lg:leading-[22px]">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-4 whitespace-nowrap">
          {i > 0 && (
            <span aria-hidden className="text-stroke-subtle">
              /
            </span>
          )}
          {item}
        </span>
      ))}
    </p>
  );
}

// The wide rounded cover. Below lg the Figma MOBILE master (3176:6105)
// shows a 206-px-tall cover; lg keeps the wide 1180/515 banner.
export function ArticleCover({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-[206px] w-full overflow-hidden rounded-[32px] sm:h-[280px] sm:rounded-[40px] lg:aspect-[1180/515] lg:h-auto">
      <img
        src={src}
        alt={alt}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
    </div>
  );
}

// Figma «Блог :: Стаття» hero (2670:6437): a breadcrumb («← Назад до блогу /
// <category>»), the article H1, and a wide rounded cover image.
export function ArticleHero({
  post,
  coverAlt,
  byline,
}: {
  post: BlogPost;
  // The editor's description of the cover; the title when there is none.
  coverAlt?: string;
  byline?: ArticleBylineData | null;
}) {
  // overflow-wrap: anywhere, as the editor's preview has it: an unbroken
  // string in a title stays inside the page at every width.
  const title = <h1 className="text-h1 text-neutral-900 [overflow-wrap:anywhere]">{post.title}</h1>;
  return (
    <section className="lg-pad-x flex flex-col gap-12 px-6 pt-12 sm:px-10 sm:pt-14 lg:gap-[88px] lg:pt-20">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/blog" className="group flex items-center gap-4">
          <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
            <ArrowBack className="w-[20px]" />
          </span>
          <span className="text-[16px] font-semibold leading-[22px] tracking-[0.16px] text-neutral-800 transition-colors duration-300 group-hover:text-brand lg:text-[18px] lg:tracking-[0.18px]">
            Назад до блогу
          </span>
        </Link>
        {/* Separator glued to the category so a wrapped breadcrumb never
            strands the "/" alone at the end of line 1 on phones; the 16-px gap
            matches the old spacing, so desktop is unchanged. */}
        <span className="inline-flex items-center gap-4 whitespace-nowrap">
          <span
            aria-hidden
            className="text-[18px] font-semibold leading-[22px] text-stroke-subtle"
          >
            /
          </span>
          <span className="text-[14px] font-medium leading-5 text-brand lg:text-[16px] lg:leading-[22px]">
            {post.category}
          </span>
        </span>
      </div>

      {/* Title + cover. A byline, when the post has one, hangs under the
          title (16 / 24 px) inside the title's slot, so the title -> cover
          gap stays the master's. */}
      <div className="flex flex-col gap-12 lg:gap-10">
        {byline ? (
          <div className="flex flex-col gap-4 lg:gap-6">
            {title}
            <ArticleByline byline={byline} />
          </div>
        ) : (
          title
        )}
        {/* No cover (its upload was removed from the library): the title
            stands alone rather than above a broken picture. */}
        {post.image ? <ArticleCover src={post.image} alt={coverAlt || post.title} /> : null}
      </div>
    </section>
  );
}
