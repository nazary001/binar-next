// One accounting-system group code on one category only. The exchange
// files a new BAS product into the first category whose code matches its
// group (src/server/integrations/bas/apply/products.ts), so two categories
// with one code would silently lose the second. Codes are compared trimmed
// and case-blind (the stricter reading: "ab-12" and "AB-12" are refused
// together too).
//
// Shared by the categories screen (checked before sending), the route
// PUT /api/admin/taxonomy/meta and the strict check of the "catalog"
// settings group (both refuse with 400 "fields"). Plain code: no
// "use client", no server import.

type WithCode = { externalId?: string | null } | null | undefined;

// For each category whose code another category also has: the keys of
// those others, in the order of the map. Categories without a code and
// codes used once are left out, so an empty answer means "acceptable".
export function categoriesSharingCode(categories: Readonly<Record<string, WithCode>>): Record<string, string[]> {
  const byCode = new Map<string, string[]>();
  for (const [key, meta] of Object.entries(categories)) {
    const raw = meta?.externalId;
    const code = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (!code) continue;
    byCode.set(code, [...(byCode.get(code) ?? []), key]);
  }
  const shared: Record<string, string[]> = {};
  for (const keys of byCode.values()) {
    if (keys.length < 2) continue;
    for (const key of keys) shared[key] = keys.filter((other) => other !== key);
  }
  return shared;
}

// The refusal under one category's code field, naming the others by label.
export function sharedCodeText(others: readonly string[], labelOf: (key: string) => string): string {
  const names = others.map((key) => `«${labelOf(key)}»`);
  return `Цей код уже має ${names.length > 1 ? "категорії" : "категорія"} ${names.join(", ")}`;
}
