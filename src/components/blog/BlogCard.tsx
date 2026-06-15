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
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full cursor-pointer flex-col gap-6 lg:py-6"
    >
      <div className="relative aspect-[340/336] w-full shrink-0 overflow-hidden rounded-[28px] sm:rounded-[40px] lg:aspect-auto lg:h-[336px]">
        <img
          src={post.image}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <span className="text-[14px] font-medium uppercase leading-6 text-brand">
            {post.categoryLabel}
          </span>
          <span
            aria-hidden
            className="flex size-[46px] shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 ease-out group-hover:border-brand group-hover:bg-brand group-hover:text-white"
          >
            <ArrowUpRight className="size-[16.5px]" />
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <h3 className="text-title-lg text-neutral-900 transition-colors duration-300 group-hover:text-brand">
            {post.title}
          </h3>
          <p className="text-body-sm text-neutral-500">{post.excerpt}</p>
        </div>
      </div>
    </Link>
  );
}
