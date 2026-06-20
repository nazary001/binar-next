import { Faq } from "../home/Faq";

// Hotels FAQ uses the same 4 default questions + icon row. The Figma
// MOBILE master (3137:15570) ends with a "Показати більше" button, so it
// is shown below lg only via moreButtonMobileOnly; the desktop layout
// keeps its current button-less ending unchanged.
export function HotelFaq() {
  return <Faq moreButtonMobileOnly />;
}
