import type { BlogOptionsAnswer } from "@/components/admin/blog/types";
import { adminHandler, json } from "@/server/admin/http";
import { blogOptions } from "@/server/admin/repos/blog";

// GET /api/admin/blog/options - what the blog editor offers: the categories
// of the settings (the chips of the public list), the default author and
// the old addresses posts keep (the address dialog warns before taking one).
export const GET = adminHandler("content.view", async () => {
  const answer: BlogOptionsAnswer = { ok: true, ...(await blogOptions()) };
  return json(answer);
});
