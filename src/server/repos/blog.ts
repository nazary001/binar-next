import "server-only";
import { unstable_cache } from "next/cache";
import type { Filter } from "mongodb";
import type { BlogPost } from "@/components/blog/data";
import { PUBLIC_REVALIDATE_SECONDS, TAG } from "../cache-tags";
import { collection, type BlogBlock, type BlogBody, type BlogPostDoc } from "../db/collections";

// Blog repository (package C). The whole blog (9 posts with their bodies)
// is one small cached read (tag "blog", 5 minutes, POST /api/revalidate
// drops it); the listing, the article pages, generateStaticParams and the
// sitemap all take what they need from it, so an unknown slug never costs
// a query or a cache entry of its own.
//
// Only public posts are read (admin panel): a post is public when it has
// no status (the seed, anything older than the panel), is "published", or
// is "scheduled" for a moment that has passed. A scheduled post therefore
// appears at the first read after its moment, i.e. within the cache period
// above. Drafts never reach the cache, so neither the pages nor the
// sitemap can leak one.

// What the richer renderer of a later task needs besides the classic body.
// Plain data only (ISO strings, no Date): the entry is cached by
// unstable_cache and must survive JSON.
export type BlogEntryMeta = {
  publishedAt: string | null;
  // "" = none typed (the renderer falls back to the setting).
  author: string;
  readingMinutes: number | null;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
};

export type BlogEntry = {
  post: BlogPost;
  body: BlogBody;
  // The editor's body; present only on posts saved by the admin editor.
  blocks?: BlogBlock[];
  meta?: BlogEntryMeta;
};

function copyBlock(block: BlogBlock): BlogBlock {
  switch (block.type) {
    case "list":
      return { type: "list", ordered: block.ordered, items: [...block.items] };
    case "heading":
      return { type: "heading", level: block.level, text: block.text };
    case "image":
      return { type: "image", src: block.src, alt: block.alt, caption: block.caption };
    case "quote":
      return { type: "quote", text: block.text, author: block.author };
    case "divider":
      return { type: "divider" };
    default:
      return { type: block.type, text: block.text };
  }
}

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
    ...(doc.blocks && doc.blocks.length > 0 ? { blocks: doc.blocks.map(copyBlock) } : {}),
    meta: {
      publishedAt: doc.publishedAt instanceof Date ? doc.publishedAt.toISOString() : null,
      author: doc.author ?? "",
      readingMinutes: typeof doc.readingMinutes === "number" ? doc.readingMinutes : null,
      coverAlt: doc.coverAlt ?? "",
      seoTitle: doc.seoTitle ?? "",
      seoDescription: doc.seoDescription ?? "",
    },
  };
}

// The filter of the posts a visitor may see at `now` (also used by the
// admin panel to tell public posts from the others).
export function publicBlogFilter(now: Date = new Date()): Filter<BlogPostDoc> {
  return {
    $or: [
      { status: { $exists: false } },
      { status: "published" },
      { status: "scheduled", publishedAt: { $lte: now } },
    ],
  };
}

// Uncached read of the public posts in listing order (scripts and tests;
// pages use the cached functions below).
export async function readBlogEntries(): Promise<BlogEntry[]> {
  const docs = await (await collection("blogPosts")).find(publicBlogFilter()).sort({ sort: 1, _id: 1 }).toArray();
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
export async function getBlogPost(slug: string): Promise<BlogEntry | null> {
  return (await loadBlog()).find((entry) => entry.post.slug === slug) ?? null;
}
