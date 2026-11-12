import type { Metadata } from "next";
import { OverviewScreen } from "@/components/admin/overview/OverviewScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Огляд" };

// The overview (the dashboard): what waits for somebody, how sales are
// going, what happened lately. ?period=7d|30d|90d|12m|all chooses the
// period; the screen and its API leave out what the role may not see.
export default async function AdminHomePage() {
  const { allowed } = await requireStaffPage("dashboard.view");
  if (!allowed) return <Forbidden />;
  return <OverviewScreen />;
}
