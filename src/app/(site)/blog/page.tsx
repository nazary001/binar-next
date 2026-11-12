import { BlogHero } from "@/components/blog/BlogHero";
import { BlogList } from "@/components/blog/BlogList";
import { getBlogPosts, getBlogSettings } from "@/server/repos/blog";

export const metadata = {
  title: "Блог",
  description:
    "Блог для тих, хто відповідає за якість. Практичні матеріали про готельне оснащення, клінінг і закупівлі. Без води — тільки по суті.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  // The chips come from the blog settings (same cached read as the posts).
  const [posts, settings] = await Promise.all([getBlogPosts(), getBlogSettings()]);
  // The card over the hero photo features the first public article of the
  // list (staff choose it by moving an article to the top in the admin
  // panel); with no public article there is no card.
  const featured = posts[0] ?? null;
  return (
    // lg:pt-5 — the 3603:11433 / 2670:6353 masters start the page content
    // 20 px below the 92-px header bar (content frame at y=112). Mobile
    // master keeps the hero flush under the bar.
    <div className="flex w-full flex-1 flex-col lg:pt-5">
      <BlogHero featured={featured} />
      <BlogList posts={posts} categories={settings.categories} />
    </div>
  );
}
