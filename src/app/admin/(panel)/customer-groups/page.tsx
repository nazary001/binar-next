import type { Metadata } from "next";
import { GroupsScreen } from "@/components/admin/groups/GroupsScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Групи покупців" };

// The buyer groups; one opens in a drawer from ?id=<group id> (or ?id=new).
export default async function CustomerGroupsPage() {
  const { allowed } = await requireStaffPage("customers.view");
  if (!allowed) return <Forbidden />;
  return <GroupsScreen />;
}
