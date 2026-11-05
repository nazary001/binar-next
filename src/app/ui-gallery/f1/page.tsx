import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { F1Gallery } from "./F1Gallery";

export const metadata: Metadata = {
  title: "UI gallery: F1",
  robots: { index: false, follow: false },
};

// The F1 phone atoms (Button sizes, Sheet, Modal718 phone card / sheet,
// ConfirmModal, StickyBar, Toast) in every state, for screenshots and
// geometry checks at phone widths. ?open=<key> opens one overlay on load
// (see F1Gallery). A dev tool: production builds answer 404.
export default function UiGalleryF1Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <F1Gallery />;
}
