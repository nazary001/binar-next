/* eslint-disable @next/next/no-img-element */

import type { BlogBlockDto } from "./types";
import { renderInline } from "./inline";
import { cx } from "../lib/format";

// The article as a reader will see it: the category, the title, the cover
// and the body in the storefront's prose column (720 px, Manrope, the
// sizes and the rhythm of src/components/blog/ArticleBody.tsx). Read-only;
// used by the editor's "Попередній перегляд". The storefront's own block
// renderer is a separate component.
//
// The storefront's `lg:` is 640 px, so its desktop sizes start at 640 here
// too (min-[640px]:). The type classes (text-body-sm, text-title-lg ...)
// are the site's own tokens, phone sizes included.

export type ArticlePreviewProps = {
  title: string;
  category: string;
  image: string;
  coverAlt: string;
  blocks: readonly BlogBlockDto[];
};

// The space above a block, from the article page: 48 / 40 px between
// sections, 16 px from a heading to its text, 20 / 24 px between
// paragraphs, and the lede's extra 56 px on wide screens.
function gapBefore(prev: BlogBlockDto | null, block: BlogBlockDto): string {
  if (!prev) return "";
  if (prev.type === "lede") return "mt-12 min-[640px]:mt-24";
  if (block.type === "heading") return block.level === 2 ? "mt-12 min-[640px]:mt-10" : "mt-8";
  if (prev.type === "heading") return block.type === "list" ? "mt-9 min-[640px]:mt-10" : "mt-4";
  const flowing = (type: BlogBlockDto["type"]) => type === "paragraph" || type === "list";
  if (flowing(prev.type) && flowing(block.type)) return "mt-5 min-[640px]:mt-6";
  return "mt-8 min-[640px]:mt-10";
}

function Block({ block, className, index }: { block: BlogBlockDto; className: string; index: number }) {
  const key = `b${index}`;
  switch (block.type) {
    case "lede":
      return <p className={cx("text-body-sm min-[640px]:text-body-md", className)}>{renderInline(block.text, key)}</p>;
    case "paragraph":
      return <p className={cx("text-body-sm", className)}>{renderInline(block.text, key)}</p>;
    case "heading":
      return block.level === 2 ? (
        <h2 className={cx("text-title-lg text-neutral-900", className)}>{renderInline(block.text, key)}</h2>
      ) : (
        <h3 className={cx("text-[18px] font-semibold leading-6 tracking-[-0.02em] text-neutral-900 min-[640px]:text-[20px] min-[640px]:leading-[26px]", className)}>
          {renderInline(block.text, key)}
        </h3>
      );
    case "list": {
      const items = block.items.filter((item) => item.trim() !== "");
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={cx(
            "flex flex-col gap-5 ps-[21px] text-body-sm marker:text-neutral-900 min-[640px]:gap-6 min-[640px]:ps-6",
            block.ordered ? "list-decimal" : "list-disc",
            className,
          )}
        >
          {items.map((item, i) => (
            <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
          ))}
        </Tag>
      );
    }
    case "image":
      return (
        <figure className={cx("flex flex-col gap-3", className)}>
          {block.src ? (
            <img src={block.src} alt={block.alt} className="w-full rounded-[24px] bg-bg-subtle object-cover" />
          ) : (
            <div aria-hidden className="aspect-video w-full rounded-[24px] bg-bg-subtle" />
          )}
          {block.caption.trim() && <figcaption className="text-[14px] leading-5 text-neutral-500">{renderInline(block.caption, key)}</figcaption>}
        </figure>
      );
    case "quote":
      return (
        <blockquote className={cx("flex flex-col gap-3 border-l-2 border-brand ps-5 min-[640px]:ps-6", className)}>
          <p className="text-body-sm font-medium text-neutral-900 min-[640px]:text-body-md">{renderInline(block.text, key)}</p>
          {block.author.trim() && <footer className="text-[14px] leading-5 text-neutral-500">{block.author}</footer>}
        </blockquote>
      );
    case "callout":
      return (
        <aside className={cx("rounded-[24px] bg-bg-subtle px-5 py-4 text-body-sm min-[640px]:px-6 min-[640px]:py-5", className)}>
          {renderInline(block.text, key)}
        </aside>
      );
    case "divider":
      return <hr className={cx("border-0 border-t border-stroke-subtle", className)} />;
  }
}

// Empty text blocks are left out, as the site leaves them out.
function visible(block: BlogBlockDto): boolean {
  if (block.type === "divider" || block.type === "image") return true;
  if (block.type === "list") return block.items.some((item) => item.trim() !== "");
  return block.text.trim() !== "";
}

export function ArticlePreview({ title, category, image, coverAlt, blocks }: ArticlePreviewProps) {
  const shown = blocks.filter(visible);
  return (
    <article className="mx-auto flex w-full max-w-[720px] flex-col text-neutral-900">
      {category && <p className="text-[14px] font-medium leading-5 text-brand min-[640px]:text-[16px] min-[640px]:leading-[22px]">{category}</p>}
      <h1
        className={cx(
          "mt-3 text-[32px] font-bold leading-[36px] tracking-[-0.02em] [overflow-wrap:anywhere] min-[640px]:text-[40px] min-[640px]:leading-[44px]",
          !title.trim() && "text-neutral-300",
        )}
      >
        {title.trim() || "Без заголовка"}
      </h1>
      {image && (
        <div className="relative mt-8 h-[206px] w-full overflow-hidden rounded-[32px] bg-bg-subtle min-[640px]:aspect-[1180/515] min-[640px]:h-auto">
          <img src={image} alt={coverAlt || title} className="absolute inset-0 size-full object-cover" />
        </div>
      )}
      <div className="mt-10 flex flex-col min-[640px]:mt-12">
        {shown.length === 0 ? (
          <p className="text-body-sm text-neutral-400">{"Тут з'явиться текст статті."}</p>
        ) : (
          shown.map((block, index) => (
            <Block key={index} index={index} block={block} className={gapBefore(index > 0 ? shown[index - 1] : null, block)} />
          ))
        )}
      </div>
    </article>
  );
}
