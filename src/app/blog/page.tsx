import { BlogHero } from "@/components/blog/BlogHero";
import { BlogList } from "@/components/blog/BlogList";
import { BLOG_POSTS } from "@/components/blog/data";

export const metadata = {
  title: "Блог",
  description:
    "Блог для тих, хто відповідає за якість. Практичні матеріали про готельне оснащення, клінінг і закупівлі. Без води — тільки по суті.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    // lg:pt-5 — the 3603:11433 / 2670:6353 masters start the page content
    // 20 px below the 92-px header bar (content frame at y=112). Mobile
    // master keeps the hero flush under the bar.
    <main className="flex w-full flex-1 flex-col lg:pt-5">
      <BlogHero />
      <BlogList posts={BLOG_POSTS} />
    </main>
  );
}
