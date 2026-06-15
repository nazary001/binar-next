import { notFound } from "next/navigation";
import { ArticleHero } from "@/components/blog/ArticleHero";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { ReadAlso } from "@/components/blog/ReadAlso";
import { BLOG_POSTS } from "@/components/blog/data";

type Params = { slug: string };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return { title: "Стаття" };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  // «Читайте також»: the first three listing cards, matching the Figma
  // «Блог :: Стаття» frame (Тендер / ISO 9001 / Клінінг).
  const related = BLOG_POSTS.slice(0, 3);

  return (
    <main className="flex w-full flex-1 flex-col">
      <ArticleHero post={post} />
      <ArticleBody slug={post.slug} />
      <ReadAlso posts={related} />
    </main>
  );
}
