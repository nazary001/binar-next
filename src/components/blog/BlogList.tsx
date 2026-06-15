"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CardGrid } from "./CardGrid";
import { BLOG_CATEGORIES, type BlogPost } from "./data";

const INITIAL_VISIBLE = 6;
const STEP = 3;

// Figma «Frame 1010106611 + 1010106720»: the filter chip bar, a hairline
// divider, the card grid and the «Показати більше» button. The chips and
// the button are made functional here — clicking a chip filters by category
// (and resets pagination); the button reveals more cards.
export function BlogList({ posts }: { posts: BlogPost[] }) {
  const [active, setActive] = useState<string>(BLOG_CATEGORIES[0]);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const filtered =
    active === BLOG_CATEGORIES[0]
      ? posts
      : posts.filter((p) => p.category === active);
  const shown = filtered.slice(0, visible);
  const hasMore = shown.length < filtered.length;

  return (
    <section className="lg-pad-x flex flex-col px-5 pb-12 sm:px-10 sm:pb-16 lg:pb-20">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-3 pt-12 sm:gap-4 sm:pt-16 lg:gap-6 lg:pt-[160px]">
        {BLOG_CATEGORIES.map((cat) => {
          const isActive = cat === active;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActive(cat);
                setVisible(INITIAL_VISIBLE);
              }}
              aria-pressed={isActive}
              className={`cursor-pointer rounded-[60px] px-4 py-3 text-[16px] font-medium leading-[22px] transition-colors duration-300 ${
                isActive
                  ? "bg-brand text-white"
                  : "border border-neutral-800 text-neutral-800 hover:border-brand hover:text-brand"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Divider — Figma Vector60 stroke is #8e8e8f (stroke-default),
          darker than the card dividers (#d2d2d2). */}
      <div
        aria-hidden
        className="mt-8 h-px w-full bg-stroke-default sm:mt-10 lg:mt-12"
      />

      {/* Card grid */}
      <div className="mt-10 sm:mt-12 lg:mt-[160px]">
        {shown.length > 0 ? (
          <CardGrid posts={shown} />
        ) : (
          <p className="text-body-md text-neutral-500">
            Незабаром тут зʼявляться статті цієї категорії.
          </p>
        )}
      </div>

      {/* Show more */}
      {hasMore && (
        <div className="mt-12 flex justify-center sm:mt-16 lg:mt-20">
          <Button plus onClick={() => setVisible((v) => v + STEP)}>
            Показати більше
          </Button>
        </div>
      )}
    </section>
  );
}
