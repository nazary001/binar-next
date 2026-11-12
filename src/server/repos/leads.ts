import "server-only";
import { collection, type LeadDoc } from "../db/collections";
import { newId } from "../ids";
import { enqueueMessage } from "../outbox";

// Lead forms of the marketing pages (package C): the home / direction
// quiz, the star-rating checklist strip and the partner contact form.
// A lead is stored as sent (validated and trimmed by POST /api/leads) with
// a contact summary for whoever processes it, and an outbox notice is
// queued for the sales inbox (nothing is delivered until a mailer is
// connected).

// Where "a lead came in" notices go (the address the footer shows).
export const LEADS_INBOX = "info@binar-2000.com";

export type NewLead = {
  kind: LeadDoc["kind"];
  source: string;
  payload: Record<string, unknown>;
  contact: LeadDoc["contact"];
  userId: string | null;
  userAgent: string | null;
};

export async function createLead(lead: NewLead): Promise<string> {
  const id = newId("lead");
  const leads = await collection("leads");
  await leads.insertOne({
    _id: id,
    kind: lead.kind,
    source: lead.source,
    payload: lead.payload,
    contact: lead.contact,
    userId: lead.userId,
    userAgent: lead.userAgent,
    status: "new",
    createdAt: new Date(),
  });
  await enqueueMessage("lead", LEADS_INBOX, {
    leadId: id,
    kind: lead.kind,
    source: lead.source,
    contact: lead.contact,
  });
  return id;
}
