import { Button } from "@/components/ui/Button";
import { CardGrid } from "./CardGrid";
import type { BlogPost } from "./data";

// Figma «Frame 1010106720» (2670:6478): the «Читайте також» heading with an
// «Всі статті» button, above a 3-up row of related article cards.
export function ReadAlso({ posts }: { posts: BlogPost[] }) {
  return (
    <section className="lg-pad-x flex flex-col gap-10 px-5 py-12 sm:px-10 sm:py-16 lg:gap-20 lg:py-20">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <h2 className="flex-1 text-h2 text-neutral-900">Читайте також</h2>
        <Button href="/blog" arrow>
          Всі статті
        </Button>
      </div>
      <CardGrid posts={posts} />
    </section>
  );
}
