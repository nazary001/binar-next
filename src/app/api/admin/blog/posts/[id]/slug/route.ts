import type { BlogPostAnswer } from "@/components/admin/blog/types";
import { audit } from "@/server/admin/audit";
import { adminHandler, json } from "@/server/admin/http";
import {
  BlogSlugSchema,
  blogIdParam,
  parseFields,
  renameBlogPost,
  toBlogPostDetail,
  touchesPublic,
} from "@/server/admin/repos/blog";
import { TAG } from "@/server/cache-tags";
import { revalidatePublicData } from "@/server/revalidate";

type Context = { params: Promise<{ id: string }> };

// POST /api/admin/blog/posts/<id>/slug { slug } - changes the address of
// the post (its id). 409 "exists" when the new slug is taken; a public
// post also needs content.publish. The old address of a public post keeps
// working: the post remembers it (previousSlugs) and /blog/<old> answers a
// permanent redirect to the new one. The public blog is refreshed when the
// post is public or another public post lost an old address to it.
export const POST = adminHandler<Context>("content.edit", async ({ request, context, staff }) => {
  const id = blogIdParam((await context.params).id);
  const { slug } = await parseFields(request, BlogSlugSchema);
  const write = await renameBlogPost(id, slug, staff);
  if (write.after._id !== id) {
    if (touchesPublic(write) || write.released) revalidatePublicData([TAG.blog]);
    await audit(staff, request, {
      action: "blog.slug",
      entity: { type: "blog_post", id: write.after._id, label: write.after.title },
      summary: `Змінено адресу статті «${write.after.title}»: /blog/${id} -> /blog/${write.after._id}`,
      meta: { from: id, to: write.after._id },
    });
  }
  const answer: BlogPostAnswer = { ok: true, post: await toBlogPostDetail(write.after) };
  return json(answer);
});
