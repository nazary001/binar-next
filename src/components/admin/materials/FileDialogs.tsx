"use client";

import { useState, type FormEvent } from "react";
import type { MediaDto } from "../media/types";
import { adminApi } from "../lib/api";
import { useDirty } from "../ui/Form";
import { invalidate } from "../lib/query";
import { Checkbox, CheckboxGroup, RadioGroup } from "../ui/Checkbox";
import { Input, Textarea } from "../ui/Input";
import { FileField, type FileValue } from "../ui/media/FileField";
import { Modal, ModalFooter } from "../ui/Modal";
import { Select } from "../ui/Select";
import { toast, toastError } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { DIRECTION_OPTIONS, ERRORS, Notice, STORED_TYPE_OPTIONS, enc, fieldErrors, whoCanDownload } from "./shared";
import {
  MATERIAL_LIMITS,
  type MaterialCategoryRow,
  type MaterialDirection,
  type MaterialFileAnswer,
  type MaterialFileCreateInput,
  type MaterialFilePatchInput,
  type MaterialFileRow,
  type MaterialFileType,
} from "./types";

// The dialogs of one material file: add or edit it, replace what it points
// at (an upload or a link), move it to another folder.
//
// Uploads go to the media library as "private" files of the "materials"
// folder: the site hands them out only through its own download route,
// which checks who is asking (a public upload could be fetched by anyone
// at /api/media/<id>, padlock or not).

// What the site can show: PDF, office documents, pictures. The media route
// accepts exactly these (the type is read from the file's bytes).
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif";

type SourceKind = "file" | "url";
type StoredType = Exclude<MaterialFileType, "url">;

const SOURCE_OPTIONS = [
  { value: "file" as const, label: "Файл", hint: "Завантажити з комп'ютера" },
  { value: "url" as const, label: "Посилання", hint: "Сторінка на іншому сайті" },
];

function isHttps(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

// --- the source: an upload or a link --------------------------------------------------

function SourceFields({
  kind,
  onKind,
  file,
  onFile,
  url,
  onUrl,
  errors,
  fileLabel = "Файл",
  legend = "Що додаємо",
}: {
  kind: SourceKind;
  onKind: (kind: SourceKind) => void;
  file: FileValue | null;
  onFile: (value: FileValue | null, media?: MediaDto) => void;
  url: string;
  onUrl: (url: string) => void;
  errors: Record<string, string>;
  fileLabel?: string;
  legend?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <RadioGroup label={legend} value={kind} onChange={onKind} options={SOURCE_OPTIONS} variant="tiles" direction="horizontal" />
      {kind === "file" ? (
        <FileField
          label={fileLabel}
          required
          folder="materials"
          access="private"
          accept={ACCEPT}
          value={file}
          onChange={onFile}
          error={errors.mediaId ?? errors.source}
          hint="Файл зберігається приватно: сайт видає його лише тим, кому дозволено."
        />
      ) : (
        <Input
          label="Адреса посилання"
          required
          type="url"
          inputMode="url"
          value={url}
          onChange={onUrl}
          placeholder="https://"
          maxLength={MATERIAL_LIMITS.url}
          error={errors.url ?? errors.source}
          hint="Відкриється в новій вкладці. Потрібна повна адреса з https://"
          spellCheck={false}
          autoCapitalize="off"
        />
      )}
    </div>
  );
}

// --- access ---------------------------------------------------------------------------------

function AccessFields({
  locked,
  partnerLocked,
  onChange,
}: {
  locked: boolean;
  partnerLocked: boolean;
  onChange: (next: { locked: boolean; partnerLocked: boolean }) => void;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className={TEXT.label}>Хто може завантажити</legend>
      <div className="mt-2.5 flex flex-col gap-3">
        <Checkbox
          label="Лише для авторизованих"
          hint="Гості бачать замок і пропозицію увійти."
          checked={locked}
          onChange={(value) => onChange({ locked: value, partnerLocked })}
        />
        <Checkbox
          label="Закрито для партнерів"
          hint="Партнери (B2B) бачать замок: файл не входить до їхньої угоди."
          checked={partnerLocked}
          onChange={(value) => onChange({ locked, partnerLocked: value })}
        />
      </div>
    </fieldset>
  );
}

// --- add or edit a file -------------------------------------------------------------------

type Form = {
  source: SourceKind;
  file: FileValue | null;
  url: string;
  name: string;
  description: string;
  directions: MaterialDirection[];
  locked: boolean;
  partnerLocked: boolean;
  category: string;
  type: StoredType | null;
};

function formOf(file: MaterialFileRow | null, category: string): Form {
  return {
    source: file?.source.kind === "url" ? "url" : "file",
    file: null,
    url: "",
    name: file?.name ?? "",
    description: file?.description ?? "",
    directions: file ? [...file.directions] : [],
    locked: file?.locked ?? false,
    partnerLocked: file?.partnerLocked ?? false,
    category: file?.category ?? category,
    type: file && file.type !== "url" ? file.type : null,
  };
}

const FILE_FORM = "material-file-form";

export function FileModal({
  open,
  onClose,
  file,
  folders,
  category,
}: {
  open: boolean;
  onClose: () => void;
  // null: a new file.
  file: MaterialFileRow | null;
  folders: MaterialCategoryRow[];
  // The folder a new file goes to.
  category: string;
}) {
  const [form, setForm] = useState<Form>(() => formOf(file, category));
  const [initial, setInitial] = useState<Form | null>(null);
  const [autoName, setAutoName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const openKey = open ? `open:${file?.id ?? "new"}:${file?.updatedAt ?? ""}` : "closed";
  const [seen, setSeen] = useState(openKey);
  if (seen !== openKey) {
    setSeen(openKey);
    if (open) {
      const start = formOf(file, category);
      setForm(start);
      setInitial(file ? start : null);
      setAutoName("");
      setErrors({});
    }
  }

  const creating = file === null;
  const dirty = useDirty(initial, form);
  const patch = (next: Partial<Form>) => setForm((current) => ({ ...current, ...next }));
  const clear = (...keys: string[]) => {
    if (keys.some((key) => errors[key])) {
      const next = { ...errors };
      for (const key of keys) delete next[key];
      setErrors(next);
    }
  };

  const folderOptions = folders.map((folder) => ({ value: folder.id, label: folder.title }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    const local: Record<string, string> = {};
    if (!name) local.name = "Вкажіть назву, яку побачать на сайті.";
    if (creating && form.source === "file" && !form.file) local.mediaId = "Завантажте файл.";
    if (creating && form.source === "url" && !isHttps(form.url)) local.url = "Потрібна повна адреса, що починається з https://";
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }

    setBusy(true);
    let result;
    if (creating) {
      const body: MaterialFileCreateInput = {
        category: form.category,
        name,
        description: form.description.trim(),
        directions: form.directions,
        locked: form.locked,
        partnerLocked: form.partnerLocked,
        ...(form.source === "file" ? { mediaId: form.file?.mediaId } : { url: form.url.trim() }),
      };
      result = await adminApi<MaterialFileAnswer>("/materials/files", { method: "POST", body });
    } else {
      const body: MaterialFilePatchInput = {};
      if (name !== file.name) body.name = name;
      if (form.description.trim() !== file.description) body.description = form.description.trim();
      if (form.directions.join("|") !== file.directions.join("|")) body.directions = form.directions;
      if (form.locked !== file.locked) body.locked = form.locked;
      if (form.partnerLocked !== file.partnerLocked) body.partnerLocked = form.partnerLocked;
      if (form.type && file.type !== "url" && form.type !== file.type) body.type = form.type;
      result = await adminApi<MaterialFileAnswer>(`/materials/files/${enc(file.id)}`, { method: "PATCH", body });
    }
    setBusy(false);

    if (!result.ok) {
      if (result.error === "fields") {
        setErrors(fieldErrors(result.data));
        return;
      }
      toastError(result, ERRORS);
      return;
    }
    invalidate("/materials");
    const saved = result.data.file;
    if (creating) {
      const where = folders.find((folder) => folder.id === saved.category)?.title;
      toast.success(where ? `«${saved.name}» додано до папки «${where}».` : `«${saved.name}» додано.`);
    } else {
      toast.success("Зміни збережено.");
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="lg"
      title={creating ? "Новий файл" : "Файл матеріалів"}
      description={
        creating
          ? "Файл з'явиться в кінці папки на сторінці /materials одразу після збереження."
          : "Зміни з'являться на сайті одразу після збереження."
      }
      footer={
        <ModalFooter
          onCancel={onClose}
          confirmLabel={creating ? "Додати файл" : "Зберегти зміни"}
          form={FILE_FORM}
          busy={busy}
          confirmDisabled={!creating && !dirty}
        />
      }
    >
      <form id={FILE_FORM} onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
        {creating && (
          <SourceFields
            kind={form.source}
            onKind={(source) => {
              patch({ source });
              clear("source", "mediaId", "url");
            }}
            file={form.file}
            onFile={(value, media) => {
              const next: Partial<Form> = { file: value };
              // The name follows the upload until someone types their own.
              if (media && (form.name.trim() === "" || form.name === autoName)) {
                next.name = media.filename;
                setAutoName(media.filename);
              }
              patch(next);
              clear("source", "mediaId", "name");
            }}
            url={form.url}
            onUrl={(url) => {
              patch({ url });
              clear("source", "url");
            }}
            errors={errors}
          />
        )}

        <div className="flex min-w-0 flex-col gap-5">
          <Input
            label="Назва"
            required
            value={form.name}
            onChange={(name) => {
              patch({ name });
              clear("name");
            }}
            maxLength={MATERIAL_LIMITS.name}
            error={errors.name}
            hint="Як файл підписано на сайті, разом із розширенням: «Каталог 2026.pdf»."
          />
          <Textarea
            label="Опис"
            optional
            value={form.description}
            onChange={(description) => patch({ description })}
            rows={3}
            autoGrow
            maxRows={8}
            maxLength={MATERIAL_LIMITS.description}
            error={errors.description}
            hint="Показується в панелі перегляду, коли відвідувач відкриває файл."
          />
          {creating ? (
            <Select
              label="Папка"
              required
              value={form.category}
              onChange={(value) => {
                patch({ category: value });
                clear("category");
              }}
              options={folderOptions}
              error={errors.category}
            />
          ) : (
            form.type && (
              <Select
                label="Значок типу"
                value={form.type}
                onChange={(value) => patch({ type: value })}
                options={STORED_TYPE_OPTIONS}
                error={errors.type}
                hint="Визначається з файлу. Змініть, якщо на сайті має бути інший значок."
              />
            )
          )}
        </div>

        <div className="grid min-w-0 gap-6 min-[640px]:grid-cols-2 min-[640px]:gap-5">
          <CheckboxGroup
            label="Напрями"
            value={form.directions}
            onChange={(directions) => patch({ directions })}
            options={DIRECTION_OPTIONS}
            error={errors.directions}
            hint="За ними відвідувачі фільтрують матеріали. Файл без напряму зникає, щойно фільтр увімкнено."
          />
          <AccessFields locked={form.locked} partnerLocked={form.partnerLocked} onChange={(access) => patch(access)} />
        </div>
        <p className="-mt-1 rounded-2xl bg-bg-subtle px-4 py-2.5 text-[13px] leading-[18px] text-neutral-700" aria-live="polite">
          {whoCanDownload({ locked: form.locked, partnerLocked: form.partnerLocked })}
        </p>
      </form>
    </Modal>
  );
}

// --- replace the file or the link -------------------------------------------------------

const REPLACE_FORM = "material-replace-form";

export function ReplaceModal({ open, onClose, file }: { open: boolean; onClose: () => void; file: MaterialFileRow | null }) {
  const [kind, setKind] = useState<SourceKind>("file");
  const [upload, setUpload] = useState<FileValue | null>(null);
  const [url, setUrl] = useState("");
  const [takeName, setTakeName] = useState(false);
  const [uploadedName, setUploadedName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const openKey = open && file ? `open:${file.id}` : "closed";
  const [seen, setSeen] = useState(openKey);
  if (seen !== openKey) {
    setSeen(openKey);
    if (open && file) {
      setKind(file.source.kind === "url" ? "url" : "file");
      setUpload(null);
      setUrl(file.source.kind === "url" ? file.source.url : "");
      setTakeName(false);
      setUploadedName("");
      setErrors({});
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    if (kind === "file" && !upload) {
      setErrors({ mediaId: "Завантажте новий файл." });
      return;
    }
    if (kind === "url" && !isHttps(url)) {
      setErrors({ url: "Потрібна повна адреса, що починається з https://" });
      return;
    }
    const body: MaterialFilePatchInput =
      kind === "file" ? { mediaId: upload?.mediaId, ...(takeName && uploadedName ? { name: uploadedName } : {}) } : { url: url.trim() };
    setBusy(true);
    const result = await adminApi<MaterialFileAnswer>(`/materials/files/${enc(file.id)}`, { method: "PATCH", body });
    setBusy(false);
    if (!result.ok) {
      if (result.error === "fields") {
        setErrors(fieldErrors(result.data));
        return;
      }
      toastError(result, ERRORS);
      return;
    }
    invalidate("/materials");
    toast.success(kind === "file" ? `Файл «${result.data.file.name}» замінено.` : `Посилання «${result.data.file.name}» оновлено.`);
    onClose();
  };

  const current =
    file?.source.kind === "media"
      ? `Зараз: ${file.media?.filename ?? "файл із медіатеки"}`
      : file?.source.kind === "path"
        ? "Зараз: демонстраційний файл сайту"
        : file?.source.kind === "url"
          ? `Зараз: ${file.source.url}`
          : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="md"
      title="Замінити файл"
      description={file ? `«${file.name}». Назва, опис, напрями й доступ не зміняться.` : undefined}
      footer={<ModalFooter onCancel={onClose} confirmLabel="Замінити" form={REPLACE_FORM} busy={busy} />}
    >
      <form id={REPLACE_FORM} onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-5">
        {current && <p className={`${TEXT.muted} [overflow-wrap:anywhere]`}>{current}</p>}
        <SourceFields
          kind={kind}
          onKind={(next) => {
            setKind(next);
            setErrors({});
          }}
          file={upload}
          onFile={(value, media) => {
            setUpload(value);
            if (media) setUploadedName(media.filename);
            setErrors({});
          }}
          url={url}
          onUrl={(next) => {
            setUrl(next);
            setErrors({});
          }}
          errors={errors}
          fileLabel="Новий файл"
          legend="Чим замінити"
        />
        {kind === "file" && upload && file && uploadedName && uploadedName !== file.name && (
          <Checkbox label={`Перейменувати на «${uploadedName}»`} checked={takeName} onChange={setTakeName} />
        )}
        {file?.source.kind === "media" && kind === "file" && (
          <Notice>Попередній файл лишиться в медіатеці. Якщо він більше ніде не потрібен, його можна видалити там.</Notice>
        )}
      </form>
    </Modal>
  );
}

// --- move to another folder ------------------------------------------------------------------

export function MoveModal({
  open,
  onClose,
  file,
  folders,
  onMoved,
}: {
  open: boolean;
  onClose: () => void;
  file: MaterialFileRow | null;
  folders: MaterialCategoryRow[];
  onMoved: (file: MaterialFileRow) => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const openKey = open && file ? `open:${file.id}` : "closed";
  const [seen, setSeen] = useState(openKey);
  if (seen !== openKey) {
    setSeen(openKey);
    if (open) {
      setTarget(null);
      setError("");
    }
  }

  const options = folders.filter((folder) => folder.id !== file?.category).map((folder) => ({ value: folder.id, label: folder.title }));

  const move = async () => {
    if (!file) return;
    if (!target) {
      setError("Оберіть папку.");
      return;
    }
    setBusy(true);
    const result = await adminApi<MaterialFileAnswer>(`/materials/files/${enc(file.id)}`, { method: "PATCH", body: { category: target } });
    setBusy(false);
    if (!result.ok) {
      if (result.error === "fields") {
        setError(fieldErrors(result.data).category ?? "Не вдалося перемістити файл.");
        return;
      }
      toastError(result, ERRORS);
      return;
    }
    invalidate("/materials");
    onMoved(result.data.file);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      size="sm"
      title="Перемістити файл"
      description={file ? `«${file.name}» стане останнім у вибраній папці.` : undefined}
      footer={<ModalFooter onCancel={onClose} onConfirm={() => void move()} confirmLabel="Перемістити" busy={busy} />}
    >
      {options.length === 0 ? (
        <p className={TEXT.muted}>Інших папок немає. Спершу створіть папку.</p>
      ) : (
        <Select
          label="Нова папка"
          required
          value={target}
          onChange={(value) => {
            setTarget(value);
            setError("");
          }}
          options={options}
          placeholder="Оберіть папку"
          error={error}
        />
      )}
    </Modal>
  );
}
