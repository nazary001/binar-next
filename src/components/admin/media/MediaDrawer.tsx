"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
  CubeIcon,
  FolderIcon,
  LockClosedIcon,
  NewspaperIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { adminApi } from "../lib/api";
import { countOf, cx, formatBytes, formatDateTime, plural } from "../lib/format";
import type { Permission } from "../lib/permissions";
import { invalidate, setQueryData, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import type { StaffOption } from "../staff/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { confirmDialog } from "../ui/ConfirmDialog";
import { Drawer } from "../ui/Drawer";
import { useDirty, useUnsavedWarning } from "../ui/Form";
import { Input, Textarea } from "../ui/Input";
import { CopyButton, KeyValueList } from "../ui/KeyValue";
import { fileTypeLabel } from "../ui/media/upload";
import { Select } from "../ui/Select";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { NotFoundState } from "../ui/States";
import { toast, toastError } from "../ui/Toast";
import { COLOR_TRANSITION, FOCUS_RING, TEXT, TONES } from "../ui/tokens";
import {
  MEDIA_ERRORS,
  MEDIA_FOLDERS,
  type MediaDetailAnswer,
  type MediaDto,
  type MediaFolder,
  type MediaPatchAnswer,
  type MediaPatchInput,
  type MediaUsageItem,
  type MediaUsageType,
} from "./types";

// One file of the library in a panel from the right (the list keeps it in
// the address bar as ?id=<media id>): a large preview, the name, the alt
// text and the folder (editable), the facts, the public address, where the
// file is used (links into the panel), "Завантажити" and "Видалити".
//
// Deleting a file that records still use is refused by the server with the
// list of those records; an editor may then remove it anyway after a second
// question that says what breaks.

// Who may rename and remove files: the media routes' MEDIA_EDIT.
export const MEDIA_EDIT: readonly Permission[] = ["content.edit", "catalog.edit"];

const enc = encodeURIComponent;

const FOLDER_OPTIONS = MEDIA_FOLDERS.map((folder) => ({ value: folder.value, label: folder.label }));

export function folderLabel(folder: string): string {
  return MEDIA_FOLDERS.find((entry) => entry.value === folder)?.label ?? folder;
}

const USAGE_ICON: Record<MediaUsageType, typeof CubeIcon> = {
  blog: NewspaperIcon,
  product: CubeIcon,
  material: FolderIcon,
  order: ShoppingBagIcon,
};

// "Документ PDF", "Таблиця Excel": the kind of file in words.
function typeName(media: MediaDto): string {
  const type = media.contentType.toLowerCase();
  const extension = fileTypeLabel(media.filename, media.contentType);
  if (type.startsWith("image/")) return `Зображення ${extension}`;
  if (type === "application/pdf") return "Документ PDF";
  if (type.includes("word")) return `Документ Word (${extension})`;
  if (type.includes("excel") || type.includes("spreadsheet")) return `Таблиця Excel (${extension})`;
  if (type.includes("powerpoint") || type.includes("presentation")) return `Презентація PowerPoint (${extension})`;
  return extension;
}

const USAGE_KIND: Record<MediaUsageType, string> = {
  blog: "Стаття",
  product: "Товар",
  material: "Матеріали",
  order: "Замовлення",
};

type Values = { filename: string; alt: string; folder: MediaFolder };

function valuesOf(media: MediaDto): Values {
  return { filename: media.filename, alt: media.alt, folder: media.folder as MediaFolder };
}

function UsageList({ usage }: { usage: MediaUsageItem[] }) {
  if (usage.length === 0) {
    return (
      <p className="rounded-2xl bg-bg-subtle px-4 py-3 text-[13px] leading-[18px] text-neutral-600">
        Файл ніде не використовується: його можна видалити без наслідків.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {usage.map((item, index) => {
        const Icon = USAGE_ICON[item.type] ?? FolderIcon;
        return (
          <li key={`${item.type}-${item.id}-${index}`}>
            <Link
              href={item.href}
              className={cx(
                "group flex min-w-0 items-center gap-3 rounded-2xl bg-bg-subtle px-3 py-2.5 hover:bg-bg-cabinet motion-reduce:transition-none",
                COLOR_TRANSITION,
                FOCUS_RING,
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-neutral-700" title={USAGE_KIND[item.type]}>
                <Icon aria-hidden className="size-[18px]" strokeWidth={1.7} />
                <span className="sr-only">{USAGE_KIND[item.type]}:</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cx(TEXT.bodyStrong, "truncate")}>{item.label}</span>
                <span className={cx(TEXT.caption, "truncate")}>{item.field}</span>
              </span>
              <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-neutral-400 group-hover:text-neutral-900" strokeWidth={2} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// The list of records inside the second question of a forced delete.
function UsageLines({ usage }: { usage: MediaUsageItem[] }) {
  return (
    <span className="mt-3 flex flex-col gap-1">
      {usage.slice(0, 6).map((item, index) => (
        <span key={`${item.type}-${item.id}-${index}`} className="line-clamp-2 block text-[13px] leading-[18px] text-neutral-800">
          {item.label}
          <span className="text-neutral-500">, {item.field.charAt(0).toLowerCase() + item.field.slice(1)}</span>
        </span>
      ))}
      {usage.length > 6 && <span className="block text-[13px] leading-[18px] text-neutral-500">і ще {usage.length - 6}</span>}
    </span>
  );
}

function Preview({ media }: { media: MediaDto }) {
  const src = media.url ?? media.adminUrl;
  return (
    // A document has no picture to show: a short panel instead of a tall
    // empty one.
    <div
      className={cx(
        "relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-bg-subtle",
        media.kind === "image" ? "aspect-[4/3]" : "h-44",
      )}
    >
      {media.kind === "image" ? (
        <img src={src} alt={media.alt} className="size-full object-contain" />
      ) : (
        <span className="flex flex-col items-center gap-3">
          <span className="flex size-20 items-center justify-center rounded-2xl bg-white text-[18px] font-bold tracking-[0.02em] text-neutral-800">
            {fileTypeLabel(media.filename, media.contentType)}
          </span>
          <span className={TEXT.caption}>Попереднього перегляду немає: відкрийте файл</span>
        </span>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h3 className={TEXT.cardTitle}>{title}</h3>
      {children}
    </section>
  );
}

const FORM_ID = "media-form";

export function MediaDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { can } = useStaff();
  const canEdit = can(MEDIA_EDIT);
  const key = id ? `/media/${enc(id)}` : null;
  const detail = useAdminQuery<MediaDetailAnswer>(key);
  const staff = useAdminQuery<{ ok: true; items: StaffOption[] }>("/staff/options");

  // The answer of an earlier file stays in the hook while the next loads.
  const answer = detail.data && id && detail.data.media.id === id ? detail.data : undefined;
  const media = answer?.media;
  const missing = Boolean(id && detail.error?.error === "not-found" && !answer);

  const [formFor, setFormFor] = useState<string | null>(null);
  const [base, setBase] = useState<Values | null>(null);
  const [form, setForm] = useState<Values>({ filename: "", alt: "", folder: "misc" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The form starts from the file the first time it arrives (state reset
  // in render, behind a comparison).
  if (media && formFor !== media.id) {
    const values = valuesOf(media);
    setFormFor(media.id);
    setBase(values);
    setForm(values);
    setErrors({});
  }

  const dirty = useDirty(formFor === id ? base : null, form);
  useUnsavedWarning(dirty);

  const close = async () => {
    if (dirty) {
      const leave = await confirmDialog({
        title: "Закрити без збереження?",
        text: "Зміни назви, опису чи папки цього файлу буде втрачено.",
        confirmLabel: "Закрити без збереження",
        cancelLabel: "Повернутися",
        tone: "danger",
      });
      if (!leave) return;
    }
    // A later opening of the same file starts from what is stored.
    setFormFor(null);
    onClose();
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!media || !base) return;
    const filename = form.filename.trim();
    if (!filename) {
      setErrors({ filename: "Вкажіть назву файлу." });
      return;
    }
    const body: MediaPatchInput = {};
    if (filename !== base.filename) body.filename = filename;
    if (form.alt.trim() !== base.alt) body.alt = form.alt.trim();
    if (form.folder !== base.folder) body.folder = form.folder;
    if (Object.keys(body).length === 0) {
      setForm(base);
      return;
    }
    setSaving(true);
    const result = await adminApi<MediaPatchAnswer>(`/media/${enc(media.id)}`, { method: "PATCH", body });
    setSaving(false);
    if (!result.ok) {
      toastError(result, { ...MEDIA_ERRORS, "bad-request": "Перевірте назву: до 200 символів, без порожнього значення." });
      return;
    }
    const saved = result.data.media;
    const values = valuesOf(saved);
    setBase(values);
    setForm(values);
    if (key && answer) setQueryData<MediaDetailAnswer>(key, { ...answer, media: saved });
    invalidate("/media?");
    toast.success(body.filename && saved.filename !== filename ? `Збережено. Розширення файлу лишилося: «${saved.filename}».` : "Зміни збережено.");
  };

  const remove = async () => {
    if (!media || !answer) return;
    const ok = await confirmDialog({
      title: "Видалити файл?",
      text: `«${media.filename}» зникне з медіатеки назавжди. Відновити його не вийде.`,
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    let result = await adminApi(`/media/${enc(media.id)}`, { method: "DELETE" });
    if (!result.ok && result.error === "in-use") {
      const usage = (Array.isArray(result.data.usage) ? result.data.usage : answer.usage) as MediaUsageItem[];
      const force = await confirmDialog({
        title: "Файл використовується",
        text: (
          <>
            <span className="block">
              На файл {plural(usage.length, ["посилається", "посилаються", "посилаються"])}{" "}
              {countOf(usage.length, ["запис", "записи", "записів"])}. Якщо видалити його, на сайті там лишиться порожнє місце замість
              зображення, а документ перестане відкриватися.
            </span>
            <UsageLines usage={usage} />
          </>
        ),
        confirmLabel: "Видалити все одно",
        cancelLabel: "Залишити файл",
        tone: "danger",
      });
      if (!force) {
        setDeleting(false);
        if (key) setQueryData<MediaDetailAnswer>(key, { ...answer, usage });
        return;
      }
      result = await adminApi(`/media/${enc(media.id)}?force=1`, { method: "DELETE" });
    }
    setDeleting(false);
    if (!result.ok) {
      toastError(result, MEDIA_ERRORS);
      return;
    }
    setFormFor(null);
    onClose();
    // The lists only: the record of the deleted file must not be asked for
    // again (it would answer 404) while the panel slides out.
    invalidate("/media?");
    toast.success(`Файл «${media.filename}» видалено.`);
  };

  const uploader = media?.createdBy
    ? (staff.data?.items.find((person) => person.id === media.createdBy)?.name ?? (staff.data ? "Колишній співробітник" : "..."))
    : "Невідомо";
  const publicUrl = media?.url ? (typeof window === "undefined" ? media.url : new URL(media.url, window.location.origin).href) : null;

  const footer = media ? (
    canEdit ? (
      <>
        <Button variant="dangerGhost" onClick={() => void remove()} loading={deleting} disabled={saving} className="min-[640px]:mr-auto">
          Видалити
        </Button>
        {dirty && (
          <Button variant="secondary" onClick={() => setForm(base ?? form)} disabled={saving}>
            Скасувати
          </Button>
        )}
        <Button type="submit" form={FORM_ID} loading={saving} disabled={!dirty || deleting}>
          Зберегти зміни
        </Button>
      </>
    ) : (
      <Button variant="secondary" onClick={() => void close()}>
        Закрити
      </Button>
    )
  ) : missing ? (
    <Button variant="secondary" onClick={() => void close()}>
      Закрити
    </Button>
  ) : undefined;

  return (
    <Drawer
      open={id !== null}
      onClose={() => void close()}
      busy={saving || deleting}
      width={600}
      title={media ? <span className="[overflow-wrap:anywhere]">{media.filename}</span> : missing ? "Файл не знайдено" : "Файл медіатеки"}
      description={media ? `${media.kind === "image" ? "Зображення" : "Документ"}, ${folderLabel(media.folder)}` : undefined}
      footer={footer}
    >
      {missing ? (
        <NotFoundState title="Файл не знайдено" text="Можливо, його вже видалили з медіатеки." className="min-h-0 py-10" />
      ) : !media ? (
        <div aria-hidden className="flex flex-col gap-5">
          <Skeleton shape="tile" className="aspect-[4/3] w-full" />
          <SkeletonText lines={4} />
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            <Preview media={media} />
            <div className="flex flex-wrap items-center gap-2">
              {media.access === "private" ? (
                // Badge truncates its text in a block span, so an icon would
                // take a line of its own: the same pill, drawn here.
                <span
                  className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full pl-2 pr-2.5 text-[12px] font-medium leading-4"
                  style={{ backgroundColor: TONES.neutral.bg, color: TONES.neutral.text }}
                >
                  <LockClosedIcon aria-hidden className="size-3.5" strokeWidth={2} />
                  Приватний
                </span>
              ) : (
                <Badge tone="green" dot>
                  Публічний
                </Badge>
              )}
              <span className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" href={media.adminUrl} external iconLeft={ArrowTopRightOnSquareIcon}>
                  Відкрити
                </Button>
                <Button size="sm" variant="secondary" href={`${media.adminUrl}?download=1`} external iconLeft={ArrowDownTrayIcon}>
                  Завантажити
                </Button>
              </span>
            </div>
          </div>

          {canEdit ? (
            <form id={FORM_ID} onSubmit={(event) => void save(event)} noValidate className="flex flex-col gap-5">
              <Input
                label="Назва файлу"
                required
                value={form.filename}
                onChange={(filename) => {
                  setForm({ ...form, filename });
                  if (errors.filename) setErrors({});
                }}
                maxLength={200}
                error={errors.filename}
                hint="Розширення лишиться тим самим: його визначає вміст файлу."
              />
              {media.kind === "image" && (
                <Textarea
                  label="Опис зображення (alt)"
                  optional
                  value={form.alt}
                  onChange={(alt) => setForm({ ...form, alt })}
                  rows={2}
                  autoGrow
                  maxRows={5}
                  maxLength={300}
                  hint="Що зображено. Його читають програми для незрячих і пошукові системи."
                />
              )}
              <Select
                label="Папка"
                value={form.folder}
                onChange={(folder) => setForm({ ...form, folder })}
                options={FOLDER_OPTIONS}
                hint="Лише для порядку в медіатеці: на сайті нічого не зміниться."
              />
            </form>
          ) : (
            media.kind === "image" && (
              <Section title="Опис зображення (alt)">
                <p className={cx(TEXT.body, !media.alt && "text-neutral-500")}>{media.alt || "Опису немає"}</p>
              </Section>
            )
          )}

          <Section title="Про файл">
            <KeyValueList
              columns={2}
              dense
              items={[
                { label: "Тип", value: typeName(media) },
                { label: "Розмір", value: <span className="tabular-nums">{formatBytes(media.size)}</span> },
                ...(media.width && media.height
                  ? [{ label: "Розміри", value: <span className="tabular-nums">{`${media.width} x ${media.height} px`}</span> }]
                  : []),
                { label: "Завантажено", value: <span className="tabular-nums">{formatDateTime(media.createdAt)}</span> },
                { label: "Хто завантажив", value: uploader },
                ...(canEdit ? [] : [{ label: "Папка", value: folderLabel(media.folder) }]),
                { label: "Код у медіатеці", value: <span className="text-neutral-500">{media.id}</span>, copy: media.id },
              ]}
            />
          </Section>

          <Section title="Адреса">
            {publicUrl ? (
              <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-bg-subtle py-2.5 pl-4 pr-2.5">
                <span className="min-w-0 flex-1 truncate text-[13px] leading-[18px] text-neutral-800" title={publicUrl}>
                  {publicUrl}
                </span>
                <CopyButton text={publicUrl} label="публічна адреса файлу" />
              </div>
            ) : (
              <p
                className="flex gap-2.5 rounded-2xl px-4 py-3 text-[13px] leading-[18px]"
                style={{ backgroundColor: TONES.amber.bg, color: TONES.amber.text }}
              >
                <LockClosedIcon aria-hidden className="mt-px size-4 shrink-0" strokeWidth={2} />
                Приватний файл: публічної адреси немає. Його відкривають лише в панелі та на сторінках сайту, що перевіряють доступ
                (матеріали, документи замовлень).
              </p>
            )}
          </Section>

          <Section title={answer && answer.usage.length > 0 ? `Де використовується: ${answer.usage.length}` : "Де використовується"}>
            <UsageList usage={answer?.usage ?? []} />
          </Section>
        </div>
      )}
    </Drawer>
  );
}
