/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { BlogPost } from "./data";
import { ArrowBack } from "./icons";

// Figma «Блог :: Стаття» hero (2670:6437): a breadcrumb («← Назад до блогу /
// <category>»), the article H1, and a wide rounded cover image.
export function ArticleHero({ post }: { post: BlogPost }) {
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
        <span className="text-[18px] font-semibold leading-[22px] text-stroke-subtle">
          /
        </span>
        <span className="text-[14px] font-medium leading-5 text-brand lg:text-[16px] lg:leading-[22px]">
          {post.category}
        </span>
      </div>

      {/* Title + cover. Below lg the Figma MOBILE master (3176:6105) shows
          a 206-px-tall cover; lg keeps the wide 1180/515 banner. */}
      <div className="flex flex-col gap-12 lg:gap-10">
        <h1 className="text-h1 text-neutral-900">{post.title}</h1>
        <div className="relative h-[206px] w-full overflow-hidden rounded-[32px] sm:h-[280px] sm:rounded-[40px] lg:aspect-[1180/515] lg:h-auto">
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
