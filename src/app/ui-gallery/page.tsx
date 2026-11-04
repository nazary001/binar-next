import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UiGallery } from "./UiGallery";

export const metadata: Metadata = {
  title: "UI gallery",
  robots: { index: false, follow: false },
};

// Every shared cabinet atom in every state, for screenshots and geometry
// checks (renders inside the platform shell with the B2B seed session).
// ?modal=confirm | documents opens the live overlay on load.
// A dev tool: production builds answer 404 (PlatformChrome drops the
// route from the platform shell there too).
export default function UiGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiGallery />;
}
