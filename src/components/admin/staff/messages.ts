import { errorMessage, type ApiFailure } from "../lib/api";
import { countOf } from "../lib/format";
import { toast } from "../ui/Toast";
import { STAFF_ERROR_MESSAGES, STAFF_REFUSAL_MESSAGES } from "./types";

// Refusals of the staff, roles and own-account routes in the words of the
// staff screens. The routes' own sentences (types.ts) are kept, with
// "сеанс" instead of "сесія", the word the panel uses on screen.

const OWN: Record<string, string> = {
  ...STAFF_ERROR_MESSAGES,
  self: "Цю дію не можна виконати зі своїм акаунтом: її робить інший співробітник, який керує командою.",
  current: "Це сеанс, з якого ви зараз працюєте. Щоб завершити його, вийдіть з панелі.",
  exists: "Такий запис уже існує.",
};

export function staffErrorText(failure: ApiFailure): string {
  const reason = failure.data.reason;
  if (failure.error === "forbidden" && (reason === "own-role" || reason === "beyond-own")) {
    return STAFF_REFUSAL_MESSAGES[reason];
  }
  if (failure.error === "in-use" && typeof failure.data.members === "number") {
    return `Цю роль мають ${countOf(failure.data.members, ["співробітник", "співробітники", "співробітників"])}. Спершу призначте їм іншу роль.`;
  }
  return errorMessage(failure, OWN);
}

export function toastStaffError(failure: ApiFailure): void {
  toast.error(staffErrorText(failure));
}

// The field errors of a 400 "fields" / 409 "exists" answer ({ fields: { email: "taken" } }).
export function fieldCodes(failure: ApiFailure): Record<string, string> {
  const fields = failure.data.fields;
  if (!fields || typeof fields !== "object") return {};
  const out: Record<string, string> = {};
  for (const [name, code] of Object.entries(fields as Record<string, unknown>)) {
    if (typeof code === "string") out[name] = code;
  }
  return out;
}
