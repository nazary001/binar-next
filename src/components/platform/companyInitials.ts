// Two-letter monogram of a partner company for the 32-px account avatars
// (the desktop header chip and the phone cabinet menu's account row).
// A spelled-out legal form at the start is stripped, abbreviated legal
// forms and short lowercase connectors are skipped, then the first letters
// of the first two words remain:
//   "Демо Партнер" -> "ДП", 'ТОВ "Готель Прем'єр Палац"' -> "ГП",
//   '"Альфа" ПП' -> "А", "Mirotel LTD" -> "ML" (Latin forms kept),
//   "" -> "" (the avatar then shows the person glyph).
const LEGAL_PREFIX =
  /^(?:товариство\s+з\s+обмеженою\s+відповідальністю|приватне\s+підприємство|фізична\s+особа[\s-]+підприємець|(?:публічне|приватне)?\s*акціонерне\s+товариство)\s+/iu;

const LEGAL_WORD = new Set(["ТОВ", "ТЗОВ", "ФОП", "ПП", "ПАТ", "ПРАТ", "АТ", "ДП", "КП"]);

export function companyInitials(name: string): string {
  const words = name.trim().replace(LEGAL_PREFIX, "").match(/\p{L}[\p{L}\p{N}'-]*/gu) ?? [];
  const kept = words.filter((w) => !LEGAL_WORD.has(w.toUpperCase()) && !/^\p{Ll}{1,2}$/u.test(w));
  return (kept.length ? kept : words)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}
