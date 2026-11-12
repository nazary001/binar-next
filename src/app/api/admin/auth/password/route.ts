import { z } from "zod";
import { audit } from "@/server/admin/audit";
import { endStaffSessions } from "@/server/admin/auth";
import { HttpError, adminHandler, json, parseBody } from "@/server/admin/http";
import { STAFF_PASSWORD_MIN, setStaffPassword } from "@/server/admin/staff";
import { PASSWORD_MAX_LENGTH, verifyPassword } from "@/server/auth/password";
import { rateLimit } from "@/server/auth/rate-limit";

// POST /api/admin/auth/password { current, next }
//
// A member of staff changes the own password. Also the only way out of the
// "generated password" state. Every other session of the account ends.

const Body = z
  .object({
    current: z.string().max(PASSWORD_MAX_LENGTH),
    next: z.string().max(PASSWORD_MAX_LENGTH),
  })
  .strict();

export const POST = adminHandler(
  null,
  async ({ request, staff }) => {
    const body = await parseBody(request, Body);
    const limit = await rateLimit("staff-pwchange", staff.staff._id, 8, 900);
    if (!limit.ok) throw new HttpError(429, "rate", { retryAfter: limit.retryAfter });

    if (body.next.length < STAFF_PASSWORD_MIN) {
      throw new HttpError(400, "fields", { fields: { next: "short" }, min: STAFF_PASSWORD_MIN });
    }
    if (body.next === body.current) throw new HttpError(400, "fields", { fields: { next: "same" } });
    if (!(await verifyPassword(body.current, staff.staff.passwordHash))) {
      throw new HttpError(403, "current");
    }

    await setStaffPassword(staff.staff._id, body.next, false);
    await endStaffSessions(staff.staff._id, staff.sessionId);
    await audit(staff, request, {
      action: "staff.password",
      entity: { type: "staff", id: staff.staff._id, label: staff.staff.email },
      summary: `${staff.staff.name} змінив(ла) свій пароль`,
    });
    return json({ ok: true });
  },
  { allowPasswordChange: true },
);
