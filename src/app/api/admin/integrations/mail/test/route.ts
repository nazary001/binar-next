import { z } from "zod";
import { MAIL_PROVIDER_LABELS, type MailTestAnswer } from "@/components/admin/mail/types";
import { audit, staffActor } from "@/server/admin/audit";
import { adminHandler, json, parseBody } from "@/server/admin/http";
import { sendTestMail } from "@/server/mail/deliver";
import { isMailAddress } from "@/server/mail/provider";

// POST /api/admin/integrations/mail/test  { to }
// Sends a test message through the configured provider and answers what
// the provider said (HTTP 200 also when it refused: the panel shows it).

const Body = z
  .object({ to: z.string().trim().min(3).max(254).refine(isMailAddress) })
  .strict();

export const POST = adminHandler("integrations.edit", async ({ request, staff }) => {
  const { to } = await parseBody(request, Body);
  const { provider, result } = await sendTestMail(to, { name: staff.staff.name, actor: staffActor(staff) });
  const label = MAIL_PROVIDER_LABELS[provider];
  await audit(staff, request, {
    action: "mail.test",
    entity: { type: "settings", id: "mail", label: "Пошта" },
    summary: result.ok
      ? `Надіслано тестовий лист на ${to} (${label})`
      : `Тестовий лист на ${to} не надіслано (${label}): ${result.error}`,
    meta: { to, provider, ok: result.ok, error: result.ok ? null : result.error },
  });
  const answer: MailTestAnswer = { ok: true, provider, result };
  return json(answer);
});
