import "server-only";
import type { MailSettingsAnswer, MailSettingsDto, MailSettingsInput } from "@/components/admin/mail/types";
import { sealSecret, secretHint, secretsAvailable } from "../admin/secrets";
import { getSettings, saveSettings } from "../admin/settings";
import { mailStatusOf, parseFromAddress, webhookOrigin, webhookUrlProblem, type MailSettings } from "./provider";

// The mail settings as the panel reads and writes them
// (/api/admin/integrations/mail/settings). The sealed key never leaves
// the server: the answer says whether one is stored and shows its hint.
//
// The key belongs to where it was typed for: the provider (a Resend key
// is not the webhook's) and, for the webhook, the origin of its address.
// A change of the provider, or of the webhook's origin while the webhook
// is the provider, removes the stored key unless a new one comes in the
// same change, so a key can never be sent to a service or an address
// nobody typed it for.

export function mailSettingsDto(settings: MailSettings): MailSettingsDto {
  return {
    provider: settings.provider,
    from: settings.from,
    replyTo: settings.replyTo,
    webhookUrl: settings.webhookUrl,
    notifyNewOrder: settings.notifyNewOrder,
    notifyNewLead: settings.notifyNewLead,
    confirmOrderToCustomer: settings.confirmOrderToCustomer,
    hasKey: Boolean(settings.apiKeySealed),
    keyHint: settings.apiKeySealed ? settings.apiKeyHint : "",
  };
}

export function mailSettingsAnswer(settings: MailSettings): MailSettingsAnswer {
  return {
    ok: true,
    settings: mailSettingsDto(settings),
    status: mailStatusOf(settings),
    secretsAvailable: secretsAvailable(),
  };
}

export async function readMailSettings(): Promise<MailSettingsAnswer> {
  return mailSettingsAnswer(await getSettings("mail"));
}

const PLAIN_FIELDS = [
  "provider",
  "from",
  "replyTo",
  "webhookUrl",
  "notifyNewOrder",
  "notifyNewLead",
  "confirmOrderToCustomer",
] as const;

export type MailField = (typeof PLAIN_FIELDS)[number];

export type SaveMailOutcome =
  // key "dropped": removed because the provider or the webhook origin moved.
  | { ok: true; settings: MailSettings; changed: MailField[]; key: "set" | "removed" | "kept" | "dropped" }
  | { ok: false; error: "fields"; fields: Record<string, string> }
  | { ok: false; error: "secrets-key" };

// Merges a change into the stored group. `apiKey`: a new key is sealed,
// "" removes the stored one, absent keeps it (unless its destination moves).
export async function saveMailSettings(input: MailSettingsInput, staffId: string): Promise<SaveMailOutcome> {
  const fields: Record<string, string> = {};
  if (input.from && !parseFromAddress(input.from)) fields.from = "format";
  if (input.replyTo && !parseFromAddress(input.replyTo)) fields.replyTo = "format";
  if (input.webhookUrl) {
    const problem = webhookUrlProblem(input.webhookUrl);
    if (problem) fields.webhookUrl = problem;
  }
  // A key is printable ASCII without spaces (Resend: "re_...").
  if (input.apiKey && !/^[!-~]{8,500}$/.test(input.apiKey)) fields.apiKey = "format";
  if (Object.keys(fields).length > 0) return { ok: false, error: "fields", fields };

  const current = await getSettings("mail");
  const next: MailSettings = { ...current };
  const changed: MailField[] = [];
  for (const field of PLAIN_FIELDS) {
    const value = input[field];
    if (value === undefined || value === current[field]) continue;
    changed.push(field);
    Object.assign(next, { [field]: value });
  }

  let key: "set" | "removed" | "kept" | "dropped" = "kept";
  const destinationMoves =
    next.provider !== current.provider ||
    (next.provider === "webhook" && webhookOrigin(next.webhookUrl) !== webhookOrigin(current.webhookUrl));
  if (input.apiKey === undefined && current.apiKeySealed && destinationMoves) {
    key = "dropped";
    next.apiKeySealed = null;
    next.apiKeyHint = "";
  } else if (input.apiKey === "") {
    if (current.apiKeySealed) key = "removed";
    next.apiKeySealed = null;
    next.apiKeyHint = "";
  } else if (input.apiKey) {
    if (!secretsAvailable()) return { ok: false, error: "secrets-key" };
    try {
      next.apiKeySealed = sealSecret(input.apiKey);
    } catch {
      return { ok: false, error: "secrets-key" };
    }
    // A short secret (a webhook key may be 8 characters) shows nothing of
    // itself: its last four would be half of it.
    next.apiKeyHint = input.apiKey.length >= 20 ? secretHint(input.apiKey) : "****";
    key = "set";
  }

  const settings = await saveSettings("mail", next, staffId);
  return { ok: true, settings, changed, key };
}
