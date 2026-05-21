import { Faq } from "../home/Faq";

// Figma 1384:12187 — the hotels FAQ section is rendered with the SAME
// four questions and the same icon row as the home FAQ. We render the
// shared component with default props (default FAQ entries + filter
// icons visible) instead of overriding either.
export function HotelFaq() {
  return <Faq />;
}
