import { Faq } from "../home/Faq";

// Hotels FAQ uses the same 4 default questions + icon row, but the
// Figma master here ends right after the last question — no "Показати
// більше" expand button. Override with showMoreButton={false}.
export function HotelFaq() {
  return <Faq showMoreButton={false} />;
}
