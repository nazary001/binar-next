import "server-only";
import type { Permission } from "@/components/admin/lib/permissions";
import { clientIp } from "../auth/rate-limit";
import { HttpError, handler } from "../http";
import { can, getStaff, type StaffContext } from "./auth";

// Plumbing of the Route Handlers under src/app/api/admin.
//
//   type Context = { params: Promise<{ id: string }> };
//   export const PATCH = adminHandler<Context>("orders.edit", async ({ request, context, staff }) => {
//     const { id } = await context.params;
//     const body = await parseBody(request, Schema);
//     ...
//     await audit(staff, request, { action: "order.status", entity: {...}, summary: "..." });
//     return json({ ok: true, order });
//   });
//
// `adminHandler` adds to `handler()` (same-origin guard, error mapping,
// no-store) what every staff route needs:
// - 401 "unauthorized" without a live staff session;
// - 403 "forbidden" when the role lacks the named permission (an array
//   means any of them; null means any signed-in member of staff);
// - 403 "password-change" while the account still has a generated password,
//   except on the routes that pass `allowPasswordChange`.
//
// The check runs in every handler. A page or a layout that already checked
// is not a reason to skip it: the API is reachable on its own.

export type AdminRouteArgs<C> = {
  request: Request;
  context: C;
  staff: StaffContext;
  url: URL;
};

export type AdminHandlerOptions = {
  // Auth routes that must work before the first password change.
  allowPasswordChange?: boolean;
};

export async function requireStaff(
  permission: Permission | readonly Permission[] | null,
  options: AdminHandlerOptions = {},
): Promise<StaffContext> {
  const staff = await getStaff();
  if (!staff) throw new HttpError(401, "unauthorized");
  if (staff.staff.mustChangePassword && !options.allowPasswordChange) {
    throw new HttpError(403, "password-change");
  }
  if (permission !== null && !can(staff, permission)) throw new HttpError(403, "forbidden");
  return staff;
}

export function adminHandler<C = unknown>(
  permission: Permission | readonly Permission[] | null,
  fn: (args: AdminRouteArgs<C>) => Promise<Response>,
  options: AdminHandlerOptions = {},
): (request: Request, context: C) => Promise<Response> {
  return handler<C>(async (request, context) => {
    const staff = await requireStaff(permission, options);
    return fn({ request, context, staff, url: new URL(request.url) });
  });
}

// A further check inside a handler whose permission depends on the body
// ("publish" needs content.publish on top of content.edit).
export function assertCan(staff: StaffContext, permission: Permission | readonly Permission[]): void {
  if (!can(staff, permission)) throw new HttpError(403, "forbidden");
}

export function notFound(): never {
  throw new HttpError(404, "not-found");
}

// The caller's address for the journal (null off Vercel, where it cannot be
// trusted; see auth/rate-limit.ts clientIp).
export function requestIp(request: Request): string | null {
  const ip = clientIp(request);
  return ip === "local" ? null : ip;
}

export { HttpError, fail, json, noContent, parseBody, readJson } from "../http";
