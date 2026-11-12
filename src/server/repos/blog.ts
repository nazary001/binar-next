import "server-only";
import { unstable_cache } from "next/cache";
import type { BlogPost } from "@/components/blog/data";
import { PUBLIC_REVALIDATE_SECONDS, TAG } from "../cache-tags";
import { collection, type BlogBody, type BlogPostDoc } from "../db/collections";

// Blog repository (package C). The whole blog (9 posts with their bodies)
// is one small cached read (tag "blog", 5 minutes, POST /api/revalidate
// drops it); the listing, the article pages, generateStaticParams and the
// sitemap all take what they need from it, so an unknown slug never costs
// a query or a cache entry of its own.

export type BlogEntry = { post: BlogPost; body: BlogBody };

function toEntry(doc: BlogPostDoc): BlogEntry {
  return {
    post: {
      slug: doc._id,
      category: doc.category,
      categoryLabel: doc.categoryLabel,
      title: doc.title,
      excerpt: doc.excerpt,
      image: doc.image,
    },
    body: {
      intro: doc.body.intro,
      sections: doc.body.sections.map((s) => ({ heading: s.heading, paragraphs: [...s.paragraphs] })),
      listSection: { heading: doc.body.listSection.heading, items: [...doc.body.listSection.items] },
      tags: [...doc.body.tags],
    },
  };
}

// Uncached read in listing order (scripts and tests; pages use the cached
// functions below).
export async function readBlogEntries(): Promise<BlogEntry[]> {
  const docs = await (await collection("blogPosts")).find({}).sort({ sort: 1, _id: 1 }).toArray();
  return docs.map(toEntry);
}

const loadBlog: () => Promise<BlogEntry[]> = unstable_cache(readBlogEntries, ["blog:entries"], {
  tags: [TAG.blog],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});

// The listing cards in listing order (no bodies).
export async function getBlogPosts(): Promise<BlogPost[]> {
  return (await loadBlog()).map((entry) => entry.post);
}

// One article with its body, or null for an unknown slug.
export async function getBlogPost(slug: string): Promise<{ post: BlogPost; body: BlogBody } | null> {
  return (await loadBlog()).find((entry) => entry.post.slug === slug) ?? null;
}
