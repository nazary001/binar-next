import { BlogHero } from "@/components/blog/BlogHero";
import { BlogList } from "@/components/blog/BlogList";
import { BLOG_POSTS } from "@/components/blog/data";

export const metadata = {
  title: "Блог",
  description:
    "Простір для тих, хто будує відповідальний бізнес. Практичні матеріали про стратегічні закупівлі, управління готельним сервісом, безпеку праці та оптимізацію процесів.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <main className="flex w-full flex-1 flex-col">
      <BlogHero />
      <BlogList posts={BLOG_POSTS} />
    </main>
  );
}
