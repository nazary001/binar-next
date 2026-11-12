import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Forbidden } from "@/components/admin/ui";
import { Gallery } from "@/components/admin/ui-kit/Gallery";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "UI-кіт панелі" };

// The kit's gallery: every component of src/components/admin/ui in every
// state, for the people who build the panel's screens. Development only.
// Any member of staff may open it; the guard has the shape every panel
// page uses (and imports from the kit's barrel, as server pages may). The
// toast, dialog and search hosts it demonstrates are the shell's own.
export default async function UiKitPage() {
  const { allowed } = await requireStaffPage();
  if (process.env.NODE_ENV === "production") notFound();
  if (!allowed) return <Forbidden />;
  return <Gallery />;
}
