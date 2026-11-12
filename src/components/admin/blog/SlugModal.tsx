"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useState, type FormEvent } from "react";
import { cx, slugify } from "../lib/format";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal, ModalFooter } from "../ui/Modal";
import { TEXT, TONES } from "../ui/tokens";
import { BLOG_LIMITS, BLOG_RESERVED_SLUGS, type BlogOldAddress } from "./types";

// "Змінити адресу": the slug of an article is its address (/blog/<slug>).
// A saved article is renamed by the API (POST .../slug); a new one only
// keeps the chosen address until it is created. The dialog says what a
// rename costs: the old address of a published article stops working
// unless it redirects, and an address another article keeps as an old one
// (BlogOptions.oldAddresses) loses that redirect when it is taken, which
// the dialog says while the address is typed, before the save.
//
//   <SlugModal open={open} onClose={...} session={n} current="old-slug" title={form.title}
//     isPublic={record.isPublic} mode="rename" postId={record.id} oldAddresses={options.oldAddresses}
//     busy={busy} error={slugError} onSubmit={(slug) => rename(slug)} />
//
// `session` changes every time the dialog opens, so the field starts from
// `current` again.

const PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

// Typing is shaped as it goes: lower case, a hyphen for a space.
function shape(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-").slice(0, BLOG_LIMITS.slug);
}

// The address as it will be sent.
function finalSlug(value: string): string {
  return value.trim().replace(/-+$/, "");
}

export function checkSlug(slug: string): string | null {
  if (!slug) return "Вкажіть адресу.";
  if (!PATTERN.test(slug)) return "Лише малі латинські літери, цифри та дефіс; на початку літера або цифра.";
  if ((BLOG_RESERVED_SLUGS as readonly string[]).includes(slug)) return "Ця адреса зайнята службовою сторінкою.";
  return null;
}

// The old address of another article that `slug` would take, if any.
export function takenOldAddress(slug: string, postId: string | null, oldAddresses: readonly BlogOldAddress[]): BlogOldAddress | null {
  return oldAddresses.find((entry) => entry.slug === slug && entry.postId !== postId) ?? null;
}

// What taking another article's old address costs, in the dialog and in
// the address card of a new article.
export function OldAddressNotice({ taken, className }: { taken: BlogOldAddress; className?: string }) {
  return (
    <div
      role="status"
      className={cx("flex gap-2.5 rounded-2xl px-4 py-3", TEXT.body, className)}
      style={{ backgroundColor: TONES.amber.bg, color: TONES.amber.text }}
    >
      <ExclamationTriangleIcon aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <p className="font-semibold">
          {taken.isPublic
            ? `Адреса /blog/${taken.slug} зараз переспрямовує на статтю «${taken.title}».`
            : `Адресу /blog/${taken.slug} як стару зберігає стаття «${taken.title}» (вона не опублікована).`}
        </p>
        <p className="mt-1">
          Якщо дати цю адресу цій статті, переспрямування на «{taken.title}» зникне: старі посилання на ту статтю більше не
          вестимуть до неї.
        </p>
      </div>
    </div>
  );
}

type FormProps = {
  current: string;
  title: string;
  isPublic: boolean;
  mode: "rename" | "new";
  // The article being renamed (null for a new one) and every old address
  // the articles keep.
  postId: string | null;
  oldAddresses: readonly BlogOldAddress[];
  error?: string;
  onSubmit: (slug: string) => void;
};

function SlugForm({ current, title, isPublic, mode, postId, oldAddresses, error, onSubmit }: FormProps) {
  const [value, setValue] = useState(current);
  const [local, setLocal] = useState<string | null>(null);
  const suggestion = slugify(title, BLOG_LIMITS.slug);
  const typed = finalSlug(value);
  const changed = typed !== current && checkSlug(typed) === null;
  const taken = changed ? takenOldAddress(typed, postId, oldAddresses) : null;
  const ownOld = changed && postId !== null && oldAddresses.some((entry) => entry.slug === typed && entry.postId === postId);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const slug = finalSlug(value);
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
      {taken && <OldAddressNotice taken={taken} />}
      {ownOld && (
        <p className={cx("rounded-2xl bg-bg-subtle px-4 py-3 text-neutral-600", TEXT.body)}>
          Це одна зі старих адрес цієї статті: вона знову стане основною.
        </p>
      )}
      {mode === "rename" && (
        <div className={cx("rounded-2xl bg-bg-subtle px-4 py-3 text-neutral-600", TEXT.body)}>
          {isPublic ? (
            <>
              <p className="font-semibold text-black">Стара адреса /blog/{current} переспрямовуватиме на нову.</p>
              <p className="mt-1">
                Посилання в соцмережах, розсилках і пошуковиках і далі відкриватимуть статтю. Якщо згодом іншій статті дати цю
                стару адресу, переспрямування зникне.
              </p>
            </>
          ) : (
            <p>Стаття ще не опублікована, тож стару адресу ніхто не бачив: її можна змінювати вільно.</p>
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
        />
      }
    >
      <SlugForm key={session} {...form} />
    </Modal>
  );
}
