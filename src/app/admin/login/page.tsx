import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/auth/LoginForm";
import { readStaff } from "@/server/admin/auth";

export const metadata: Metadata = { title: "Вхід" };

// Where to go after signing in: only a path inside the panel is accepted,
// so the address bar cannot be used to send staff elsewhere.
function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !/^\/admin(?:\/[A-Za-z0-9\-._~%!$&'()*+,;=:@/?]*)?$/.test(next)) return "/admin";
  if (next.startsWith("/admin/login") || next.startsWith("/admin/password")) return "/admin";
  return next;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const staff = await readStaff();
  if (staff) redirect(staff.staff.mustChangePassword ? "/admin/password" : "/admin");
  const { next } = await searchParams;
  return <LoginForm next={safeNext(next)} />;
}
