"use client";

import { ArrowTopRightOnSquareIcon, FolderPlusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { adminApi } from "../lib/api";
import { countOf, cx, formatNumber } from "../lib/format";
import { invalidate, setQueryData, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmDialog } from "../ui/ConfirmDialog";
import { Page, PageHeader } from "../ui/Page";
import { EmptyState, ErrorState } from "../ui/States";
import { toast, toastError } from "../ui/Toast";
import { TEXT } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { FileModal, MoveModal, ReplaceModal } from "./FileDialogs";
import { FilesTable, type FileActions } from "./FilesTable";
import { FILE_FORMS, FolderList, FolderPicker, type FolderActions } from "./FolderList";
import { FolderModal } from "./FolderModal";
import { ERRORS, Notice, enc } from "./shared";
import type { MaterialCategoryRow, MaterialFileAnswer, MaterialFileRow, MaterialsAnswer } from "./types";

// /admin/materials: the library partners and visitors download from
// (/materials on the site). Folders on the left, the files of the chosen
// folder on the right, in the site's order. The two panes start at 1280 px:
// between 1024 and 1280 the side menu leaves too little room for a folder
// column next to a seven-column table, so the folders are a select above
// the table there, as on phones.
//
// The address bar keeps the folder as ?category=<slug> (the parameter of
// the API) and a file to point at as ?file=<id> (the media library links
// a file's usage here): the folder of that file opens and its row is
// tinted. The whole library comes in one answer (it is small), so a folder
// switch needs no request.

const KEY = "/materials";

export function MaterialsScreen() {
  const { can } = useStaff();
  const canEdit = can("content.edit");
  const list = useListParams();
  const library = useAdminQuery<MaterialsAnswer>(KEY);
  const data = library.data;
  const folders = data?.categories;
  const files = data?.files;

  const [folderModal, setFolderModal] = useState<{ open: boolean; folder: MaterialCategoryRow | null }>({ open: false, folder: null });
  const [fileModal, setFileModal] = useState<{ open: boolean; file: MaterialFileRow | null }>({ open: false, file: null });
  const [replacing, setReplacing] = useState<MaterialFileRow | null>(null);
  const [moving, setMoving] = useState<MaterialFileRow | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  // --- what is selected ---------------------------------------------------------------

  const fileParam = list.get("file");
  const target = fileParam ? files?.find((file) => file.id === fileParam) : undefined;
  const categoryParam = list.get("category");
  const selected =
    folders?.find((folder) => folder.id === categoryParam) ??
    (target ? folders?.find((folder) => folder.id === target.category) : undefined) ??
    folders?.[0] ??
    null;
  const selectedId = selected?.id ?? null;
  const folderFiles = files && selected ? files.filter((file) => file.category === selected.id) : files ? [] : undefined;
  const markedId = target && target.category === selectedId ? target.id : null;
  const missingTarget = Boolean(fileParam && files && !target);

  // The row a link pointed at is brought into view once.
  const scrolledTo = useRef<string | null>(null);
  useEffect(() => {
    if (!markedId || scrolledTo.current === markedId) return;
    const row = document.querySelector(`[data-file-row="${CSS.escape(markedId)}"]`);
    if (!row) return;
    scrolledTo.current = markedId;
    row.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [markedId, files]);

  const select = (id: string) => list.set({ category: id, file: null });

  // --- folders ---------------------------------------------------------------------

  const moveFolder = async (folder: MaterialCategoryRow, step: -1 | 1) => {
    if (!data) return;
    const order = data.categories.map((row) => row.id);
    const from = order.indexOf(folder.id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    // The list moves at once; the server's answer follows.
    const byId = new Map(data.categories.map((row) => [row.id, row]));
    setQueryData<MaterialsAnswer>(KEY, { ...data, categories: order.map((id) => byId.get(id)).filter((row): row is MaterialCategoryRow => Boolean(row)) });
    const result = await adminApi("/materials/categories/reorder", { method: "POST", body: { ids: order } });
    if (!result.ok) toastError(result, ERRORS);
    invalidate(KEY);
  };

  const deleteFolder = async (folder: MaterialCategoryRow) => {
    if (folder.filesCount > 0) {
      toast.error(
        `У папці «${folder.title}» ${countOf(folder.filesCount, FILE_FORMS)}. Видалити можна лише порожню папку: перенесіть файли в іншу або видаліть їх.`,
        folder.id !== selectedId ? { action: { label: "Показати файли", onClick: () => select(folder.id) } } : {},
      );
      return;
    }
    const ok = await confirmDialog({
      title: "Видалити папку?",
      text: `Папка «${folder.title}» зникне з бібліотеки, а сторінка /materials/${folder.id} перестане відкриватися.`,
      confirmLabel: "Видалити папку",
      tone: "danger",
    });
    if (!ok) return;
    const result = await adminApi(`/materials/categories/${enc(folder.id)}`, { method: "DELETE" });
    if (!result.ok) {
      if (result.error === "in-use") {
        const count = Number(result.data.files) || 0;
        toast.error(
          `Тим часом у папку «${folder.title}» додали ${countOf(count, FILE_FORMS)}. Перенесіть або видаліть їх, а тоді видаляйте папку.`,
        );
        invalidate(KEY);
        return;
      }
      toastError(result, ERRORS);
      return;
    }
    if (folder.id === selectedId) list.set({ category: null, file: null });
    invalidate(KEY);
    toast.success(`Папку «${folder.title}» видалено.`);
  };

  const folderActions: FolderActions = {
    canEdit,
    onAdd: () => setFolderModal({ open: true, folder: null }),
    onRename: (folder) => setFolderModal({ open: true, folder }),
    onMove: (folder, step) => void moveFolder(folder, step),
    onDelete: (folder) => void deleteFolder(folder),
  };

  // --- files -------------------------------------------------------------------------

  const stepFile = async (file: MaterialFileRow, step: -1 | 1) => {
    if (!data) return;
    const own = data.files.filter((row) => row.category === file.category).map((row) => row.id);
    const from = own.indexOf(file.id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= own.length) return;
    [own[from], own[to]] = [own[to], own[from]];
    // The folder's rows take the new order in the places they hold in the
    // whole (global) list, so the other folders do not move.
    const byId = new Map(data.files.map((row) => [row.id, row]));
    let next = 0;
    const reordered = data.files.map((row) => (row.category === file.category ? (byId.get(own[next++]) ?? row) : row));
    setQueryData<MaterialsAnswer>(KEY, { ...data, files: reordered });
    // Keep the keyboard on the arrow that was pressed, now in the row's new place.
    const focusId = `material-${step < 0 ? "up" : "down"}-${file.id}`;
    requestAnimationFrame(() => document.getElementById(focusId)?.focus());
    const result = await adminApi("/materials/files/reorder", { method: "POST", body: { category: file.category, ids: own } });
    if (!result.ok) toastError(result, ERRORS);
    invalidate(KEY);
  };

  const changeAccess = async (file: MaterialFileRow, change: { locked?: boolean; partnerLocked?: boolean }) => {
    if (!data) return;
    setQueryData<MaterialsAnswer>(KEY, { ...data, files: data.files.map((row) => (row.id === file.id ? { ...row, ...change } : row)) });
    setPending((current) => new Set(current).add(file.id));
    const result = await adminApi<MaterialFileAnswer>(`/materials/files/${enc(file.id)}`, { method: "PATCH", body: change });
    setPending((current) => {
      const next = new Set(current);
      next.delete(file.id);
      return next;
    });
    invalidate(KEY);
    if (!result.ok) {
      toastError(result, ERRORS);
      return;
    }
    const what = "locked" in change ? (change.locked ? "тепер лише для авторизованих" : "тепер і для гостей") : change.partnerLocked ? "закрито для партнерів" : "відкрито для партнерів";
    toast.success(`«${file.name}»: ${what}.`);
  };

  const deleteFile = async (file: MaterialFileRow) => {
    const ok = await confirmDialog({
      title: file.type === "url" ? "Видалити посилання?" : "Видалити файл?",
      text:
        file.source.kind === "media"
          ? `«${file.name}» зникне з бібліотеки на сайті. Сам документ лишиться в медіатеці.`
          : `«${file.name}» зникне з бібліотеки на сайті.`,
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!ok) return;
    const result = await adminApi(`/materials/files/${enc(file.id)}`, { method: "DELETE" });
    if (!result.ok) {
      toastError(result, ERRORS);
      return;
    }
    if (file.id === fileParam) list.set({ file: null });
    invalidate(KEY);
    toast.success(`«${file.name}» видалено.`);
  };

  const fileActions: FileActions = {
    canEdit,
    pending,
    onAdd: () => setFileModal({ open: true, file: null }),
    onEdit: (file) => setFileModal({ open: true, file }),
    onReplace: setReplacing,
    onMoveTo: setMoving,
    onDelete: (file) => void deleteFile(file),
    onStep: (file, step) => void stepFile(file, step),
    onAccess: (file, change) => void changeAccess(file, change),
  };

  // --- layout -----------------------------------------------------------------------------

  const header = (
    <PageHeader
      title="Матеріали"
      light={files ? formatNumber(files.length) : undefined}
      subtitle={
        <>
          Бібліотека, з якої партнери й відвідувачі завантажують каталоги, сертифікати та інструкції:{" "}
          <a href="/materials" target="_blank" rel="noreferrer" className="font-medium text-neutral-900 underline underline-offset-4 hover:text-brand">
            сторінка /materials
          </a>{" "}
          на сайті.
        </>
      }
      actions={
        <Button variant="secondary" href="/materials" external iconRight={ArrowTopRightOnSquareIcon}>
          Бібліотека на сайті
        </Button>
      }
    />
  );

  if (library.error && !data) {
    return (
      <Page>
        {header}
        <Card>
          <ErrorState failure={library.error} onRetry={library.reload} title="Не вдалося завантажити матеріали" />
        </Card>
      </Page>
    );
  }

  if (folders && folders.length === 0) {
    return (
      <Page>
        {header}
        <Card>
          <EmptyState
            size="lg"
            icon={<FolderPlusIcon aria-hidden className="size-6" strokeWidth={1.7} />}
            title="Папок ще немає"
            text="Файли бібліотеки лежать у папках: «Каталоги», «Сертифікати», «Інструкції». Почніть із першої."
            action={canEdit ? <Button iconLeft={PlusIcon} onClick={folderActions.onAdd}>Додати папку</Button> : undefined}
          />
        </Card>
        <FolderModal
          open={folderModal.open}
          folder={folderModal.folder}
          onClose={() => setFolderModal((current) => ({ ...current, open: false }))}
          onSaved={(folder, created) => created && select(folder.id)}
        />
      </Page>
    );
  }

  const count = folderFiles?.length ?? 0;

  return (
    <Page>
      {header}

      {missingTarget && (
        <Notice tone="amber" className="mb-4">
          <span>Файл, на який вело посилання, не знайдено: можливо, його вже видалили з бібліотеки. </span>
          <button type="button" onClick={() => list.set({ file: null })} className="cursor-pointer font-semibold underline underline-offset-4">
            Сховати
          </button>
        </Notice>
      )}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[232px_minmax(0,1fr)] xl:items-start xl:gap-6 2xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="min-w-0 max-[1279px]:hidden xl:sticky xl:top-24">
          <FolderList folders={folders} selectedId={selectedId} onSelect={select} loading={library.loading} actions={folderActions} />
        </div>

        <section className="flex min-w-0 flex-col gap-4" aria-label={selected ? `Папка «${selected.title}»` : "Файли"}>
          {folders && (
            <div className="xl:hidden">
              <FolderPicker folders={folders} selectedId={selectedId} onSelect={select} actions={folderActions} />
            </div>
          )}

          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <h2 className={cx(TEXT.sectionTitle, "[overflow-wrap:anywhere]")}>{selected?.title ?? "Файли"}</h2>
              {selected && (
                <p className={cx(TEXT.muted, "mt-1 flex flex-wrap items-center gap-x-3 gap-y-1")}>
                  <span className="tabular-nums">{countOf(count, FILE_FORMS)}</span>
                  <a
                    href={`/materials/${enc(selected.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-neutral-800 underline-offset-4 hover:text-brand hover:underline"
                  >
                    /materials/{selected.id}
                    <ArrowTopRightOnSquareIcon aria-hidden className="size-3.5" strokeWidth={2} />
                  </a>
                </p>
              )}
              {selected?.tagline && (
                <p className={cx(TEXT.caption, "mt-1.5")}>
                  Примітка для партнерів: <span className="text-neutral-800">{selected.tagline}</span>
                </p>
              )}
            </div>
            {canEdit && selected && (
              <Button iconLeft={PlusIcon} onClick={fileActions.onAdd}>
                Додати файл
              </Button>
            )}
          </div>

          <FilesTable
            folder={selected}
            files={folderFiles}
            loading={library.loading}
            stale={false}
            error={library.error}
            onRetry={library.reload}
            markedId={markedId}
            actions={fileActions}
          />
        </section>
      </div>

      <FolderModal
        open={folderModal.open}
        folder={folderModal.folder}
        onClose={() => setFolderModal((current) => ({ ...current, open: false }))}
        onSaved={(folder, created) => created && select(folder.id)}
      />
      <FileModal
        open={fileModal.open}
        file={fileModal.file}
        folders={folders ?? []}
        category={selectedId ?? ""}
        onClose={() => setFileModal((current) => ({ ...current, open: false }))}
      />
      <ReplaceModal open={replacing !== null} file={replacing} onClose={() => setReplacing(null)} />
      <MoveModal
        open={moving !== null}
        file={moving}
        folders={folders ?? []}
        onClose={() => setMoving(null)}
        onMoved={(file) => {
          const where = folders?.find((folder) => folder.id === file.category);
          toast.success(where ? `«${file.name}» тепер у папці «${where.title}».` : `«${file.name}» переміщено.`, {
            action: { label: "Відкрити папку", onClick: () => list.set({ category: file.category, file: file.id }) },
          });
        }}
      />
    </Page>
  );
}
