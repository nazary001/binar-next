import type { NpSenderProfile } from "../shipping/types";
import type { MailStatusDto, OutboxCounts } from "../mail/types";
import type { IntegrationState } from "./shared";
import type { BasEntity, BasLastCall, BasStatusDto, NpSettingsView } from "./types";

// How the panel sums up an integration in one pill, from its settings and
// status answers. Pure functions: the hub and the pages agree by calling
// the same ones.

// Everything a waybill needs from the sender profile.
export function npSenderComplete(sender: NpSenderProfile): boolean {
  return Boolean(sender.counterpartyRef && sender.contactRef && sender.phone && sender.cityRef && sender.warehouseRef);
}

// Nova Poshta: a key that cannot be opened is an error; without a key or a
// complete sender nothing can be sent ("needs set-up", whatever the
// switch); a complete set-up that is switched off is "off".
export function npState(settings: NpSettingsView): IntegrationState {
  if (settings.hasKey && !settings.keyReadable) return "error";
  if (!settings.hasKey || !npSenderComplete(settings.sender)) return "setup";
  return settings.enabled ? "connected" : "off";
}

// The most recent call of any kind (null = BAS never called).
export function lastBasCall(status: BasStatusDto): (BasLastCall & { entity: BasEntity }) | null {
  let latest: (BasLastCall & { entity: BasEntity }) | null = null;
  for (const [entity, call] of Object.entries(status.last) as [BasEntity, BasLastCall | null][]) {
    if (call && (!latest || call.at > latest.at)) latest = { ...call, entity };
  }
  return latest;
}

// BAS: no working key = "needs set-up"; switched off = "off"; entries BAS
// refused, or a last call that failed, = "error".
export function basState(status: BasStatusDto): IntegrationState {
  if (status.keys.active === 0) return "setup";
  if (!status.enabled) return "off";
  const last = lastBasCall(status);
  if (status.queue.errors > 0 || last?.status === "error") return "error";
  return "connected";
}

// Mail: no provider or a provider missing something = "needs set-up";
// messages that failed = "error".
export function mailState(status: MailStatusDto, counts?: OutboxCounts): IntegrationState {
  if (!status.configured) return "setup";
  if (counts && counts.failed > 0) return "error";
  return "connected";
}
