import type { Metadata } from "next";
import { MediaScreen } from "@/components/admin/media/MediaScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Медіатека" };

// Every uploaded picture and document, and where each one is used.
export default async function MediaPage() {
  const { allowed } = await requireStaffPage("content.view");
  if (!allowed) return <Forbidden />;
  return <MediaScreen />;
}
