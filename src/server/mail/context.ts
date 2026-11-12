import "server-only";
import { getSettings } from "../admin/settings";
import { collection, type OutboxDoc } from "../db/collections";
import { siteUrl, type MailCompany, type MailContext, type MailSecret } from "./templates";

// What a message needs besides its payload, read from the database right
// before it is rendered: the company of the footer (settings "general"),
// and per kind the order, the lead or the company's invite token. Reading
// at send time (not at write time) keeps the stored payload small and the
// message true to the current data.
//
//   const load = contextLoader();          // one per run: settings read once
//   const context = await load(doc);

export type ContextLoader = (
  doc: Pick<OutboxDoc, "kind" | "payload" | "to" | "createdAt">,
  secret?: MailSecret,
) => Promise<MailContext>;

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function idFrom(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && ID.test(value)) return value;
  }
  return null;
}

async function inviteTokenOf(payload: Record<string, unknown>): Promise<string | null> {
  let clientId = idFrom(payload.clientId);
  if (!clientId) {
    const employeeId = idFrom(payload.employeeId);
    if (!employeeId) return null;
    const employee = await (await collection("employees")).findOne({ _id: employeeId }, { projection: { clientId: 1 } });
    clientId = employee?.clientId ?? null;
  }
  if (!clientId) return null;
  const client = await (await collection("clients")).findOne({ _id: clientId }, { projection: { inviteToken: 1 } });
  return client?.inviteToken || null;
}

async function companyOf(): Promise<MailCompany> {
  const general = await getSettings("general");
  return { name: general.companyName, phone: general.phone, email: general.email, address: general.address };
}

// The context of a message that needs no lookups (the panel's test).
export async function baseContext(to: string): Promise<MailContext> {
  return { siteUrl: siteUrl(), company: await companyOf(), to, createdAt: new Date() };
}

export function contextLoader(): ContextLoader {
  let company: Promise<MailCompany> | null = null;
  const companyOnce = (): Promise<MailCompany> => (company ??= companyOf());

  return async (doc, secret) => {
    const context: MailContext = {
      siteUrl: siteUrl(),
      company: await companyOnce(),
      to: doc.to,
      createdAt: doc.createdAt,
      ...(secret ? { secret } : {}),
    };
    const payload = doc.payload ?? {};
    if (doc.kind === "order-placed" || doc.kind === "order-status") {
      const orderId = idFrom(payload.orderId, payload.number);
      context.order = orderId ? await (await collection("orders")).findOne({ _id: orderId }) : null;
    } else if (doc.kind === "lead") {
      const leadId = idFrom(payload.leadId);
      context.lead = leadId ? await (await collection("leads")).findOne({ _id: leadId }) : null;
    } else if (doc.kind === "employee-invite") {
      context.inviteToken = await inviteTokenOf(payload);
    }
    return context;
  };
}
