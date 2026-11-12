import { notFound } from "next/navigation";
import { ArticleHero } from "@/components/blog/ArticleHero";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { ReadAlso } from "@/components/blog/ReadAlso";
import { getBlogPost, getBlogPosts } from "@/server/repos/blog";

type Params = { slug: string };

export async function generateStaticParams() {
  return (await getBlogPosts()).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = (await getBlogPost(slug))?.post;
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
  const found = await getBlogPost(slug);
  if (!found) notFound();
  const { post, body } = found;

  // «Читайте також»: the first three listing cards, matching the Figma
  // «Блог :: Стаття» frame (Тендер / ISO 9001 / Клінінг).
  const related = (await getBlogPosts()).slice(0, 3);

  return (
    <div className="flex w-full flex-1 flex-col">
      <ArticleHero post={post} />
      <ArticleBody slug={post.slug} body={body} />
      <ReadAlso posts={related} />
    </div>
  );
}
