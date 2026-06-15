import { Fragment } from "react";
import type { BlogPost } from "./data";
import { BlogCard } from "./BlogCard";

// Figma «Frame 197 / 200»: a 3-up card row where each card is 340 wide,
// separated by a full-height 1-px hairline centred in an 80-px gutter
// (gap-40 + 0-width vector + gap-40). To reproduce the exact 340 widths
// AND the centred dividers — while still handling a variable number of
// filtered cards — we chunk posts into rows of 3 and lay each row out as a
// flex row of equal (flex-1) cards with `w-px` dividers between them.
//
// Below lg the dividers disappear and the cards reflow to a 1- (mobile) or
// 2-column (sm) grid.

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function CardGrid({ posts }: { posts: BlogPost[] }) {
  const rows = chunk(posts, 3);
  return (
    <div className="flex flex-col gap-10 lg:gap-20">
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:flex lg:gap-10"
        >
          {row.map((post, ci) => (
            <Fragment key={post.slug}>
              {ci > 0 && (
                <div
                  aria-hidden
                  className="hidden w-px shrink-0 self-stretch bg-stroke-subtle lg:block"
                />
              )}
              <div className="min-w-0 lg:flex-1">
                <BlogCard post={post} />
              </div>
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
