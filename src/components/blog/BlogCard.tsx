/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { BlogPost } from "./data";
import { ArrowUpRight } from "./icons";

// Figma «Card» (2670:6380): a 340×576 article card — rounded image (336),
// then a category caption + outlined arrow button row, then the title and
// the muted excerpt. The whole card is a link to the article; on hover the
// arrow square inverts to orange and the title turns brand-orange (matching
// the site's existing Directions cards).
export function BlogCard({ post }: { post: BlogPost }) {
  // Below lg the Figma MOBILE master (3176:5541) wraps each card in a
  // neutral-800-bordered rounded-32 shell with the image at the top and
  // px-24 pt-24 pb-48 content padding; the excerpt is a single truncated
  // line. At lg the card is borderless (the CardGrid draws the column
  // dividers instead) and the excerpt wraps freely.
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full cursor-pointer flex-col rounded-[32px] border border-neutral-800 lg:gap-6 lg:rounded-none lg:border-0 lg:py-6"
    >
      {/* max-lg:-mt-px + pb-[47px] below: Figma's 432px card counts its
          stroke INSIDE (image at y0 under the border, excerpt->bottom gap
          48 incl the stroke); border-box adds 2px, so the image slides
          under the top border and the bottom pad gives one px back. */}
      <div className="relative h-[206px] w-full shrink-0 overflow-hidden rounded-[32px] max-lg:-mt-px sm:rounded-[40px] lg:aspect-auto lg:h-[336px]">
        <img
          src={post.image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 px-6 pb-[47px] pt-6 lg:p-0">
        <div className="flex items-end justify-between gap-4">
          <span className="text-[12px] font-medium uppercase leading-5 text-brand lg:text-[14px] lg:leading-6">
            {post.categoryLabel}
          </span>
          <span
            aria-hidden
            className="flex size-[46px] shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 ease-out group-hover:border-brand group-hover:bg-brand group-hover:text-white"
          >
            <ArrowUpRight className="size-[16.5px]" />
          </span>
        </div>
        {/* gap-3: Figma's Title+body block (3176:5548) is title + 12px +
            excerpt. The excerpt stays 16/24 on mobile (written out —
            text-body-sm drops to 14/20 below lg). */}
        <div className="flex flex-1 flex-col gap-3 lg:gap-4">
          <h3 className="text-title-lg text-neutral-900 transition-colors duration-300 group-hover:text-brand">
            {post.title}
          </h3>
          <p className="truncate text-[16px] leading-[24px] text-neutral-500 lg:overflow-visible lg:whitespace-normal">
            {post.excerpt}
          </p>
        </div>
      </div>
    </Link>
  );
}
