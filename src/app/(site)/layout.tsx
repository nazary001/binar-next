import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { SITE_METADATA } from "@/lib/site-metadata";
import { Document } from "../document";

// The root layout of the public site and the customer cabinet: the
// document, their search metadata and everything they stand in (SiteShell:
// the catalog registry, the cart, the account, the header and the footer).
// The staff area has a root layout of its own (src/app/admin/layout.tsx)
// and gets none of this.
export const metadata: Metadata = SITE_METADATA;

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Document>
      <SiteShell>{children}</SiteShell>
    </Document>
  );
}
