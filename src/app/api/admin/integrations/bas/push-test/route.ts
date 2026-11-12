import type { BasPushTestAnswer } from "@/components/admin/integrations/types";
import { staffActor } from "@/server/admin/audit";
import { HttpError, adminHandler, json } from "@/server/admin/http";
import { getSettings } from "@/server/admin/settings";
import { postPing, storedPushTarget } from "@/server/integrations/bas/push";

// POST /api/admin/integrations/bas/push-test [integrations.edit]
// The "Перевірити з'єднання" button of the settings tab: posts
// { kind: "ping" } to the STORED push address with the stored login and
// password (what is typed but not saved is not used), and answers what
// came back: BasPushTestAnswer { ok, result: BasPushOutcome }. It works
// while the exchange is off or in the pull mode too, so the address can be
// checked before the push mode is switched on. 409 "no-address" when no
// address is stored. One exchange_log row per check, nothing else changes.

export const POST = adminHandler("integrations.edit", async ({ staff }) => {
  const target = storedPushTarget(await getSettings("bas"));
  if (!target) throw new HttpError(409, "no-address");
  const answer: BasPushTestAnswer = { ok: true, result: await postPing(target, staffActor(staff)) };
  return json(answer);
});
