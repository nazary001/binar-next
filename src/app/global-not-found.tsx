import type { Metadata } from "next";
import { NotFoundBody } from "@/components/NotFoundBody";
import { SiteShell } from "@/components/SiteShell";
import { SITE_METADATA } from "@/lib/site-metadata";
import { Document } from "./document";

// The page of an address no route owns (experimental.globalNotFound in
// next.config.ts). The site and the staff area are two separate documents,
// so Next has no layout of its own to draw a "not found" page in; this file
// is that page, whole: the document, the site around it (header, footer,
// cart, account) and the 404 words. Next builds it once and serves it for
// every unknown address, and it is not part of any other page.
export const metadata: Metadata = SITE_METADATA;

export default function GlobalNotFound() {
  return (
    <Document>
      <SiteShell>
        <NotFoundBody />
      </SiteShell>
    </Document>
  );
}
