import type { Metadata } from "next";
import { ReturnsScreen } from "@/components/admin/returns/ReturnsScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Повернення" };

export default async function ReturnsPage() {
  const { allowed } = await requireStaffPage("returns.view");
  if (!allowed) return <Forbidden />;
  return <ReturnsScreen />;
}
