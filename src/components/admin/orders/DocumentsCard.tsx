"use client";

import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useId, useState, type FormEvent } from "react";
import { adminApi } from "../lib/api";
import { cx, formatDate, formatNumber } from "../lib/format";
import { invalidate } from "../lib/query";
import { Badge } from "../ui/Badge";
import { Button, IconButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Switch } from "../ui/Checkbox";
import { confirmDialog, promptDialog } from "../ui/ConfirmDialog";
import { DateInput } from "../ui/DateInput";
import { KebabMenu, type MenuItem } from "../ui/DropdownMenu";
import { Input } from "../ui/Input";
import { ACCEPT_DOCUMENTS, FileField, type FileValue } from "../ui/media/FileField";
import { Modal, ModalFooter } from "../ui/Modal";
import { toast } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { orderErrorText, orderKey, refreshOrderViews } from "./shared";
import {
  ORDER_DOC_NOTE_MAX,
  ORDER_DOC_TITLE_MAX,
  ORDER_DOCUMENT_KIND_LABELS,
  type OrderDetail,
  type OrderDocumentAdminDto,
  type OrderDocumentAnswer,
  type OrderDocumentCreateBody,
  type OrderDocumentPatchBody,
} from "./types";

// "Документи": the papers of an order (invoices, waybills, acts) with
// their state for the customer, the staff download, and for editors the
// upload of a new one, rename, ready / held back, the note the customer
// sees while a paper is not ready, and removal. A shop customer has no
// cabinet, so on a shop order a paper is for staff only and has no
// "ready for the customer" state to manage.

// Documents and office files, plus photos of signed papers.
const ACCEPT = `${ACCEPT_DOCUMENTS},.jpg,.jpeg,.png,.webp`;

const DOC_ERRORS: Record<string, string> = {
  state: "Документів у замовленні вже забагато: видаліть зайві, щоб додати новий.",
  "not-found": "Документ не знайдено: можливо, його вже видалили. Список оновлено.",
};

function docPath(orderId: string, docId?: string): string {
  return `${orderKey(orderId)}/documents${docId ? `/${encodeURIComponent(docId)}` : ""}`;
}

function sizeText(mb: number): string {
  return `${mb.toFixed(1).replace(".", ",")} МБ`;
}

// --- one row --------------------------------------------------------------------------------

function DocumentRow({ order, doc, canEdit, partner }: { order: OrderDetail; doc: OrderDocumentAdminDto; canEdit: boolean; partner: boolean }) {
  const [busy, setBusy] = useState(false);

  const patch = async (body: OrderDocumentPatchBody, done: string) => {
    setBusy(true);
    const result = await adminApi<OrderDocumentAnswer>(docPath(order.id, doc.id), { method: "PATCH", body });
    setBusy(false);
    if (!result.ok) {
      const fields = (result.data.fields ?? {}) as Record<string, string>;
      toast.error(fields.ready === "file" ? "Щоб документ був доступний клієнту, спершу додайте до нього файл." : orderErrorText(result, DOC_ERRORS));
      invalidate(orderKey(order.id));
      return;
    }
    invalidate(orderKey(order.id));
    toast.success(done);
  };

  const rename = async () => {
    const title = await promptDialog({
      title: "Перейменувати документ",
      label: "Назва",
      initial: doc.title,
      required: true,
      maxLength: ORDER_DOC_TITLE_MAX,
      confirmLabel: "Зберегти назву",
    });
    if (title === null || title === doc.title) return;
    await patch({ title }, "Назву змінено");
  };

  const editNote = async () => {
    const note = await promptDialog({
      title: "Примітка для клієнта",
      text: "Її видно в кабінеті на місці документа, поки він не готовий. Порожнє поле прибирає примітку.",
      label: "Примітка",
      placeholder: "Наприклад: з'явиться після оплати",
      initial: doc.pendingNote ?? "",
      maxLength: ORDER_DOC_NOTE_MAX,
      confirmLabel: "Зберегти примітку",
    });
    if (note === null) return;
    await patch({ pendingNote: note || null }, note ? "Примітку збережено" : "Примітку прибрано");
  };

  const remove = async () => {
    const yes = await confirmDialog({
      title: `Видалити документ «${doc.title}»?`,
      text: partner
        ? "Клієнт більше не побачить його в кабінеті. Сам файл лишиться в медіатеці."
        : "Документ зникне із замовлення. Сам файл лишиться в медіатеці.",
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!yes) return;
    setBusy(true);
    const result = await adminApi(docPath(order.id, doc.id), { method: "DELETE" });
    setBusy(false);
    invalidate(orderKey(order.id));
    if (!result.ok) {
      toast.error(orderErrorText(result, DOC_ERRORS));
      return;
    }
    refreshOrderViews();
    toast.success("Документ видалено");
  };

  const menu: MenuItem[] = [
    { key: "rename", label: "Перейменувати", icon: PencilSquareIcon, onSelect: () => void rename() },
    ...(partner
      ? doc.ready
        ? [{ key: "hide", label: "Приховати від клієнта", icon: EyeSlashIcon, onSelect: () => void patch({ ready: false }, "Документ приховано від клієнта") }]
        : [
            {
              key: "ready",
              label: "Зробити доступним клієнту",
              icon: CheckCircleIcon,
              disabled: !doc.hasFile,
              hint: doc.hasFile ? undefined : "немає файлу",
              onSelect: () => void patch({ ready: true }, "Документ доступний клієнту"),
            },
            { key: "note", label: "Примітка для клієнта", icon: ChatBubbleBottomCenterTextIcon, onSelect: () => void editNote() },
          ]
      : []),
    { key: "divider", divider: true },
    { key: "delete", label: "Видалити", icon: TrashIcon, tone: "danger", onSelect: () => void remove() },
  ];

  const facts = [formatDate(doc.date), doc.hasFile ? sizeText(doc.sizeMb) : "файлу ще немає"].join(", ");

  return (
    <li className={cx("flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0", busy && "opacity-60")} aria-busy={busy || undefined}>
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-bg-cabinet text-[11px] font-bold leading-none text-neutral-800"
      >
        {doc.hasFile ? doc.format : <DocumentTextIcon className="size-5 text-neutral-400" strokeWidth={1.7} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cx(TEXT.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")}>{doc.title}</span>
          {doc.kind && <Badge tone="neutral">{ORDER_DOCUMENT_KIND_LABELS[doc.kind]}</Badge>}
          {doc.fromErp && <Badge tone="indigo">З BAS</Badge>}
        </span>
        <span className={cx(TEXT.caption, "tabular-nums")}>{facts}</span>
        {partner && (
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Badge tone={doc.ready ? "green" : "amber"} dot>
              {doc.ready ? "Доступний клієнту" : "Клієнт ще не бачить"}
            </Badge>
            {!doc.ready && doc.pendingNote && <span className={cx(TEXT.caption, "[overflow-wrap:anywhere]")}>Клієнт бачить: «{doc.pendingNote}»</span>}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-0.5">
        {doc.hasFile && (
          <>
            <IconButton size="sm" icon={ArrowTopRightOnSquareIcon} label={`Відкрити «${doc.title}»`} href={doc.href} external />
            <IconButton size="sm" icon={ArrowDownTrayIcon} label={`Завантажити «${doc.title}»`} href={`${doc.href}?download=1`} external />
          </>
        )}
        {canEdit && <KebabMenu size="sm" label={`Дії з документом «${doc.title}»`} items={menu} />}
      </span>
    </li>
  );
}

// --- the add dialog -------------------------------------------------------------------------

type DocErrors = { title?: string; file?: string; date?: string };

function AddDocumentForm({
  order,
  formId,
  partner,
  onDone,
  onBusy,
}: {
  order: OrderDetail;
  formId: string;
  partner: boolean;
  onDone: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<FileValue | null>(null);
  const [date, setDate] = useState(order.today);
  const [ready, setReady] = useState(true);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<DocErrors>({});
  // Without a file a paper cannot be ready: the switch shows it off.
  const readyNow = partner && ready && file !== null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const local: DocErrors = {};
    if (!title.trim()) local.title = "Вкажіть назву документа.";
    if (!date) local.date = "Вкажіть дату документа.";
    // The file field tells about an upload only when it is done; while one
    // runs it shows a status row. Saving then would add the paper without
    // its file.
    if (event.currentTarget.querySelector("[data-file-field] [role='status']")) {
      local.file = "Зачекайте: файл ще завантажується.";
    }
    setErrors(local);
    if (local.title || local.date || local.file) return;
    const body: OrderDocumentCreateBody = {
      title: title.trim(),
      date,
      ...(file ? { mediaId: file.mediaId } : {}),
      ...(partner ? { ready: readyNow } : {}),
      ...(partner && !readyNow && note.trim() ? { pendingNote: note.trim() } : {}),
    };
    onBusy(true);
    const result = await adminApi<OrderDocumentAnswer>(docPath(order.id), { method: "POST", body });
    onBusy(false);
    if (!result.ok) {
      const fields = (result.data.fields ?? {}) as Record<string, string>;
      if (result.error === "fields") {
        setErrors({
          file:
            fields.mediaId === "unknown"
              ? "Файл не знайдено в медіатеці: завантажте його ще раз."
              : fields.ready === "file"
                ? "Щоб документ був доступний клієнту, додайте файл."
                : undefined,
          date: fields.date ? "Вкажіть правильну дату." : undefined,
          title: fields.title ? "Вкажіть назву документа." : undefined,
        });
        return;
      }
      toast.error(orderErrorText(result, DOC_ERRORS));
      return;
    }
    invalidate(orderKey(order.id));
    refreshOrderViews();
    toast.success(`Документ «${result.data.document.title}» додано`);
    onDone();
  };

  return (
    <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Input
        label="Назва"
        value={title}
        onChange={(next) => {
          setTitle(next);
          if (errors.title && next.trim()) setErrors({ ...errors, title: undefined });
        }}
        placeholder="Наприклад: Рахунок на оплату"
        maxLength={ORDER_DOC_TITLE_MAX}
        error={errors.title}
        required
      />
      <div data-file-field="">
        <FileField
          label="Файл"
          folder="orders"
          access="private"
          accept={ACCEPT}
          value={file}
          onChange={(next) => {
            setFile(next);
            setErrors((current) => ({ ...current, file: undefined }));
          }}
          error={errors.file}
          hint="PDF, документ Word чи Excel або фото підписаного документа"
          optional
        />
      </div>
      <DateInput
        label="Дата документа"
        value={date}
        onChange={(next) => {
          setDate(next);
          if (errors.date && next) setErrors({ ...errors, date: undefined });
        }}
        error={errors.date}
        required
        className="max-w-[240px]"
      />
      {partner ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-bg-subtle p-4">
          <Switch
            checked={readyNow}
            onChange={setReady}
            disabled={file === null}
            label="Доступний клієнту в кабінеті"
            hint={file === null ? "Спершу додайте файл. Без нього клієнт бачить лише назву і примітку." : "Партнер зможе відкрити й завантажити файл"}
          />
          {!readyNow && (
            <Input
              label="Що бачить клієнт, поки документ не готовий"
              value={note}
              onChange={setNote}
              placeholder="Наприклад: з'явиться після оплати"
              maxLength={ORDER_DOC_NOTE_MAX}
              optional
            />
          )}
        </div>
      ) : (
        <p className={cx(TEXT.muted, "rounded-2xl bg-bg-subtle px-4 py-3")}>
          Роздрібні покупці не мають кабінету: документ бачать лише співробітники.
        </p>
      )}
    </form>
  );
}

// --- the card -------------------------------------------------------------------------------

export function DocumentsCard({ order, canEdit }: { order: OrderDetail; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [busy, setBusy] = useState(false);
  const formId = useId();
  const partner = order.channel === "b2b";
  const docs = order.documents;
  const ready = docs.filter((doc) => doc.ready).length;

  const add = () => {
    setSession((value) => value + 1);
    setOpen(true);
  };

  return (
    <Card
      title="Документи"
      subtitle={
        docs.length === 0
          ? undefined
          : partner
            ? `${formatNumber(docs.length)} у замовленні, клієнту доступно ${formatNumber(ready)}`
            : `${formatNumber(docs.length)} у замовленні`
      }
      actions={
        canEdit && docs.length > 0 ? (
          <Button size="sm" variant="secondary" iconLeft={PlusIcon} onClick={add}>
            Додати документ
          </Button>
        ) : undefined
      }
    >
      {docs.length === 0 ? (
        // A quiet row, not a whole empty panel: most orders start without
        // papers, and the card should not outweigh the goods above it.
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-dashed border-stroke-default px-4 py-4 min-[640px]:flex-row min-[640px]:items-center">
          <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-bg-cabinet text-neutral-800">
            <DocumentTextIcon className="size-5" strokeWidth={1.7} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={TEXT.bodyStrong}>Документів ще немає</span>
            <span className={TEXT.caption}>
              {partner
                ? "Рахунки, накладні й акти, які ви додасте, партнер побачить у кабінеті."
                : "Тут можна зберегти рахунок, накладну чи інший папір до цього замовлення."}
            </span>
          </span>
          {canEdit && (
            <Button size="sm" variant="secondary" iconLeft={PlusIcon} onClick={add} className="self-start min-[640px]:self-auto">
              Додати документ
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-stroke-subtle">
          {docs.map((doc) => (
            <DocumentRow key={doc.id} order={order} doc={doc} canEdit={canEdit} partner={partner} />
          ))}
        </ul>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        busy={busy}
        size="lg"
        title="Додати документ"
        description={`До замовлення №${order.number}`}
        footer={<ModalFooter onCancel={() => setOpen(false)} confirmLabel="Додати документ" form={formId} busy={busy} />}
      >
        <AddDocumentForm key={session} order={order} formId={formId} partner={partner} onDone={() => setOpen(false)} onBusy={setBusy} />
      </Modal>
    </Card>
  );
}
