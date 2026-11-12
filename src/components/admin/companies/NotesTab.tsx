"use client";

import { ChatBubbleLeftEllipsisIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState, type FormEvent } from "react";
import { adminApi } from "../lib/api";
import { cx, formatDateTime } from "../lib/format";
import { OWNER_ROLE_ID } from "../lib/permissions";
import { invalidate } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Avatar } from "../ui/Avatar";
import { Button, IconButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmDialog } from "../ui/ConfirmDialog";
import { Textarea } from "../ui/Input";
import { EmptyState } from "../ui/States";
import { toast, toastError } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { COMPANY_ERRORS, NOTE_MAX, type CompanyDetail, type NoteAnswer, type StaffNoteDto } from "./types";

// "Нотатки": what staff want each other to know about the company. The
// partner never sees them. A member of staff removes their own notes; an
// owner also removes a colleague's (the API holds the same rule and
// answers 403 "not-author" to anybody else).

export function NotesTab({ company, canEdit }: { company: CompanyDetail; canEdit: boolean }) {
  const { me } = useStaff();
  const isOwner = me.roleId === OWNER_ROLE_ID;
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const base = `/companies/${encodeURIComponent(company.id)}/notes`;

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) {
      setError("Напишіть текст нотатки");
      return;
    }
    setBusy(true);
    const result = await adminApi<NoteAnswer>(base, { method: "POST", body: { text: text.trim() } });
    setBusy(false);
    if (!result.ok) {
      toastError(result, COMPANY_ERRORS);
      return;
    }
    setText("");
    setError("");
    invalidate(`/companies/${encodeURIComponent(company.id)}`);
    invalidate("/audit");
    toast.success("Нотатку додано");
  };

  const remove = async (note: StaffNoteDto) => {
    const own = note.by.id === me.id;
    const yes = await confirmDialog({
      title: own ? "Видалити нотатку?" : "Видалити нотатку колеги?",
      text: own
        ? "Її текст зникне назавжди; у журналі дій лишиться запис про видалення."
        : `Автор нотатки: ${note.by.name || "співробітник"}. Її текст зникне назавжди; у журналі дій лишиться запис про видалення з іменем автора.`,
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!yes) return;
    setRemoving(note.id);
    const result = await adminApi(`${base}/${encodeURIComponent(note.id)}`, { method: "DELETE" });
    setRemoving(null);
    // Also after a refusal: the note may be gone already.
    invalidate(`/companies/${encodeURIComponent(company.id)}`);
    if (!result.ok) {
      toastError(result, { ...COMPANY_ERRORS, "not-found": "Нотатку вже видалили." });
      return;
    }
    invalidate("/audit");
    toast.success("Нотатку видалено");
  };

  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
      {canEdit ? (
        <Card title="Нова нотатка" subtitle="Бачать лише співробітники панелі, компанія - ні." className="xl:sticky xl:top-24">
          <form onSubmit={add} noValidate className="flex flex-col gap-3">
            <Textarea
              aria-label="Текст нотатки"
              value={text}
              onChange={(value) => {
                setText(value);
                if (error) setError("");
              }}
              error={error}
              rows={4}
              autoGrow
              maxRows={12}
              maxLength={NOTE_MAX}
              showCount
              placeholder="Наприклад: домовились про відстрочку 30 днів до кінця року"
            />
            <Button type="submit" loading={busy} className="w-fit">
              Додати нотатку
            </Button>
          </form>
        </Card>
      ) : (
        <Card title="Нотатки" subtitle="Бачать лише співробітники панелі, компанія - ні." />
      )}

      {company.notes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ChatBubbleLeftEllipsisIcon aria-hidden className="size-6" strokeWidth={1.7} />}
            title="Нотаток ще немає"
            text="Записуйте домовленості, особливості доставки чи оплати: їх побачить кожен, хто відкриє компанію."
          />
        </Card>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-stroke-subtle">
            {company.notes.map((note) => (
              <li key={note.id} className={cx("flex gap-3 px-5 py-4 min-[1024px]:px-6", removing === note.id && "opacity-60")}>
                <Avatar name={note.by.name || "Співробітник"} size="md" decorative />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className={TEXT.bodyStrong}>{note.by.name || "Співробітник"}</span>
                    <span className={cx(TEXT.caption, "tabular-nums")}>{formatDateTime(note.at)}</span>
                    {note.by.id === me.id && <span className={TEXT.caption}>(ви)</span>}
                  </div>
                  <p className={cx(TEXT.body, "mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]")}>{note.text}</p>
                </div>
                {canEdit && (note.by.id === me.id || isOwner) && (
                  <IconButton
                    label="Видалити нотатку"
                    icon={TrashIcon}
                    size="sm"
                    variant="danger"
                    loading={removing === note.id}
                    onClick={() => void remove(note)}
                  />
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
