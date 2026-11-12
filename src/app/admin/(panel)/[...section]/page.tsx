import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/admin/page";

// Any panel address that has no page of its own. The visitor is asked to
// sign in first (an anonymous request learns nothing about which addresses
// exist), then gets the panel's own "not found" page (not-found.tsx next to
// the layout) with the proper 404 status.
export default async function UnknownPanelPage() {
  await requireStaffPage();
  notFound();
}
