import "server-only";
import { collection, type Actor, type AuditLogDoc } from "../db/collections";
import { newId } from "../ids";
import type { StaffContext } from "./auth";
import { requestIp } from "./http";

// The journal of the staff area: one line per change, written by the route
// that made it.
//
//   await audit(staff, request, {
//     action: "order.status",
//     entity: { type: "order", id: order._id, label: `№${order.number}` },
//     summary: `Статус замовлення №${order.number}: «Нове» -> «В роботі»`,
//     meta: { from: "new", to: "inProgress" },
//   });
//
// `summary` is the sentence the journal shows: Ukrainian, past or nominal,
// naming the record. `meta` holds the machine-readable details (never a
// password, a token or a key). A failed write of the journal must not undo
// the action it describes, so errors are logged and swallowed.

export type AuditInput = {
  action: string;
  entity?: { type: string; id: string; label: string } | null;
  summary: string;
  meta?: Record<string, unknown>;
};

export function staffActor(staff: StaffContext): Actor {
  return { id: staff.staff._id, name: staff.staff.name, kind: "staff" };
}

export const SYSTEM_ACTOR: Actor = { id: "system", name: "Система", kind: "system" };

export async function auditAs(actor: Actor, ip: string | null, input: AuditInput): Promise<void> {
  const doc: AuditLogDoc = {
    _id: newId("log"),
    at: new Date(),
    actor,
    action: input.action.slice(0, 80),
    entity: input.entity
      ? { type: input.entity.type, id: input.entity.id, label: input.entity.label.slice(0, 200) }
      : null,
    summary: input.summary.slice(0, 500),
    meta: input.meta ?? {},
    ip,
  };
  try {
    await (await collection("auditLog")).insertOne(doc);
  } catch (error) {
    console.error("[admin] audit write failed:", error);
  }
}

export async function audit(staff: StaffContext, request: Request, input: AuditInput): Promise<void> {
  await auditAs(staffActor(staff), requestIp(request), input);
}
