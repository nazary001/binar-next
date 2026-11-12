import "server-only";
import type { BasSettingsDto, BasSettingsInput } from "@/components/admin/integrations/types";
import { getSettings, saveSettings, type SettingsOf } from "../../admin/settings";
import { sealSecret } from "../../admin/secrets";
import { HttpError } from "../../http";
import { originOf } from "./push";

// The "bas" settings group as the panel reads and writes it. The password
// of the push mode is stored sealed (admin/secrets.ts) and never leaves
// the server: the panel gets `hasPassword`, nothing of the password itself
// (no hint either: a few characters of a short password are a good part of
// it, and the read-only roles see these settings).
//
// The password belongs to the address it was typed for: when the push
// address moves to another origin (scheme, host or port) and no new
// password comes in the same change, the stored one is removed, so it can
// never be sent to an address nobody typed it for.

type Stored = SettingsOf<"bas">;

export function toBasSettingsDto(value: Stored): BasSettingsDto {
  return {
    enabled: value.enabled,
    mode: value.mode,
    pushUrl: value.pushUrl,
    pushLogin: value.pushLogin,
    hasPassword: Boolean(value.pushPasswordSealed),
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

// Applies a change; answers the new settings, the names of the fields
// that really changed (for the journal; never a value of the password) and
// whether the stored password was removed because the address moved.
export async function writeBasSettings(
  input: BasSettingsInput,
  staffId: string,
): Promise<{ settings: BasSettingsDto; changed: string[]; passwordDropped: boolean }> {
  const current = await getSettings("bas");
  const { pushPassword, ...fields } = input;
  const next: Stored = { ...current };
  const changed: string[] = [];
  for (const [key, value] of Object.entries(fields) as [keyof typeof fields, unknown][]) {
    if (value === undefined || current[key] === value) continue;
    (next as Record<string, unknown>)[key] = value;
    changed.push(key);
  }
  // A hint stored by an older version (the last characters) goes with the
  // next save whatever it changes.
  next.pushPasswordHint = "";
  let passwordDropped = false;
  if (pushPassword !== undefined) {
    if (pushPassword === null || pushPassword === "") {
      if (current.pushPasswordSealed) {
        next.pushPasswordSealed = null;
        changed.push("pushPassword");
      }
    } else {
      try {
        next.pushPasswordSealed = sealSecret(pushPassword);
      } catch {
        throw new HttpError(503, "secrets-key");
      }
      changed.push("pushPassword");
    }
  } else if (current.pushPasswordSealed && originOf(next.pushUrl) !== originOf(current.pushUrl)) {
    next.pushPasswordSealed = null;
    passwordDropped = true;
    changed.push("pushPassword");
  }
  if (changed.length === 0) return { settings: toBasSettingsDto(current), changed, passwordDropped };
  const saved = await saveSettings("bas", next, staffId);
  return { settings: toBasSettingsDto(saved), changed, passwordDropped };
}
