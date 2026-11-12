import "server-only";
import type { BasSettingsDto, BasSettingsInput } from "@/components/admin/integrations/types";
import { getSettings, saveSettings, type SettingsOf } from "../../admin/settings";
import { secretHint, sealSecret } from "../../admin/secrets";
import { HttpError } from "../../http";

// The "bas" settings group as the panel reads and writes it. The password
// of the push mode is stored sealed (admin/secrets.ts) and never leaves
// the server: the panel gets `hasPassword` and the hint.

type Stored = SettingsOf<"bas">;

export function toBasSettingsDto(value: Stored): BasSettingsDto {
  return {
    enabled: value.enabled,
    mode: value.mode,
    pushUrl: value.pushUrl,
    pushLogin: value.pushLogin,
    hasPassword: Boolean(value.pushPasswordSealed),
    pushPasswordHint: value.pushPasswordSealed ? value.pushPasswordHint : "",
    acceptProducts: value.acceptProducts,
    acceptPrices: value.acceptPrices,
    acceptStock: value.acceptStock,
    acceptClients: value.acceptClients,
    acceptLedger: value.acceptLedger,
    acceptOrderStatuses: value.acceptOrderStatuses,
    acceptDocuments: value.acceptDocuments,
    publishNewProducts: value.publishNewProducts,
    stockDrivesAvailability: value.stockDrivesAvailability,
    exportRetailOrders: value.exportRetailOrders,
    exportPartnerOrders: value.exportPartnerOrders,
  };
}

export async function readBasSettings(): Promise<BasSettingsDto> {
  return toBasSettingsDto(await getSettings("bas"));
}

// Applies a change; answers the new settings and the names of the fields
// that really changed (for the journal; never a value of the password).
export async function writeBasSettings(
  input: BasSettingsInput,
  staffId: string,
): Promise<{ settings: BasSettingsDto; changed: string[] }> {
  const current = await getSettings("bas");
  const { pushPassword, ...fields } = input;
  const next: Stored = { ...current };
  const changed: string[] = [];
  for (const [key, value] of Object.entries(fields) as [keyof typeof fields, unknown][]) {
    if (value === undefined || current[key] === value) continue;
    (next as Record<string, unknown>)[key] = value;
    changed.push(key);
  }
  if (pushPassword !== undefined) {
    if (pushPassword === null || pushPassword === "") {
      if (current.pushPasswordSealed) {
        next.pushPasswordSealed = null;
        next.pushPasswordHint = "";
        changed.push("pushPassword");
      }
    } else {
      try {
        next.pushPasswordSealed = sealSecret(pushPassword);
      } catch {
        throw new HttpError(503, "secrets-key");
      }
      next.pushPasswordHint = secretHint(pushPassword);
      changed.push("pushPassword");
    }
  }
  if (changed.length === 0) return { settings: toBasSettingsDto(current), changed };
  const saved = await saveSettings("bas", next, staffId);
  return { settings: toBasSettingsDto(saved), changed };
}
