import type { Metadata } from "next";
import { BlogEditorScreen } from "@/components/admin/blog/BlogEditorScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Стаття" };

// One article (the id is its address on the site). A read-only role sees
// it as a reader would, without the controls that change it.
export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { allowed } = await requireStaffPage("content.view");
  if (!allowed) return <Forbidden />;
  const { id } = await params;
  return <BlogEditorScreen id={decoded(id)} />;
}

// A malformed escape in the address is left as typed (the API answers 404).
function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
