import { ArticleBlocks, PROSE_RHYTHM, hasArticleContent } from "@/components/blog/ArticleBlocks";
import { ArticleByline, ArticleCover, type ArticleBylineData } from "@/components/blog/ArticleHero";
import type { BlogBlockDto } from "./types";
import { cx } from "../lib/format";

// The article as a reader will see it, for the editor's "Попередній
// перегляд". It renders through the article page's own pieces: the body
// is src/components/blog/ArticleBlocks.tsx (the one renderer of blocks),
// the byline and the cover come from ArticleHero.tsx, and the title and
// category label carry the hero's classes. The page's type is the
// storefront's (its `lg:` is 640 px, as on the site); only the page frame
// differs: no breadcrumb, sidebar or "Читайте також", and the column is as
// wide as the sheet allows, up to the page's measure (720 px, 667 px of
// text at lg).

export type ArticlePreviewProps = {
  title: string;
  category: string;
  image: string;
  coverAlt: string;
  blocks: readonly BlogBlockDto[];
  // Author, date and reading time as the page will print them.
  byline?: ArticleBylineData | null;
};

export function ArticlePreview({ title, category, image, coverAlt, blocks, byline }: ArticlePreviewProps) {
  const heading = (
    <h1 className={cx("text-h1 [overflow-wrap:anywhere]", title.trim() ? "text-neutral-900" : "text-neutral-300")}>
      {title.trim() || "Без заголовка"}
    </h1>
  );
  return (
    <article className="mx-auto flex w-full max-w-[720px] flex-col text-neutral-900">
      {category && (
        <p className="mb-4 text-[14px] font-medium leading-5 text-brand lg:mb-6 lg:text-[16px] lg:leading-[22px]">{category}</p>
      )}
      {byline ? (
        <div className="flex flex-col gap-4 lg:gap-6">
          {heading}
          <ArticleByline byline={byline} />
        </div>
      ) : (
        heading
      )}
      {image && (
        <div className="mt-12 lg:mt-10">
          <ArticleCover src={image} alt={coverAlt || title} />
        </div>
      )}
      <div className={cx(PROSE_RHYTHM, "mt-12 w-full lg:mt-16 lg:max-w-[667px]")}>
        {hasArticleContent(blocks) ? (
          <ArticleBlocks blocks={blocks} newTab />
        ) : (
          <p className="text-body-sm text-neutral-400">{"Тут з'явиться текст статті."}</p>
        )}
      </div>
    </article>
  );
}
