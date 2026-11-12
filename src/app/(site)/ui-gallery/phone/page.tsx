import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PhoneAtomsGallery } from "./PhoneAtomsGallery";

export const metadata: Metadata = {
  title: "UI gallery - phone atoms",
  robots: { index: false, follow: false },
};

// The F2 phone atoms of the mobile pass (system spec 3.4: A7-A12, A14-A16,
// A18, A19, A22, A24, A25, A26 fields, A28) in their states, for
// screenshots and geometry checks at phone widths (open it at 320 / 390;
// every section carries `data-gallery="<id>"`). A dev tool: production
// builds answer 404.
export default function PhoneAtomsGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PhoneAtomsGallery />;
}
