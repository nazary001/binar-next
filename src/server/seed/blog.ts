import "server-only";
import type { BlogPostDoc } from "../db/collections";
import { ARTICLE_BODY, BLOG_POSTS } from "./data/blog";
import { replaceSeedDocs, type SeedContext } from "./util";

// Seeds the 9 blog posts in listing order. Every post gets its own copy of
// the one article body the design writes out, so a post can be rewritten
// in the database without touching the others.
export async function seedBlog(ctx: SeedContext): Promise<string> {
  void ctx;
  const docs: BlogPostDoc[] = BLOG_POSTS.map((post, sort) => ({
    _id: post.slug,
    category: post.category,
    categoryLabel: post.categoryLabel,
    title: post.title,
    excerpt: post.excerpt,
    image: post.image,
    sort,
    body: structuredClone(ARTICLE_BODY),
  }));
  return replaceSeedDocs("blogPosts", docs);
}
