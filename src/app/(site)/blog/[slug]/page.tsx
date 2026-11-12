import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ArticleHero, type ArticleBylineData } from "@/components/blog/ArticleHero";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { ReadAlso } from "@/components/blog/ReadAlso";
import {
  findBlogRedirect,
  getBlogPost,
  getBlogPosts,
  getBlogSettings,
  type BlogEntry,
  type BlogPublicSettings,
} from "@/server/repos/blog";

type Params = { slug: string };

const SITE_URL = "https://binar-2000.com";
const SITE_NAME = "Binar 2000";

export async function generateStaticParams() {
  // Current addresses only; an old one (previousSlugs) is a redirect that
  // renders on demand.
  return (await getBlogPosts()).map((post) => ({ slug: post.slug }));
}

// What the search result and the share card say: the editor's SEO fields
// when set, else the title and the card excerpt (what the page always used).
function seoOf(entry: BlogEntry) {
  return {
    title: entry.meta?.seoTitle || entry.post.title,
    description: entry.meta?.seoDescription || entry.post.excerpt,
  };
}

// The author the page names: the editor's, else the blog's default.
function authorOf(entry: BlogEntry, settings: BlogPublicSettings): string {
  return (entry.meta?.author || settings.defaultAuthor).trim();
}

// Only posts written in the admin panel carry a byline (author, date,
// reading time); a classic post shows none, as it always has.
function bylineOf(entry: BlogEntry, settings: BlogPublicSettings): ArticleBylineData | null {
  const meta = entry.meta;
  if (!meta || (!meta.author && !meta.publishedAt && meta.readingMinutes === null)) return null;
  return { author: authorOf(entry, settings), publishedAt: meta.publishedAt, readingMinutes: meta.readingMinutes };
}

function absolute(path: string): string {
  try {
    return new URL(path, SITE_URL).href;
  } catch {
    return SITE_URL;
  }
}

// schema.org Article for search engines. Serialized with JSON.stringify and
// "<", ">", "&" turned into JSON unicode escapes, so no text of the post can
// close the script element or open markup inside it.
function articleJsonLd(entry: BlogEntry, settings: BlogPublicSettings): string {
  const { post, meta } = entry;
  const { title, description } = seoOf(entry);
  const author = authorOf(entry, settings) || SITE_NAME;
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    ...(post.image ? { image: [absolute(post.image)] } : {}),
    ...(meta?.publishedAt ? { datePublished: meta.publishedAt } : {}),
    ...(meta?.updatedAt ? { dateModified: meta.updatedAt } : {}),
    author: [{ "@type": meta?.author ? "Person" : "Organization", name: author }],
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": absolute(`/blog/${post.slug}`) },
    articleSection: post.category,
    ...(entry.body.tags.length > 0 ? { keywords: entry.body.tags.join(", ") } : {}),
    inLanguage: "uk-UA",
  };
  const backslash = String.fromCharCode(92);
  return JSON.stringify(data).replace(/[<>&]/g, (ch) => `${backslash}u00${ch.charCodeAt(0).toString(16)}`);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getBlogPost(slug);
  if (!entry) return { title: "Стаття" };
  const settings = await getBlogSettings();
  const { post, meta } = entry;
  const { title, description } = seoOf(entry);
  const url = `/blog/${post.slug}`;
  const author = authorOf(entry, settings);
  // No cover (its upload is gone): no picture is announced.
  const images = post.image ? { images: [{ url: post.image, alt: meta?.coverAlt || post.title }] } : {};
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      locale: "uk_UA",
      siteName: SITE_NAME,
      url,
      title,
      description,
      ...images,
      ...(meta?.publishedAt ? { publishedTime: meta.publishedAt } : {}),
      ...(meta?.updatedAt ? { modifiedTime: meta.updatedAt } : {}),
      ...(author ? { authors: [author] } : {}),
      section: post.category,
      ...(entry.body.tags.length > 0 ? { tags: entry.body.tags } : {}),
    },
    twitter: { card: post.image ? "summary_large_image" : "summary", title, description, ...images },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const found = await getBlogPost(slug);
  if (!found) {
    // A post staff renamed keeps its old address working (308).
    const current = await findBlogRedirect(slug);
    if (current) permanentRedirect(`/blog/${current}`);
    notFound();
  }
  const { post, body, blocks, meta } = found;
  const settings = await getBlogSettings();

  // «Читайте також»: the first three listing cards, matching the Figma
  // «Блог :: Стаття» frame (Тендер / ISO 9001 / Клінінг).
  const related = (await getBlogPosts()).slice(0, 3);

  return (
    <div className="flex w-full flex-1 flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJsonLd(found, settings) }} />
      <ArticleHero post={post} coverAlt={meta?.coverAlt} byline={bylineOf(found, settings)} />
      <ArticleBody slug={post.slug} body={body} blocks={blocks} />
      <ReadAlso posts={related} />
    </div>
  );
}
