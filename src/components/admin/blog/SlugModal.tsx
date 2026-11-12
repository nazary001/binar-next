"use client";

import { useState, type FormEvent } from "react";
import { cx, slugify } from "../lib/format";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal, ModalFooter } from "../ui/Modal";
import { TEXT, TONES } from "../ui/tokens";
import { BLOG_LIMITS, BLOG_RESERVED_SLUGS } from "./types";

// "Змінити адресу": the slug of an article is its address (/blog/<slug>).
// A saved article is renamed by the API (POST .../slug); a new one only
// keeps the chosen address until it is created. The dialog says what a
// rename costs: the old address of a published article stops working.
//
//   <SlugModal open={open} onClose={...} session={n} current="old-slug" title={form.title}
//     isPublic={record.isPublic} mode="rename" busy={busy} error={slugError} onSubmit={(slug) => rename(slug)} />
//
// `session` changes every time the dialog opens, so the field starts from
// `current` again.

const PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

// Typing is shaped as it goes: lower case, a hyphen for a space.
function shape(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-").slice(0, BLOG_LIMITS.slug);
}

export function checkSlug(slug: string): string | null {
  if (!slug) return "Вкажіть адресу.";
  if (!PATTERN.test(slug)) return "Лише малі латинські літери, цифри та дефіс; на початку літера або цифра.";
  if ((BLOG_RESERVED_SLUGS as readonly string[]).includes(slug)) return "Ця адреса зайнята службовою сторінкою.";
  return null;
}

type FormProps = {
  current: string;
  title: string;
  isPublic: boolean;
  mode: "rename" | "new";
  error?: string;
  onSubmit: (slug: string) => void;
};

function SlugForm({ current, title, isPublic, mode, error, onSubmit }: FormProps) {
  const [value, setValue] = useState(current);
  const [local, setLocal] = useState<string | null>(null);
  const suggestion = slugify(title, BLOG_LIMITS.slug);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const slug = value.trim().replace(/-+$/, "");
    const problem = checkSlug(slug);
    setLocal(problem);
    if (!problem) onSubmit(slug);
  };

  return (
    <form id="blog-slug-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Input
        label="Нова адреса"
        prefix="/blog/"
        value={value}
        onChange={(next) => {
          setValue(shape(next));
          setLocal(null);
        }}
        error={local ?? error}
        hint="Латинські літери, цифри та дефіс."
        maxLength={BLOG_LIMITS.slug}
        autoFocus
        spellCheck={false}
        autoCapitalize="off"
        labelAction={
          suggestion && suggestion !== value ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setValue(suggestion);
                setLocal(null);
              }}
            >
              Із заголовка
            </Button>
          ) : undefined
        }
      />
      {mode === "rename" && (
        <div
          className={cx("rounded-2xl px-4 py-3", TEXT.body, !isPublic && "bg-bg-subtle")}
          style={isPublic ? { backgroundColor: TONES.amber.bg, color: TONES.amber.text } : undefined}
        >
          {isPublic ? (
            <>
              <p className="font-semibold">Стара адреса /blog/{current} перестане працювати.</p>
              <p className="mt-1">
                Посилання на неї в соцмережах, розсилках і пошуковиках вестимуть на сторінку «не знайдено»: переспрямування не
                створюється.
              </p>
            </>
          ) : (
            <p className="text-neutral-600">Стаття ще не опублікована, тож стару адресу ніхто не бачив: її можна змінювати вільно.</p>
          )}
        </div>
      )}
    </form>
  );
}

export type SlugModalProps = FormProps & {
  open: boolean;
  onClose: () => void;
  session: number;
  busy?: boolean;
};

export function SlugModal({ open, onClose, session, busy = false, ...form }: SlugModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={form.mode === "new" ? "Адреса статті" : "Змінити адресу статті"}
      description="Адреса - це остання частина посилання на статтю на сайті."
      size="md"
      busy={busy}
      footer={
        <ModalFooter
          onCancel={onClose}
          confirmLabel={form.mode === "new" ? "Застосувати" : "Змінити адресу"}
          form="blog-slug-form"
          busy={busy}
          tone={form.mode === "rename" && form.isPublic ? "danger" : "default"}
        />
      }
    >
      <SlugForm key={session} {...form} />
    </Modal>
  );
}
