"use client";

import { useId, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Input, Textarea } from "./Input";
import { Modal, ModalFooter } from "./Modal";

// Questions asked from any event handler, answered in a dialog:
//
//   if (!(await confirmDialog({ title: "Видалити товар?", text: "Його не буде видно на сайті.", confirmLabel: "Видалити", tone: "danger" }))) return;
//
//   const reason = await promptDialog({ title: "Відхилити повернення", label: "Причина відхилення", multiline: true, required: true, confirmLabel: "Відхилити" });
//   if (reason === null) return;  // cancelled
//
// <ConfirmHost /> is rendered once by the shell. One dialog is shown at a
// time; questions asked meanwhile wait in a queue and open one after the
// other. The promise of confirmDialog resolves to true (confirmed) or false
// (cancelled, Escape, the cross, the scrim); promptDialog resolves to the
// trimmed text or null.
//
// confirmDialog options
// - title: the question ("Скасувати замовлення?"); text: what follows from it.
// - confirmLabel (default "Підтвердити"), cancelLabel (default "Скасувати").
// - tone "danger": a red confirm button, and focus starts on Cancel so a
//   stray Enter does not destroy anything.
// promptDialog options
// - label: the field's label; placeholder, initial (the starting text).
// - required: an empty answer is refused with a message under the field.
// - multiline: a text area (Ctrl+Enter sends); maxLength (default 1000).

export type ConfirmOptions = {
  title: ReactNode;
  text?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

export type PromptOptions = {
  title: ReactNode;
  text?: ReactNode;
  label: string;
  placeholder?: string;
  initial?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  tone?: "default" | "danger";
};

type Request =
  | { id: number; kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { id: number; kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

type Snapshot = { current: Request | null; open: boolean };

// The Modal's exit animation; the next question opens after it.
const EXIT_MS = 400;

let queue: Request[] = [];
let closing = false;
let nextId = 1;
let snapshot: Snapshot = { current: null, open: false };
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT: Snapshot = { current: null, open: false };

function emit(): void {
  snapshot = { current: queue[0] ?? null, open: queue.length > 0 && !closing };
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function answer(id: number, value: boolean | string | null): void {
  const head = queue[0];
  if (!head || head.id !== id || closing) return;
  if (head.kind === "confirm") head.resolve(value === true);
  else head.resolve(typeof value === "string" ? value : null);
  closing = true;
  emit();
  window.setTimeout(() => {
    queue = queue.slice(1);
    closing = false;
    emit();
  }, EXIT_MS);
}

function plainText(node: ReactNode): string {
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}

// Whether a <ConfirmHost /> is mounted (a page that renders its own host,
// the kit's gallery, checks this so the panel never shows two).
export function hasConfirmHost(): boolean {
  return listeners.size > 0;
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (listeners.size === 0) {
    // No host on this page (a screen rendered outside the shell): the
    // browser's own dialog keeps the question answerable.
    console.warn("confirmDialog: <ConfirmHost /> is not mounted");
    return Promise.resolve(window.confirm([plainText(options.title), plainText(options.text)].filter(Boolean).join("\n\n")));
  }
  return new Promise<boolean>((resolve) => {
    queue = [...queue, { id: nextId++, kind: "confirm", options, resolve }];
    emit();
  });
}

export function promptDialog(options: PromptOptions): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (listeners.size === 0) {
    console.warn("promptDialog: <ConfirmHost /> is not mounted");
    const value = window.prompt(options.label, options.initial ?? "");
    return Promise.resolve(value === null ? null : value.trim());
  }
  return new Promise<string | null>((resolve) => {
    queue = [...queue, { id: nextId++, kind: "prompt", options, resolve }];
    emit();
  });
}

function ConfirmCard({ request, open }: { request: Extract<Request, { kind: "confirm" }>; open: boolean }) {
  const { title, text, confirmLabel = "Підтвердити", cancelLabel = "Скасувати", tone = "default" } = request.options;
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancel = () => answer(request.id, false);
  return (
    <Modal
      open={open}
      onClose={cancel}
      role="alertdialog"
      size="sm"
      title={title}
      description={text}
      // Danger: the first focusable button (Cancel) takes focus.
      initialFocusRef={tone === "danger" ? undefined : confirmRef}
      footer={
        <ModalFooter
          onCancel={cancel}
          cancelLabel={cancelLabel}
          onConfirm={() => answer(request.id, true)}
          confirmLabel={confirmLabel}
          confirmRef={confirmRef}
          tone={tone}
        />
      }
    />
  );
}

function PromptCard({ request, open }: { request: Extract<Request, { kind: "prompt" }>; open: boolean }) {
  const {
    title,
    text,
    label,
    placeholder,
    initial = "",
    confirmLabel = "Підтвердити",
    cancelLabel = "Скасувати",
    required = false,
    multiline = false,
    maxLength = 1000,
    tone = "default",
  } = request.options;
  const [value, setValue] = useState(initial);
  const [missing, setMissing] = useState(false);
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const formId = useId();

  const cancel = () => answer(request.id, null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (required && !trimmed) {
      setMissing(true);
      fieldRef.current?.focus();
      return;
    }
    answer(request.id, trimmed);
  };
  const onAreaKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  // The kit's field: label, the red asterisk of a required field, the
  // message under it while an empty answer is refused.
  const field = {
    label,
    value,
    placeholder,
    maxLength,
    required,
    error: missing ? "Заповніть це поле." : undefined,
    onChange: (next: string) => {
      setValue(next);
      if (missing) setMissing(false);
    },
  };

  return (
    <Modal
      open={open}
      onClose={cancel}
      size={multiline ? "md" : "sm"}
      title={title}
      description={text}
      initialFocusRef={fieldRef}
      footer={
        <ModalFooter onCancel={cancel} cancelLabel={cancelLabel} confirmLabel={confirmLabel} form={formId} tone={tone} />
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        {multiline ? (
          <Textarea {...field} ref={fieldRef} rows={4} hint="Ctrl+Enter - надіслати" onKeyDown={onAreaKey} />
        ) : (
          <Input {...field} ref={fieldRef} autoComplete="off" />
        )}
      </form>
    </Modal>
  );
}

export function ConfirmHost() {
  const { current, open } = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );
  if (!current) return null;
  return current.kind === "confirm" ? (
    <ConfirmCard key={current.id} request={current} open={open} />
  ) : (
    <PromptCard key={current.id} request={current} open={open} />
  );
}
