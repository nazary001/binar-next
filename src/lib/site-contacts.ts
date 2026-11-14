// The company's public contacts, in one place. The footer «Контакти»
// block (src/components/Footer.tsx: phone, e-mail, address and the three
// social buttons) reads them; anything else on the site that shows the
// company's own phone, e-mail, address or social profiles should import
// them from here too. Per-partner data (the cabinet's "your manager"
// card) is not company contacts and does not belong here.
//
// The designer asked on 2026-11-11 for real data in the footer instead of
// the Figma placeholders. These values are the ones the company publishes
// on its current site (https://binar-2000.com, section #contacts) as of
// 2026-11-14. The footer block is the sales department («Відділ
// продажу»), so the e-mail is the sales one; the general address there is
// office@binar-2000.com. The owner confirms them before release.

export const SITE_CONTACTS = {
  phone: {
    value: "+38 (067) 809-00-07",
    href: "tel:+380678090007",
  },
  email: {
    value: "sales@binar-2000.com",
    href: "mailto:sales@binar-2000.com",
  },
  address: {
    value: "Україна, м. Львів, вул. Зелена, 149Б",
    // The map link the company's site uses for this address.
    href: "https://goo.gl/maps/SR85NuqyTAwEg2BP8",
  },
  socials: {
    // The site publishes http://fb.me/binar2000; https works the same and
    // redirects to facebook.com/binar2000.
    facebook: "https://fb.me/binar2000",
    instagram: "https://instagram.com/binar_2000",
    // A Telegram bot, not a channel.
    telegram: "https://t.me/binar2000_bot",
  },
} as const;
