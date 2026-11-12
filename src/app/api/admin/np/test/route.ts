import { staffActor } from "@/server/admin/audit";
import { HttpError, adminHandler, json, parseBody } from "@/server/admin/http";
import { TestBody, withNp } from "@/server/integrations/nova-poshta/http";
import { testKey } from "@/server/integrations/nova-poshta/sender";

// POST /api/admin/np/test { apiKey? } -> { ok, valid, senders: [{ ref, name, ... }], message? }
//
// Proves a key works by listing its senders: the key being typed in
// (`apiKey`), or the stored one. A refused key is an answer (valid: false
// and the carrier's message), not an error. 409 "np-not-configured" with
// no key at all; 502 "np-unavailable" when the carrier does not answer.
// Nothing is stored and the key is never echoed.

const KEY_FORMAT = /^[A-Za-z0-9]{20,64}$/;

export const POST = adminHandler("integrations.edit", async ({ request, staff }) => {
  const body = await parseBody(request, TestBody);
  const typed = body.apiKey === undefined || body.apiKey === "" ? undefined : body.apiKey;
  if (typed !== undefined && !KEY_FORMAT.test(typed)) {
    throw new HttpError(400, "fields", { fields: { apiKey: "Скопіюйте ключ API з бізнес-кабінету Нової Пошти повністю" } });
  }
  const result = await withNp(() => testKey(typed, staffActor(staff)));
  return json({
    ok: true,
    valid: result.valid,
    senders: result.senders,
    ...(result.message ? { message: result.message } : {}),
  });
});
