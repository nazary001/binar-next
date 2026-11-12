import type { Metadata } from "next";
import { IntegrationsHub } from "@/components/admin/integrations/IntegrationsHub";
import { kyivDay } from "@/components/admin/lib/format";
import { Forbidden } from "@/components/admin/ui";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Інтеграції" };

// The moment of the request is read here, on the server, so the screen
// renders the same "this month" and "5 хв тому" on both sides.
function clock(): { monthStart: string; now: number } {
  const now = new Date();
  return { monthStart: `${kyivDay(now).slice(0, 8)}01`, now: now.getTime() };
}

export default async function IntegrationsPage() {
  const { allowed } = await requireStaffPage("integrations.view");
  if (!allowed) return <Forbidden />;
  const { monthStart, now } = clock();
  return <IntegrationsHub monthStart={monthStart} now={now} />;
}
