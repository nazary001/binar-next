import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { canDownloadMaterial, DIRECTIONS, type MaterialViewer } from "@/components/materials/data";
import { cx } from "../lib/format";
import { Badge } from "../ui/Badge";
import { TONES, type Tone } from "../ui/tokens";
import {
  MATERIAL_ERROR_MESSAGES,
  MATERIAL_FIELD_MESSAGES,
  type MaterialDirection,
  type MaterialFieldReason,
  type MaterialFileRow,
  type MaterialFileType,
} from "./types";

// The vocabulary of the materials screen: type badges, direction names,
// the access rule in words, and the wording of refusals. Shared by the
// screen and its dialogs.

export const enc = encodeURIComponent;

// The site's own names of the five types (FILE_TYPE_LABELS of the
// storefront), with a calm tone each so a row reads at a glance. Orange is
// left out on purpose: it means "needs attention" in the panel.
export const TYPE_META: Record<MaterialFileType, { label: string; tone: Tone }> = {
  pdf: { label: "PDF", tone: "red" },
  doc: { label: "DOC", tone: "blue" },
  ppt: { label: "Презентація", tone: "amber" },
  url: { label: "Посилання", tone: "indigo" },
  png: { label: "Фото", tone: "mint" },
};

// The types a stored file may be corrected to (a link is always "url").
export const STORED_TYPE_OPTIONS = (["pdf", "doc", "ppt", "png"] as const).map((value) => ({
  value,
  label: TYPE_META[value].label,
}));

export function TypeBadge({ type }: { type: MaterialFileType }) {
  const meta = TYPE_META[type] ?? { label: type, tone: "neutral" as Tone };
  return (
    <Badge tone={meta.tone} className="whitespace-nowrap">
      {meta.label}
    </Badge>
  );
}

// Short names for the table; the full ones are in the tooltip and the form.
const DIRECTION_SHORT: Record<MaterialDirection, string> = {
  "Усе для готелів": "Готелі",
  "Засоби індивідуального захисту": "ЗІЗ",
  "Засоби та інвентар для прибирання": "Прибирання",
};

export function directionShort(direction: MaterialDirection): string {
  return DIRECTION_SHORT[direction] ?? direction;
}

export const DIRECTION_OPTIONS = DIRECTIONS.map((value) => ({ value, label: value }));

// --- the access rule in words ------------------------------------------------------

type Access = Pick<MaterialFileRow, "locked" | "partnerLocked">;

const VIEWERS: { viewer: MaterialViewer; name: string }[] = [
  { viewer: null, name: "гості" },
  { viewer: "b2c", name: "роздрібні покупці" },
  { viewer: "b2b", name: "партнери" },
];

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} та ${names[names.length - 1]}`;
}

// Who downloads the file in this state, from the storefront's own rule
// (canDownloadMaterial), so the panel can never describe it differently.
export function whoCanDownload(access: Access): string {
  const can = VIEWERS.filter((entry) => canDownloadMaterial(access, entry.viewer)).map((entry) => entry.name);
  const cannot = VIEWERS.filter((entry) => !canDownloadMaterial(access, entry.viewer)).map((entry) => entry.name);
  const yes = `Завантажують ${joinNames(can)}.`;
  if (cannot.length === 0) return yes;
  const no = joinNames(cannot);
  // Every name is plural ("гості", "партнери"), so the verb is too.
  return `${yes} ${no.charAt(0).toUpperCase()}${no.slice(1)} бачать замок.`;
}

// A two-word summary for read-only roles and phones.
export function accessSummary(access: Access): string {
  if (!access.locked && !access.partnerLocked) return "Відкрито всім";
  if (access.locked && !access.partnerLocked) return "Після входу";
  if (!access.locked && access.partnerLocked) return "Крім партнерів";
  return "Лише роздрібним";
}

// "Зараз завантажують гості, роздрібні покупці та партнери." for a tooltip.
function nowDownloading(access: Access): string {
  const can = VIEWERS.filter((entry) => canDownloadMaterial(access, entry.viewer)).map((entry) => entry.name);
  return `Зараз завантажують ${can.length === 1 ? "лише " : ""}${joinNames(can)}.`;
}

// What each switch does, then exactly who downloads in the current state.
export function lockedTip(access: Access): string {
  const head = access.locked ? "Гостям треба увійти, щоб завантажити файл." : "Гості завантажують файл без входу.";
  return `${head} ${nowDownloading(access)}`;
}

export function partnerTip(access: Access): string {
  const head = access.partnerLocked
    ? "Партнери, що увійшли, бачать замок: файл не входить до їхньої угоди."
    : "Партнерам файл доступний.";
  return `${head} ${nowDownloading(access)}`;
}

// The address staff open or download a file at: the stored upload through
// the panel, a seed file of the site as it is, a link as it is.
export function staffLink(file: MaterialFileRow): { href: string; label: string } | null {
  if (file.source.kind === "media") {
    return { href: `/api/admin/media/${enc(file.source.mediaId)}/file?download=1`, label: "Завантажити" };
  }
  if (file.source.kind === "path") return file.source.path ? { href: file.source.path, label: "Завантажити" } : null;
  return { href: file.source.url, label: "Відкрити посилання" };
}

// A locked file whose upload is public can still be fetched at
// /api/media/<id> by anyone: the panel says so next to the row.
export function exposedLock(file: MaterialFileRow): boolean {
  return file.media?.access === "public" && (file.locked || file.partnerLocked);
}

// --- refusals ------------------------------------------------------------------------

export const ERRORS: Record<string, string> = {
  ...MATERIAL_ERROR_MESSAGES,
  "not-found": "Запис не знайдено: можливо, його щойно видалили. Оновіть сторінку.",
};

const FIELD_WORDS: Partial<Record<string, Partial<Record<MaterialFieldReason, string>>>> = {
  url: { invalid: "Потрібна повна адреса, що починається з https://", required: "Вкажіть адресу посилання." },
  mediaId: { unknown: "Файл не знайдено в медіатеці. Завантажте його ще раз.", required: "Завантажте файл." },
  source: { required: "Завантажте файл або вкажіть посилання.", conflict: MATERIAL_FIELD_MESSAGES.conflict },
  category: { unknown: "Такої папки вже немає. Оновіть сторінку." },
  slug: {
    invalid: "Лише латинські літери, цифри та дефіс.",
    reserved: MATERIAL_FIELD_MESSAGES.reserved,
    required: "Вкажіть адресу латиницею.",
  },
  ids: { mismatch: MATERIAL_FIELD_MESSAGES.mismatch },
};

// The field errors of a 400 "fields" answer, worded for the form. Keys
// like "directions.0" collapse onto their field.
export function fieldErrors(data: Record<string, unknown>): Record<string, string> {
  const raw = (data.fields ?? {}) as Record<string, string>;
  const out: Record<string, string> = {};
  for (const [path, reason] of Object.entries(raw)) {
    const key = path.split(".")[0];
    const words = FIELD_WORDS[key]?.[reason as MaterialFieldReason] ?? MATERIAL_FIELD_MESSAGES[reason as MaterialFieldReason];
    out[key] = words ?? "Перевірте значення.";
  }
  return out;
}

// --- small pieces ---------------------------------------------------------------------

export function Notice({ children, tone = "blue", className }: { children: ReactNode; tone?: "blue" | "amber"; className?: string }) {
  return (
    <div className={cx("flex gap-3 rounded-2xl px-4 py-3", className)} style={{ backgroundColor: TONES[tone].bg, color: TONES[tone].text }}>
      <InformationCircleIcon aria-hidden className="mt-px size-5 shrink-0" strokeWidth={1.7} />
      <div className="min-w-0 text-[13px] leading-[18px]">{children}</div>
    </div>
  );
}
