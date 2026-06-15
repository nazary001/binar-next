/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { BlogPost } from "./data";
import { ArrowBack } from "./icons";

// Figma «Блог :: Стаття» hero (2670:6437): a breadcrumb («← Назад до блогу /
// <category>»), the article H1, and a wide rounded cover image.
export function ArticleHero({ post }: { post: BlogPost }) {
  return (
    <section className="lg-pad-x flex flex-col gap-12 px-5 pt-10 sm:px-10 sm:pt-14 lg:gap-[88px] lg:pt-20">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/blog" className="group flex items-center gap-4">
          <span className="flex size-[40px] shrink-0 items-center justify-center rounded-[26px] border border-neutral-900 text-neutral-900 transition-colors duration-300 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
            <ArrowBack className="w-[20px]" />
          </span>
          <span className="text-[18px] font-semibold leading-[22px] tracking-[0.18px] text-neutral-800 transition-colors duration-300 group-hover:text-brand">
            Назад до блогу
          </span>
        </Link>
        <span className="text-[18px] font-semibold leading-[22px] text-stroke-subtle">
          /
        </span>
        <span className="text-[16px] font-medium leading-[22px] text-brand">
          {post.category}
        </span>
      </div>

      {/* Title + cover */}
      <div className="flex flex-col gap-8 lg:gap-10">
        <h1 className="text-h1 text-neutral-900">{post.title}</h1>
        <div className="relative aspect-[1180/515] w-full overflow-hidden rounded-[28px] sm:rounded-[40px]">
          <img
            src={post.image}
            alt={post.title}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
