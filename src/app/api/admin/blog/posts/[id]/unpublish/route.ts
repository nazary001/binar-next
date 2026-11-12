import type { BlogPostAnswer } from "@/components/admin/blog/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, assertCan, json } from "@/server/admin/http";
import { blogIdParam, toBlogPostDetail, unpublishBlogPost } from "@/server/admin/repos/blog";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

type Context = { params: Promise<{ id: string }> };

// POST /api/admin/blog/posts/<id>/unpublish - back to a draft: the article
// leaves the site (and a scheduled one will not appear). Needs
// content.publish on top of content.edit.
export const POST = adminHandler<Context>("content.edit", async ({ request, context, staff }) => {
  assertCan(staff, "content.publish");
  const id = blogIdParam((await context.params).id);
  const write = await unpublishBlogPost(id, staff);
  revalidatePublicData([TAG.blog]);
  await audit(staff, request, {
    action: "blog.unpublish",
    entity: { type: "blog_post", id, label: write.after.title },
    summary: `Статтю «${write.after.title}» знято з публікації`,
    meta: { from: write.before?.status ?? null },
  });
  const answer: BlogPostAnswer = { ok: true, post: await toBlogPostDetail(write.after) };
  return json(answer);
});
