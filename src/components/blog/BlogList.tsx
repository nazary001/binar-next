"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CardGrid } from "./CardGrid";
import { BLOG_CATEGORIES, type BlogPost } from "./data";

const INITIAL_VISIBLE = 6;
const STEP = 3;

// One batch of cards revealed by a single «Показати більше» click. It mounts
// closed and animates open on the next frame, so the reveal unfolds smoothly
// instead of the cards popping in. The grid 0fr → 1fr row track is the
// height-auto animation (the same mechanism the FAQ «Показати більше» uses on
// the other pages); the inner cards fade + slide up on top of it. The
// inter-row gap lives INSIDE the clipped area (its pt) so a still-closed batch
// adds zero height. Each batch is keyed by its start index in BlogList, so an
// already-open batch never re-animates when the next one is appended.
function RevealBatch({ posts }: { posts: BlogPost[] }) {
  const [open, setOpen] = useState(false);

  // Flip to open after the closed state has been painted (double rAF), or the
  // browser would coalesce both states into one frame and skip the transition.
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setOpen(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  return (
    <div
      className={`grid w-full transition-[grid-template-rows] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">
        {/* pt-* is the inter-row gap (matches CardGrid's gap-10 lg:gap-20); it
            sits inside the clip so it grows with the expansion. transition is
            on `translate` (not `transform`) because Tailwind v4 compiles
            translate-y-* to the individual translate property. */}
        <div
          className={`pt-12 transition-[opacity,translate] duration-500 ease-out lg:pt-20 ${
            open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <CardGrid posts={posts} />
        </div>
      </div>
    </div>
  );
}

// Figma «Frame 1010106611 + 1010106720»: the filter chip bar, a hairline
// divider, the card grid and the «Показати більше» button. The chips and
// the button are made functional here — clicking a chip filters by category
// (and resets pagination); the button reveals more cards, each batch
// unfolding with the smooth height + fade animation above.
export function BlogList({ posts }: { posts: BlogPost[] }) {
  const [active, setActive] = useState<string>(BLOG_CATEGORIES[0]);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const filtered =
    active === BLOG_CATEGORIES[0]
      ? posts
      : posts.filter((p) => p.category === active);

  // The first INITIAL_VISIBLE cards render straight into the grid; everything
  // past them is split into the STEP-sized batches that each click revealed,
  // so every batch can animate open independently.
  const base = filtered.slice(0, INITIAL_VISIBLE);
  const revealed = filtered.slice(INITIAL_VISIBLE, visible);
  const batches: { start: number; posts: BlogPost[] }[] = [];
  for (let i = 0; i < revealed.length; i += STEP) {
    batches.push({
      start: INITIAL_VISIBLE + i,
      posts: revealed.slice(i, i + STEP),
    });
  }
  const hasMore = visible < filtered.length;

  return (
    <section className="lg-pad-x flex flex-col px-6 pb-[60px] sm:px-10 sm:pb-16 lg:pb-20">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 pt-[60px] sm:gap-3 sm:pt-16 lg:gap-6 lg:pt-[160px]">
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
              // py-[7px]: the Figma chips are 36px tall with the stroke
              // INSIDE (7 + 20 + 7 + 2 borders = 36); the active chip
              // carries a transparent border below lg so both variants
              // share the exact box (lg keeps its original py-3 sizing).
              className={`cursor-pointer rounded-[60px] px-4 py-[7px] text-[14px] font-medium leading-[20px] transition-colors duration-300 lg:py-3 lg:text-[16px] lg:leading-[22px] ${
                isActive
                  ? "border border-transparent bg-brand text-white lg:border-0"
                  : "border border-stroke-default text-neutral-800 hover:border-brand hover:text-brand"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Divider — Figma Vector60 stroke is #8e8e8f (stroke-default),
          darker than the card dividers (#d2d2d2). -mb-px: the master's
          divider is a zero-height stroke that consumes no flow space. */}
      <div
        aria-hidden
        className="-mb-px mt-12 h-px w-full bg-stroke-default sm:mt-12 lg:mt-12"
      />

      {/* Card grid — base cards plus the smoothly-revealed batches. They share
          one block-flow wrapper (NOT a gapped flex parent) so a closed batch
          contributes zero height; each batch carries its own top gap inside
          its clip. */}
      <div className="mt-[60px] sm:mt-[60px] lg:mt-[160px]">
        {base.length > 0 ? (
          <div>
            <CardGrid posts={base} />
            {batches.map((b) => (
              <RevealBatch key={b.start} posts={b.posts} />
            ))}
          </div>
        ) : (
          <p className="text-body-md text-neutral-500">
            Незабаром тут зʼявляться статті цієї категорії.
          </p>
        )}
      </div>

      {/* Show more */}
      {hasMore && (
        <div className="mt-12 flex justify-center sm:mt-16 lg:mt-20">
          <Button plus size="responsive" onClick={() => setVisible((v) => v + STEP)}>
            Показати більше
          </Button>
        </div>
      )}
    </section>
  );
}
