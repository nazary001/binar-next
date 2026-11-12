import "server-only";
import { getSettings } from "../admin/settings";
import { collection, type LeadDoc } from "../db/collections";
import { newId } from "../ids";
import { queueMail } from "../mail/queue";

// Lead forms of the marketing pages (package C): the home / direction
// quiz, the star-rating checklist strip and the partner contact form.
// A lead is stored as sent (validated and trimmed by POST /api/leads) with
// a contact summary for whoever processes it, and a notice goes to the
// sales inbox (general settings `leadsInbox`). The notice is sent right
// after the response once a mail provider is set up, and not written at
// all when the mail settings switch "a form was sent" notices off.

// Where "a lead came in" notices go when the settings name no inbox (the
// address the footer shows).
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
  const general = await getSettings("general");
  await queueMail("lead", general.leadsInbox.trim() || LEADS_INBOX, {
    leadId: id,
    kind: lead.kind,
    source: lead.source,
    contact: lead.contact,
  });
  return id;
}
