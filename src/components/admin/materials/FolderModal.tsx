"use client";

import { useState, type FormEvent } from "react";
import { adminApi } from "../lib/api";
import { slugify } from "../lib/format";
import { invalidate } from "../lib/query";
import { Input, Textarea } from "../ui/Input";
import { Modal, ModalFooter } from "../ui/Modal";
import { toast, toastError } from "../ui/Toast";
import { ERRORS, enc, fieldErrors } from "./shared";
import {
  MATERIAL_LIMITS,
  type MaterialCategoryAnswer,
  type MaterialCategoryCreateInput,
  type MaterialCategoryPatchInput,
  type MaterialCategoryRow,
} from "./types";

// A new folder, or the name and the partner note of an existing one. The
// address (slug) is chosen once, at creation: it is the folder's page on
// the site (/materials/<slug>) and partners may have bookmarked it.

type Props = {
  open: boolean;
  onClose: () => void;
  // null: a new folder.
  folder: MaterialCategoryRow | null;
  onSaved: (folder: MaterialCategoryRow, created: boolean) => void;
};

type Form = { title: string; slug: string; tagline: string };

const FORM_ID = "material-folder-form";

export function FolderModal({ open, onClose, folder, onSaved }: Props) {
  const [form, setForm] = useState<Form>({ title: "", slug: "", tagline: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Every opening starts from the folder it is for (state reset in render).
  const openKey = open ? `open:${folder?.id ?? "new"}` : "closed";
  const [seen, setSeen] = useState(openKey);
  if (seen !== openKey) {
    setSeen(openKey);
    if (open) {
      setForm({ title: folder?.title ?? "", slug: "", tagline: folder?.tagline ?? "" });
      setErrors({});
    }
  }

  const creating = folder === null;
  const autoSlug = slugify(form.title, MATERIAL_LIMITS.slug);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setErrors({ title: "Вкажіть назву папки." });
      return;
    }
    setBusy(true);
    const result = creating
      ? await adminApi<MaterialCategoryAnswer>("/materials/categories", {
          method: "POST",
          body: {
            title,
            ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
            ...(form.tagline.trim() ? { tagline: form.tagline.trim() } : {}),
          } satisfies MaterialCategoryCreateInput,
        })
      : await adminApi<MaterialCategoryAnswer>(`/materials/categories/${enc(folder.id)}`, {
          method: "PATCH",
          body: { title, tagline: form.tagline.trim() } satisfies MaterialCategoryPatchInput,
        });
    setBusy(false);
    if (!result.ok) {
      if (result.error === "fields") {
        const next = fieldErrors(result.data);
        // An address made from the title is not something the person typed:
        // say where it came from.
        if (next.slug && !form.slug.trim()) next.slug = "Адреса, зроблена з назви, не підходить. Вкажіть її вручну латиницею.";
        setErrors(next);
        return;
      }
      if (result.error === "exists") {
        setErrors({ slug: "Ця адреса вже зайнята іншою папкою. Вкажіть іншу." });
        return;
      }
      toastError(result, ERRORS);
      return;
    }
    invalidate("/materials");
    toast.success(creating ? `Папку «${result.data.category.title}» створено.` : "Зміни збережено.");
    onSaved(result.data.category, creating);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title={creating ? "Нова папка" : "Папка матеріалів"}
      description={
        creating
          ? "Папка з'явиться на сторінці /materials останньою. Порядок змінюють у меню папки: «Вище» і «Нижче»."
          : `Адреса на сайті: /materials/${folder.id}. Вона не змінюється.`
      }
      footer={<ModalFooter onCancel={onClose} confirmLabel={creating ? "Створити папку" : "Зберегти зміни"} form={FORM_ID} busy={busy} />}
    >
      <form id={FORM_ID} onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-5">
        <Input
          label="Назва"
          required
          value={form.title}
          onChange={(title) => {
            setForm({ ...form, title });
            if (errors.title) setErrors({ ...errors, title: "" });
          }}
          maxLength={MATERIAL_LIMITS.title}
          error={errors.title}
          placeholder="Наприклад, Сертифікати"
        />
        {creating && (
          <Input
            label="Адреса на сайті"
            optional
            prefix="/materials/"
            value={form.slug}
            onChange={(slug) => {
              setForm({ ...form, slug });
              if (errors.slug) setErrors({ ...errors, slug: "" });
            }}
            maxLength={MATERIAL_LIMITS.slug}
            placeholder={autoSlug || "certificates"}
            error={errors.slug}
            hint="Латиницею, через дефіс. Якщо лишити порожнім, адресу буде зроблено з назви."
            spellCheck={false}
            autoCapitalize="off"
          />
        )}
        <Textarea
          label="Примітка для партнерів"
          optional
          value={form.tagline}
          onChange={(tagline) => setForm({ ...form, tagline })}
          rows={2}
          autoGrow
          maxRows={5}
          maxLength={MATERIAL_LIMITS.tagline}
          error={errors.tagline}
          hint="Рядок під назвою папки в кабінеті партнера. Звичайні відвідувачі сайту його не бачать."
        />
      </form>
    </Modal>
  );
}
