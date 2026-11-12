import type { Metadata } from "next";
import { PasswordForm } from "@/components/admin/auth/PasswordForm";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Новий пароль" };

// Shown instead of the panel while the account still has the password it
// was created with; also reachable later to change the password.
export default async function AdminPasswordPage() {
  const { me } = await requireStaffPage(null, { allowPasswordChange: true });
  return <PasswordForm name={me.name} forced={me.mustChangePassword} />;
}
