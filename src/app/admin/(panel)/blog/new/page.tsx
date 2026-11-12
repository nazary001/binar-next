import type { Metadata } from "next";
import { BlogEditorScreen } from "@/components/admin/blog/BlogEditorScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Нова стаття" };

// A new article: writing one needs content.edit (a read-only role has
// nothing to do here).
export default async function NewBlogPostPage() {
  const { allowed } = await requireStaffPage("content.edit");
  if (!allowed) return <Forbidden />;
  return <BlogEditorScreen id={null} />;
}
