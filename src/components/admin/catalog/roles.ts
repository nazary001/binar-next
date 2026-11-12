import { countOf } from "../lib/format";
import type { Tone } from "../ui/tokens";
import type { PriceTypeDto, PriceTypeRole } from "./types";

// The role of a price type as the screens of /admin/pricing name it. "none"
// stands for the API's null (a Select needs a string value).

export type RoleValue = PriceTypeRole | "none";

export const ROLE_META: Record<RoleValue, { label: string; short: string; hint: string; tone: Tone | null }> = {
  none: {
    label: "Не використовується",
    short: "Не використовується",
    hint: "Ціни цього типу лише зберігаються в товарах.",
    tone: null,
  },
  base: {
    label: "Базова (гості)",
    short: "Базова",
    hint: "Роздрібні ціни, які бачать гості й покупці без договору: обмін з BAS записує їх у ціну товару.",
    tone: "green",
  },
  individual: {
    label: "Індивідуальна (партнери)",
    short: "Індивідуальна",
    hint: "Прайс партнерів з облікової системи. Сайт поки рахує ціни партнерів від знижки компанії.",
    tone: "indigo",
  },
};

export const ROLE_VALUES: RoleValue[] = ["none", "base", "individual"];

export const roleOf = (type: Pick<PriceTypeDto, "role">): RoleValue => type.role ?? "none";

export const roleBody = (role: RoleValue): PriceTypeRole | null => (role === "none" ? null : role);

// The type that holds `role` now, other than `selfId`.
export function holderOf(types: PriceTypeDto[], role: RoleValue, selfId: string | null): PriceTypeDto | null {
  if (role === "none") return null;
  return types.find((type) => type.role === role && type.id !== selfId) ?? null;
}

// What happens on the site when the role moves, in one sentence.
export function roleEffect(role: RoleValue): string {
  if (role === "base") {
    return "Ціни на сайті зміняться, коли облікова система наступного разу надішле ціни: роздрібною стане ціна нового типу.";
  }
  if (role === "individual") return "Сайт поки не застосовує індивідуальні ціни, тож покупці різниці не побачать.";
  return "";
}

// "Група «Опт», 2 договори" - who uses a type (what blocks its removal).
export function usageText(type: Pick<PriceTypeDto, "usedBy">): string {
  const parts: string[] = [];
  const groups = type.usedBy.groups;
  if (groups.length === 1) parts.push(`Група «${groups[0].name}»`);
  else if (groups.length > 1) parts.push(`Групи: ${groups.map((group) => `«${group.name}»`).join(", ")}`);
  const contracts = type.usedBy.contracts;
  if (contracts > 0) parts.push(countOf(contracts, ["договір", "договори", "договорів"]));
  return parts.join(", ");
}
