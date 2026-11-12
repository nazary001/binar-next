import "server-only";
import type { MailSettingsAnswer, MailSettingsDto, MailSettingsInput } from "@/components/admin/mail/types";
import { sealSecret, secretHint, secretsAvailable } from "../admin/secrets";
import { getSettings, saveSettings } from "../admin/settings";
import { mailStatusOf, parseFromAddress, webhookUrlProblem, type MailSettings } from "./provider";

// The mail settings as the panel reads and writes them
// (/api/admin/integrations/mail/settings). The sealed key never leaves
// the server: the answer says whether one is stored and shows its hint.

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
  | { ok: true; settings: MailSettings; changed: MailField[]; key: "set" | "removed" | "kept" }
  | { ok: false; error: "fields"; fields: Record<string, string> }
  | { ok: false; error: "secrets-key" };

// Merges a change into the stored group. `apiKey`: a new key is sealed,
// "" removes the stored one, absent keeps it.
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

  let key: "set" | "removed" | "kept" = "kept";
  if (input.apiKey === "") {
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
    next.apiKeyHint = secretHint(input.apiKey);
    key = "set";
  }

  const settings = await saveSettings("mail", next, staffId);
  return { ok: true, settings, changed, key };
}
