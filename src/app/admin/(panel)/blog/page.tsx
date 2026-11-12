import type { Metadata } from "next";
import { BlogListScreen } from "@/components/admin/blog/BlogListScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Блог" };

// The articles of the blog, in the order the site shows them.
export default async function BlogPage() {
  const { allowed } = await requireStaffPage("content.view");
  if (!allowed) return <Forbidden />;
  return <BlogListScreen />;
}
