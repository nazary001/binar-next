import { toStaffMe } from "@/server/admin/auth";
import { adminHandler, json } from "@/server/admin/http";

// GET /api/admin/auth/me - who is signed in and what the role allows.
export const GET = adminHandler(null, async ({ staff }) => json({ ok: true, me: toStaffMe(staff) }), {
  allowPasswordChange: true,
});
