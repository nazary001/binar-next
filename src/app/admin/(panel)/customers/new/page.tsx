import type { Metadata } from "next";
import { NewCustomerScreen, type NewCustomerPreset } from "@/components/admin/customers/NewCustomerScreen";
import { Forbidden } from "@/components/admin/ui/States";
import { requireStaffPage } from "@/server/admin/page";

export const metadata: Metadata = { title: "Новий акаунт" };

type Search = Record<string, string | string[] | undefined>;

function one(search: Search, name: string, max = 200): string {
  const value = search[name];
  const text = Array.isArray(value) ? value[0] : value;
  return (text ?? "").trim().slice(0, max);
}

// Other sections open this page already filled in: a company page with
// ?company=<id>, a form submission with ?name=&email=&phone=&companyName=.
export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { allowed } = await requireStaffPage("customers.edit");
  if (!allowed) return <Forbidden />;
  const search = await searchParams;
  const companyId = one(search, "company", 64);
  const preset: NewCustomerPreset = {
    companyId: /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(companyId) ? companyId : "",
    name: one(search, "name"),
    email: one(search, "email", 254),
    phone: one(search, "phone", 32),
    companyName: one(search, "companyName"),
  };
  return <NewCustomerScreen preset={preset} />;
}
