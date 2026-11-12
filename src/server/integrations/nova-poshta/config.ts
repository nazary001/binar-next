import "server-only";
import type { NpPayer, NpPaymentMethod, NpSenderProfile, NpSettingsDto } from "@/components/admin/shipping/types";
import { openSecret, sealSecret, secretHint, secretsAvailable } from "@/server/admin/secrets";
import { getSettings, saveSettings, type SettingsOf } from "@/server/admin/settings";
import { isNpRef, npPhone } from "./client";
import { ShippingError } from "./errors";

// The "novaPoshta" settings group as the panel sees and edits it. The key
// is kept sealed (apiKeySealed + apiKeyHint); the DTO says only whether
// there is one and its last characters.

type Stored = SettingsOf<"novaPoshta">;

export function toNpSettingsDto(settings: Stored): NpSettingsDto {
  const sealed = settings.apiKeySealed;
  return {
    enabled: settings.enabled,
    hasKey: Boolean(sealed),
    apiKeyHint: sealed ? settings.apiKeyHint : "",
    keyReadable: sealed ? openSecret(sealed) !== null : true,
    secretsAvailable: secretsAvailable(),
    sender: { ...settings.sender },
    defaultWeight: settings.defaultWeight,
    defaultSeats: settings.defaultSeats,
    defaultDescription: settings.defaultDescription,
    defaultPayer: settings.defaultPayer,
    defaultPaymentMethod: settings.defaultPaymentMethod,
    defaultDimensions: settings.defaultDimensions ? { ...settings.defaultDimensions } : null,
    checkoutSearch: settings.checkoutSearch,
    autoTrack: settings.autoTrack,
  };
}

export async function npSettingsDto(): Promise<NpSettingsDto> {
  return toNpSettingsDto(await getSettings("novaPoshta"));
}

// The validated body of PUT /api/admin/np/settings.
export type NpSettingsPatch = {
  enabled?: boolean;
  apiKey?: string;
  sender?: Partial<NpSenderProfile>;
  defaultWeight?: number;
  defaultSeats?: number;
  defaultDescription?: string;
  defaultPayer?: NpPayer;
  defaultPaymentMethod?: NpPaymentMethod;
  checkoutSearch?: boolean;
  autoTrack?: boolean;
};

// A key of the carrier's business cabinet: 32 hex characters today; any
// plain run of letters and digits of a sane length is accepted, so a
// longer key format later does not lock the panel out.
const KEY_FORMAT = /^[A-Za-z0-9]{20,64}$/;

const REF_FIELDS = ["counterpartyRef", "contactRef", "cityRef", "warehouseRef"] as const;

const PLAIN_FIELDS = [
  "enabled",
  "defaultWeight",
  "defaultSeats",
  "defaultDescription",
  "defaultPayer",
  "defaultPaymentMethod",
  "checkoutSearch",
  "autoTrack",
] as const;

export type NpSettingsOutcome = {
  settings: NpSettingsDto;
  // Names of the fields whose value changed (never the key itself).
  changed: string[];
  key: "set" | "removed" | "kept";
};

export async function updateNpSettings(patch: NpSettingsPatch, staffId: string | null): Promise<NpSettingsOutcome> {
  const fields: Record<string, string> = {};
  const sender = { ...(patch.sender ?? {}) };
  for (const field of REF_FIELDS) {
    const value = sender[field];
    if (value !== undefined && value !== "" && !isNpRef(value)) fields[`sender.${field}`] = "Оберіть значення зі списку Нової Пошти";
  }
  if (sender.phone !== undefined && sender.phone !== "") {
    const phone = npPhone(sender.phone);
    if (phone) sender.phone = phone;
    else fields["sender.phone"] = "Перевірте номер телефону відправника";
  }
  const key = patch.apiKey;
  if (key !== undefined && key !== "" && !KEY_FORMAT.test(key)) {
    fields.apiKey = "Скопіюйте ключ API з бізнес-кабінету Нової Пошти повністю";
  }
  if (Object.keys(fields).length > 0) throw new ShippingError(400, "fields", { fields });

  const current = await getSettings("novaPoshta");
  let apiKeySealed = current.apiKeySealed;
  let apiKeyHint = current.apiKeyHint;
  let keyChange: NpSettingsOutcome["key"] = "kept";
  if (key === "") {
    keyChange = current.apiKeySealed ? "removed" : "kept";
    apiKeySealed = null;
    apiKeyHint = "";
  } else if (key !== undefined) {
    if (!secretsAvailable()) throw new ShippingError(503, "secrets-key");
    try {
      apiKeySealed = sealSecret(key);
    } catch {
      throw new ShippingError(503, "secrets-key");
    }
    apiKeyHint = secretHint(key);
    keyChange = "set";
  }

  const plain: Partial<Stored> = {};
  for (const name of PLAIN_FIELDS) {
    if (patch[name] !== undefined) (plain as Record<string, unknown>)[name] = patch[name];
  }
  const next: Stored = {
    ...current,
    ...plain,
    sender: { ...current.sender, ...sender },
    apiKeySealed,
    apiKeyHint,
  };
  const saved = await saveSettings("novaPoshta", next, staffId);

  const changed: string[] = [];
  for (const name of PLAIN_FIELDS) {
    if (saved[name] !== current[name]) changed.push(name);
  }
  for (const name of Object.keys(saved.sender) as (keyof NpSenderProfile)[]) {
    if (saved.sender[name] !== current.sender[name]) changed.push(`sender.${name}`);
  }
  return { settings: toNpSettingsDto(saved), changed, key: keyChange };
}
