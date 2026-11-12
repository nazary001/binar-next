import type { Metadata } from "next";
import { MailScreen } from "@/components/admin/mail/MailScreen";
import { Forbidden } from "@/components/admin/ui";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Пошта" };

// A message of the outbox opens in a drawer from ?id=<message> (the
// exchange journal links there).
export default async function MailPage() {
  const { allowed } = await requireStaffPage("integrations.view");
  if (!allowed) return <Forbidden />;
  return <MailScreen />;
}
