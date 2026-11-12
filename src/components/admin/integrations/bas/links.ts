// The tabs of /admin/integrations/bas and their addresses (?tab=<key>;
// the first tab has no parameter). Other sections link here with these.

export const BAS_TABS = ["status", "settings", "keys", "queue", "log", "dev"] as const;
export type BasTab = (typeof BAS_TABS)[number];

export function basTabHref(tab: BasTab, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(tab === "status" ? {} : { tab });
  for (const [name, value] of Object.entries(extra)) params.set(name, value);
  const query = params.toString();
  return `/admin/integrations/bas${query ? `?${query}` : ""}`;
}
