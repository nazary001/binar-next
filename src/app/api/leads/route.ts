import { z } from "zod";
import { isSitePath } from "@/components/admin/leads/links";
import { getSession } from "@/server/auth/session";
import { clientIp, rateLimit } from "@/server/auth/rate-limit";
import type { LeadDoc } from "@/server/db/collections";
import { handler, HttpError, json, parseBody } from "@/server/http";
import { createLead } from "@/server/repos/leads";

// POST /api/leads - the three lead forms of the marketing pages.
//
//   { kind: "quiz" | "star-checklist" | "partner-contact",
//     source: "<the page's pathname>",
//     payload: { ...the form's fields } }
//
// -> 201 { ok: true }. The forms show their success state at once and do
// not wait for this answer, so a refusal is only a bare code: 400
// bad-request (shape, a value that is not a string, a rule the form
// enforces), 413 too-large (body over 16 KB), 415 content-type, 403
// origin, 429 rate (10 leads per hour and address).
//
// Each payload is checked against the rule its form applies before it
// lets the visitor submit (the same expressions on the values as sent, so
// no field value the form accepts is refused here). The inputs carry no
// maxLength, so a text over its bound is not refused either (that would
// drop a lead the visitor was told was sent): it is stored trimmed and
// cut to the bound (`clip`). The 16 KB body cap bounds the whole request.

const MAX_BODY_BYTES = 16 * 1024;
const MAX_KEYS = 30;

// Field names become keys of the stored document: letters, digits, "_"
// and "-" only (no "$", no ".", no "__proto__").
const zKey = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,39}$/);
// The page's pathname, which a browser never gives as "//host" or with a
// backslash (and the server redirects such addresses before a page loads):
// a source that would leave the site when the panel links it is refused.
const zSource = z.string().min(1).max(200).refine(isSitePath);

type Answers = Record<string, string | string[]>;

const text = (record: Record<string, unknown>, key: string): string =>
  typeof record[key] === "string" ? (record[key] as string) : "";

// A text value trimmed and cut to `max` UTF-16 units, never between the
// two halves of a surrogate pair.
function clip(value: string, max: number): string {
  let cut = value.trim().slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return cut.trimEnd();
}

// QuizForm: option steps are string arrays (option values from the code,
// at most a handful), free text and the contact step are strings. Its
// submit rule: a name longer than one character and a phone longer than
// five characters or an e-mail with "@".
const QuizPayload = z
  .record(zKey, z.union([z.string(), z.array(z.string()).max(30)]))
  .refine((answers) => Object.keys(answers).length <= MAX_KEYS)
  .refine(
    (answers) =>
      text(answers, "name").length > 1 && (text(answers, "phone").length > 5 || text(answers, "email").includes("@")),
  )
  .transform((answers) => {
    const out: Answers = {};
    for (const [key, value] of Object.entries(answers)) {
      out[key] = typeof value === "string" ? clip(value, 1000) : value.map((v) => clip(v, 200));
    }
    return out;
  });

// StarRequestStrip: a 1..5 star rating and an e-mail with "@".
const StarPayload = z
  .object({
    stars: z.number().int().min(1).max(5),
    email: z.string(),
  })
  .strict()
  .refine((p) => p.email.includes("@"))
  .transform((p) => ({ stars: p.stars, email: clip(p.email, 254) }));

// PartnerContactForm: all six fields; a name of two characters or more
// (trimmed) and an e-mail with "@" or a phone with six digits or more.
const PartnerPayload = z
  .object({
    name: z.string(),
    role: z.string(),
    email: z.string(),
    company: z.string(),
    phone: z.string(),
    comment: z.string(),
  })
  .strict()
  .refine((f) => f.name.trim().length > 1 && (f.email.includes("@") || f.phone.replace(/\D/g, "").length >= 6))
  .transform((f) => ({
    name: clip(f.name, 300),
    role: clip(f.role, 300),
    email: clip(f.email, 254),
    company: clip(f.company, 300),
    phone: clip(f.phone, 64),
    comment: clip(f.comment, 5000),
  }));

const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("quiz"), source: zSource, payload: QuizPayload }).strict(),
  z.object({ kind: z.literal("star-checklist"), source: zSource, payload: StarPayload }).strict(),
  z.object({ kind: z.literal("partner-contact"), source: zSource, payload: PartnerPayload }).strict(),
]);

type Lead = z.infer<typeof Body>;

// The non-empty values among the given contact fields.
function contactOf(fields: Record<string, string>): LeadDoc["contact"] {
  const contact: LeadDoc["contact"] = {};
  for (const key of ["name", "email", "phone", "company"] as const) {
    const value = fields[key]?.trim();
    if (value) contact[key] = value;
  }
  return contact;
}

// The payloads arrive already trimmed and clipped by the schemas.
function stored(lead: Lead): { payload: Record<string, unknown>; contact: LeadDoc["contact"] } {
  switch (lead.kind) {
    case "quiz": {
      const payload = lead.payload;
      return {
        payload,
        contact: contactOf({ name: text(payload, "name"), email: text(payload, "email"), phone: text(payload, "phone") }),
      };
    }
    case "star-checklist":
      return { payload: lead.payload, contact: contactOf({ email: lead.payload.email }) };
    case "partner-contact":
      return { payload: lead.payload, contact: contactOf(lead.payload) };
  }
}

export const POST = handler(async (request) => {
  const lead = await parseBody(request, Body, MAX_BODY_BYTES);

  const rate = await rateLimit("leads", clientIp(request), 10, 3600);
  if (!rate.ok) throw new HttpError(429, "rate", { retryAfter: rate.retryAfter });

  const session = await getSession();
  const { payload, contact } = stored(lead);
  await createLead({
    kind: lead.kind,
    source: lead.source,
    payload,
    contact,
    userId: session?.user._id ?? null,
    userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  });
  return json({ ok: true }, 201);
});
