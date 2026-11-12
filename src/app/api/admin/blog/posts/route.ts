import type { BlogPostAnswer, BlogPostsAnswer } from "@/components/admin/blog/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import {
  BLOG_BODY_MAX_BYTES,
  BlogCreateSchema,
  createBlogPost,
  listBlogPosts,
  parseFields,
  releaseSlugs,
  toBlogPostDetail,
} from "@/server/admin/repos/blog";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

// GET /api/admin/blog/posts?status=&category=&q=&sort=&page=&limit=
// The posts of the blog. `status` is what a visitor sees now (a post
// without a stored status counts as published); `q` looks in the title and
// the slug; `sort` is one of sort (the public order, default), updatedAt,
// publishedAt, title, with "-" for descending.
export const GET = adminHandler("content.view", async ({ url }) => {
  const page = await listBlogPosts(url);
  const answer: BlogPostsAnswer = { ok: true, ...page };
  return json(answer);
});

// POST /api/admin/blog/posts - a new draft (BlogPostCreateInput). A draft
// is not public, so the public blog is refreshed only when the new slug
// was an old address of a public post (it stops redirecting there).
export const POST = adminHandler("content.edit", async ({ request, staff }) => {
  const input = await parseFields(request, BlogCreateSchema, BLOG_BODY_MAX_BYTES);
  const doc = await createBlogPost(input, staff);
  if (await releaseSlugs(doc._id, [doc._id])) revalidatePublicData([TAG.blog]);
  await audit(staff, request, {
    action: "blog.create",
    entity: { type: "blog_post", id: doc._id, label: doc.title },
    summary: `Створено чернетку статті «${doc.title}»`,
    meta: { slug: doc._id, category: doc.category },
  });
  const answer: BlogPostAnswer = { ok: true, post: await toBlogPostDetail(doc) };
  return json(answer, 201);
});
