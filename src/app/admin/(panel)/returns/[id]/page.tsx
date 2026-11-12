import type { Metadata } from "next";
import { ReturnScreen } from "@/components/admin/returns/ReturnScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

type Props = { params: Promise<{ id: string }> };

// A request id is a plain number ("9104"); anything that does not decode
// is passed on as it is and ends as "not found".
function idOf(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Повернення №${idOf(id)}` };
}

export default async function ReturnPage({ params }: Props) {
  const { allowed } = await requireStaffPage("returns.view");
  if (!allowed) return <Forbidden />;
  const { id } = await params;
  return <ReturnScreen id={idOf(id)} />;
}
