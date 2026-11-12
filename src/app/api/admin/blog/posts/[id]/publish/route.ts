import type { BlogPostAnswer } from "@/components/admin/blog/types";
import { formatDateTime } from "@/components/admin/lib/format";
import { audit } from "@/server/admin/audit";
import { adminHandler, assertCan, json } from "@/server/admin/http";
import {
  BlogPublishSchema,
  blogIdParam,
  parseFields,
  publishBlogPost,
  toBlogPostDetail,
} from "@/server/admin/repos/blog";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

type Context = { params: Promise<{ id: string }> };

// POST /api/admin/blog/posts/<id>/publish { at? } - puts the post on the
// site now (or at a past moment), or schedules it for a future one. Needs
// content.publish on top of content.edit. 400 "fields" names what a post
// still lacks to go public (title, excerpt, image, blocks).
export const POST = adminHandler<Context>("content.edit", async ({ request, context, staff }) => {
  assertCan(staff, "content.publish");
  const id = blogIdParam((await context.params).id);
  // A bare POST (no body, no content type) means "now".
  const bare = !request.headers.get("content-type") && !Number(request.headers.get("content-length") ?? "0");
  const { at } = bare ? { at: undefined } : await parseFields(request, BlogPublishSchema);
  const write = await publishBlogPost(id, at, staff);
  revalidatePublicData([TAG.blog]);
  const scheduled = write.after.status === "scheduled";
  const when = write.after.publishedAt ? formatDateTime(write.after.publishedAt) : "";
  await audit(staff, request, {
    action: scheduled ? "blog.schedule" : "blog.publish",
    entity: { type: "blog_post", id, label: write.after.title },
    summary: scheduled
      ? `Заплановано публікацію статті «${write.after.title}» на ${when}`
      : `Опубліковано статтю «${write.after.title}»`,
    meta: { publishedAt: write.after.publishedAt?.toISOString() ?? null, from: write.before?.status ?? null },
  });
  const answer: BlogPostAnswer = { ok: true, post: await toBlogPostDetail(write.after) };
  return json(answer);
});
