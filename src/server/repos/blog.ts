import "server-only";
import { unstable_cache } from "next/cache";
import type { Filter } from "mongodb";
import type { ArticleBlock } from "@/components/blog/ArticleBlocks";
import { BLOG_CATEGORIES, type BlogPost } from "@/components/blog/data";
import { getSettings } from "../admin/settings";
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
//
// The same cached read carries what the "blog" settings group decides for
// the public pages (the filter chips, the default author), so saving that
// group (which drops the blog tag) shows at once.

// What the block renderer and the article's metadata need besides the
// classic body. Plain data only (ISO strings, no Date): the entry is cached
// by unstable_cache and must survive JSON.
export type BlogEntryMeta = {
  publishedAt: string | null;
  // The last change made in the admin panel (null on untouched seed posts).
  updatedAt: string | null;
  // "" = none typed (the page falls back to the setting).
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
  // Pictures from the media library carry their pixel size; a picture whose
  // upload is gone or private is left out.
  blocks?: ArticleBlock[];
  meta?: BlogEntryMeta;
  // Addresses the post had before staff renamed it (they redirect here).
  previousSlugs?: string[];
};

// What the "blog" settings group decides for the public pages.
export type BlogPublicSettings = {
  // The filter chips after «Всі статті», in order: the stored list (or the
  // original one when it is empty), without the ones no public post uses.
  categories: string[];
  defaultAuthor: string;
};

type BlogSnapshot = { entries: BlogEntry[]; settings: BlogPublicSettings };

const MEDIA_SRC = /^\/api\/media\/([A-Za-z0-9][A-Za-z0-9_-]{0,63})$/;

type MediaSize = { width: number | null; height: number | null };

// The pixel size of every public upload the posts show (covers and
// picture blocks); a private or missing one is not in the map.
async function publicMediaSizes(docs: readonly BlogPostDoc[]): Promise<Map<string, MediaSize>> {
  const ids = new Set<string>();
  for (const doc of docs) {
    const cover = MEDIA_SRC.exec((doc.image ?? "").trim())?.[1];
    if (cover) ids.add(cover);
    for (const block of doc.blocks ?? []) {
      const id = block.type === "image" ? MEDIA_SRC.exec(block.src.trim())?.[1] : undefined;
      if (id) ids.add(id);
    }
  }
  const sizes = new Map<string, MediaSize>();
  if (ids.size === 0) return sizes;
  const found = await (await collection("media"))
    .find({ _id: { $in: [...ids] }, access: "public" }, { projection: { width: 1, height: 1 } })
    .toArray();
  for (const media of found) sizes.set(media._id, { width: media.width ?? null, height: media.height ?? null });
  return sizes;
}

function copyBlock(block: BlogBlock, sizes: Map<string, MediaSize>): ArticleBlock | null {
  switch (block.type) {
    case "list":
      return { type: "list", ordered: block.ordered === true, items: [...block.items] };
    case "heading":
      return { type: "heading", level: block.level === 3 ? 3 : 2, text: block.text };
    case "image": {
      const src = block.src.trim();
      const mediaId = MEDIA_SRC.exec(src)?.[1];
      // "media:<id>" references never reach the page; the renderer also
      // refuses any address that is not a path or https.
      if (src.startsWith("media:")) return null;
      const size = mediaId ? sizes.get(mediaId) : undefined;
      if (mediaId && !size) return null;
      return {
        type: "image",
        src,
        alt: block.alt ?? "",
        caption: block.caption ?? "",
        ...(size ? { width: size.width, height: size.height } : {}),
      };
    }
    case "quote":
      return { type: "quote", text: block.text, author: block.author ?? "" };
    case "divider":
      return { type: "divider" };
    default:
      return { type: block.type, text: block.text };
  }
}

// The cover as a page may show it: an upload that is gone or private (not
// in `sizes`) leaves no cover, so the pages draw nothing instead of a
// broken picture. Any other address (a file of the site, https) is kept.
function coverOf(image: string | null | undefined, sizes: Map<string, MediaSize>): string {
  const src = (image ?? "").trim();
  const mediaId = MEDIA_SRC.exec(src)?.[1];
  return mediaId && !sizes.has(mediaId) ? "" : src;
}

function iso(value: Date | null | undefined): string | null {
  return value instanceof Date ? value.toISOString() : null;
}

function toEntry(doc: BlogPostDoc, sizes: Map<string, MediaSize>): BlogEntry {
  const blocks = (doc.blocks ?? []).map((block) => copyBlock(block, sizes)).filter((block) => block !== null);
  const previous = (doc.previousSlugs ?? []).filter((slug) => typeof slug === "string" && slug !== doc._id);
  return {
    post: {
      slug: doc._id,
      category: doc.category,
      categoryLabel: doc.categoryLabel,
      title: doc.title,
      excerpt: doc.excerpt,
      image: coverOf(doc.image, sizes),
    },
    body: {
      intro: doc.body.intro,
      sections: doc.body.sections.map((s) => ({ heading: s.heading, paragraphs: [...s.paragraphs] })),
      listSection: { heading: doc.body.listSection.heading, items: [...doc.body.listSection.items] },
      tags: [...doc.body.tags],
    },
    ...(blocks.length > 0 ? { blocks } : {}),
    meta: {
      publishedAt: iso(doc.publishedAt),
      updatedAt: iso(doc.updatedAt),
      author: doc.author ?? "",
      readingMinutes: typeof doc.readingMinutes === "number" ? doc.readingMinutes : null,
      coverAlt: doc.coverAlt ?? "",
      seoTitle: doc.seoTitle ?? "",
      seoDescription: doc.seoDescription ?? "",
    },
    ...(previous.length > 0 ? { previousSlugs: previous } : {}),
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
  const sizes = await publicMediaSizes(docs);
  return docs.map((doc) => toEntry(doc, sizes));
}

// The chips: the stored order, or the original list when staff emptied it
// (or never saved one); a chip that would filter to nothing is dropped.
function publicCategories(stored: readonly string[], entries: readonly BlogEntry[]): string[] {
  const all = BLOG_CATEGORIES[0];
  const source = stored.length > 0 ? stored : BLOG_CATEGORIES.slice(1);
  const used = new Set(entries.map((entry) => entry.post.category));
  return [...new Set(source)].filter((category) => category !== all && used.has(category));
}

async function readBlogSnapshot(): Promise<BlogSnapshot> {
  const [entries, settings] = await Promise.all([readBlogEntries(), getSettings("blog")]);
  return {
    entries,
    settings: { categories: publicCategories(settings.categories, entries), defaultAuthor: settings.defaultAuthor },
  };
}

// "v2": the entry once held a bare array; a new key keeps a cache written
// by the older code from ever being read as the new shape.
const loadBlog: () => Promise<BlogSnapshot> = unstable_cache(readBlogSnapshot, ["blog:v2"], {
  tags: [TAG.blog],
  revalidate: PUBLIC_REVALIDATE_SECONDS,
});

// The listing cards in listing order (no bodies).
export async function getBlogPosts(): Promise<BlogPost[]> {
  return (await loadBlog()).entries.map((entry) => entry.post);
}

// Every public post with its body and dates, in listing order (sitemap).
export async function getBlogEntries(): Promise<BlogEntry[]> {
  return (await loadBlog()).entries;
}

// One article with its body, or null for an unknown slug.
export async function getBlogPost(slug: string): Promise<BlogEntry | null> {
  return (await loadBlog()).entries.find((entry) => entry.post.slug === slug) ?? null;
}

// The current slug of the post that used to live at `slug`, or null. A
// slug a post uses now is never a redirect.
export async function findBlogRedirect(slug: string): Promise<string | null> {
  const { entries } = await loadBlog();
  if (entries.some((entry) => entry.post.slug === slug)) return null;
  return entries.find((entry) => entry.previousSlugs?.includes(slug))?.post.slug ?? null;
}

// The chips and the default author (settings group "blog").
export async function getBlogSettings(): Promise<BlogPublicSettings> {
  return (await loadBlog()).settings;
}
