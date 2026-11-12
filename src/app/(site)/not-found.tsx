import { NotFoundBody } from "@/components/NotFoundBody";

// notFound() of a page of the site (an unknown product, article or folder):
// drawn inside the site's layout, so the header and the footer stay.
export default function NotFound() {
  return <NotFoundBody />;
}
