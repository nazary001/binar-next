import type { Metadata } from "next";
import { Card, NotFoundState, Page } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Сторінку не знайдено" };

// An address under /admin that no page answers: a mistyped link, or a page
// that called notFound(). It renders inside the panel's shell, so the menu
// stays one click away.
export default function PanelNotFound() {
  return (
    <Page width="narrow">
      <Card padding="lg">
        <NotFoundState
          title="Такої сторінки в панелі немає"
          text="Перевірте адресу або оберіть розділ у меню."
          backHref="/admin"
          backLabel="До огляду"
        />
      </Card>
    </Page>
  );
}
