import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileView } from "@/components/platform/profile/ProfileView";

export const metadata: Metadata = {
  title: "Мій профіль",
  description: "Дані акаунту, компанії, контрагенти та співробітники в кабінеті бізнес-клієнта Binar 2000.",
  robots: { index: false, follow: false },
};

// «Мій профіль» - Figma «Мій профіль : Admin» 4868:30956: the partner
// admin's profile inside the platform shell, `?tab=counterparties`
// (default, 4868:30958) or `?tab=employees` (4868:31376). The tab is read
// on the client (useSearchParams), so the view sits in a Suspense
// boundary and the route stays static; visitors get a sign-in prompt.
export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileView />
    </Suspense>
  );
}
