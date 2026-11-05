"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TextField } from "@/components/checkout/fields";
import {
  ConfirmModal,
  DocumentGlyph,
  ChevronRightIcon,
  Dropzone,
  ListPanel,
  Modal718,
  ModalActions,
  StatusPill,
  TableEmptyRow,
  UploadedFileTile,
} from "@/components/platform/ui";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { showToast } from "@/components/ui/Toast";
import { addContract, addCounterparty, removeContract } from "./actions";
import { ContractBadge, ContractCard, ContractTile } from "./ContractParts";
import {
  CONTRACT_MAX_BYTES,
  COPY,
  COUNTERPARTY_STATUS,
  contractFileError,
  isValidCode,
  type Contract,
  type Counterparty,
} from "./data";
import { OrderDocumentsIcon } from "../orderIcons";
import { CounterpartyRow } from "./phoneParts";
import { SubmitButton } from "./shared";

// «Контрагенти» tab - Figma 4868:31013 inside the 1144 card: py-24; the
// section head (p-24: Title/Medium «Контрагенти» + Button/Small «Додати
// контрагента» 207 x 42) and the table 4868:31019 (px-24): a 1-px
// #d2d2d2 r24 white box with the #343435 head row (64 = pt-8 + 56,
// heads p-16 SemiBold 14/24 white), columns flex / flex / 156 / flex /
// 210 / 72 inside 24-px row gutters, 90-px rows (cells px-16 py-24)
// between 0.5-px #d2d2d2 dividers (15 px in under the head, 16 px in
// between rows); the master ends with two stacked dividers (1 px).
// Empty: «<TableCellRow>» 200 (4929:64257) under the head.
// Phones (layout "phone", profile spec 2.4): no head, a hug Button/Small
// "Додати контрагента" over a ListPanel of CounterpartyRow (phoneParts),
// or the EmptyState panel that owns the only CTA; "Договори" (2+) and
// "Додати контрагента" are full-screen sheets (Modal718 phone="sheet"),
// the others centred cards. A new counterparty is focused and announced
// with a toast; removing the last contract hands the focus to its row.

type ModalState =
  | { kind: "contracts"; id: string }
  | { kind: "addContract"; id: string; back: boolean }
  | { kind: "addCounterparty" }
  | { kind: "removeContract"; id: string; contractId: string; back: boolean }
  | null;

const HEAD_HAIRLINE =
  "[background:linear-gradient(var(--color-stroke-subtle),var(--color-stroke-subtle))_15px_0/calc(100%-30px)_0.5px_no-repeat]";
const ROW_HAIRLINE =
  "[background:linear-gradient(var(--color-stroke-subtle),var(--color-stroke-subtle))_16px_0/calc(100%-32px)_0.5px_no-repeat]";
// Every row sits under its 0.5-px divider: 24.5 + 42 + 24 = the 90.5
// pitch of the master (898.5 / 989 / 1079.5). The master's «Items» frame
// is items-start with py-24 cells, so every cell's content hangs 24 px
// under the divider (text, pill and the «+ 2» group alike); only the
// 42-px chevron button fills the row and sets its height.
const CELL = "px-4 pb-6 pt-[24.5px] align-top";

const DROP_ACCEPT = "application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg";

// The head row 4868:31022 splits its width 203.33 x 3 / 156 / 210 / 72,
// the body rows 202.67 x 3 / 156 / 210 / 74 (the chevron column is 2 px
// wider). The table keeps one colgroup (the body's), so each head label
// is pushed right by what the narrower head columns before it add up
// to: +0.67 / +1.33 / +1.33 / +2 = the master's x 801.3 / 1004.7 /
// 1160.7 / 1364 at 1710 (the shift does not depend on the table width).
const HEAD_PAD = ["pl-4", "pl-[16.67px]", "pl-[17.33px]", "pl-[17.33px]", "pl-[18px]"];

function Head({ children, pad = "pl-4" }: { children?: string; pad?: string }) {
  return (
    <th scope="col" className="p-0 pt-2 text-left font-normal">
      <span className={`flex h-14 items-center py-4 pr-4 ${pad}`}>
        {children && (
          <span className="whitespace-nowrap text-[14px] font-semibold leading-6 text-white">{children}</span>
        )}
      </span>
    </th>
  );
}

// «Договір» cell: one contract = the document glyph + «№432-01»
// (SemiBold 16/24, gap 4); several = the documents glyph + the first
// number, then (gap 16) the «+ 2» count badge (#f1f1f2 r40 px-8 py-4,
// SemiBold 14/24).
function ContractCell({ counterparty, onOpen }: { counterparty: Counterparty; onOpen: () => void }) {
  const list = counterparty.contracts;
  if (list.length === 0) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="cursor-pointer whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-500 underline-offset-2 transition-colors duration-200 hover:text-brand hover:underline"
      >
        {COPY.contracts.add}
      </button>
    );
  }
  const many = list.length > 1;
  return (
    <span className="flex items-center gap-4">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${many ? "Договори" : "Договір"} ${counterparty.name}`}
        className="flex cursor-pointer items-center gap-1 text-neutral-900 transition-colors duration-200 hover:text-brand"
      >
        {many ? <OrderDocumentsIcon className="size-6 shrink-0" /> : <DocumentGlyph className="size-6 shrink-0" />}
        <span className="whitespace-nowrap text-[16px] font-semibold leading-6">{list[0].number}</span>
      </button>
      {many && (
        <span className="whitespace-nowrap rounded-[40px] bg-neutral-40 px-2 py-1 text-[14px] font-semibold leading-6 text-neutral-900">
          + {list.length - 1}
        </span>
      )}
    </span>
  );
}

function CounterpartiesTable({
  list,
  onOpen,
  onAdd,
}: {
  list: Counterparty[];
  onOpen: (c: Counterparty) => void;
  onAdd: () => void;
}) {
  // The 1-px stroke sits on the outer box, outside the scroller, so it
  // keeps framing the visible part while a phone swipes the 1000-px
  // table sideways.
  return (
    <div data-profile="cp-table" className="relative rounded-3xl bg-white">
      <div className="overflow-x-auto overflow-y-clip rounded-3xl">
        <table className="w-full min-w-[1000px] table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-6" />
            <col />
            <col />
            <col className="w-[156px]" />
            <col />
            <col className="w-[210px]" />
            <col className="w-[74px]" />
            <col className="w-6" />
          </colgroup>
          <thead>
            <tr className="bg-neutral-800">
              <th aria-hidden className="p-0" />
              {COPY.counterparties.heads.map((h, i) => (
                <Head key={h} pad={HEAD_PAD[i]}>
                  {h}
                </Head>
              ))}
              <Head />
              <th aria-hidden className="p-0" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <TableEmptyRow
                colSpan={8}
                title={COPY.counterparties.emptyTitle}
                text={COPY.counterparties.emptyText}
                actions={
                  <Button type="button" size="small" variant="accent" onClick={onAdd}>
                    {COPY.counterparties.add}
                  </Button>
                }
              />
            ) : (
              list.map((c, i) => (
                <tr key={c.id} data-profile="cp-row" className={i === 0 ? HEAD_HAIRLINE : ROW_HAIRLINE}>
                  <td aria-hidden className="p-0" />
                  <td className={`${CELL} truncate text-[16px] font-semibold leading-6 text-neutral-900`}>{c.name}</td>
                  <td className={`${CELL} truncate text-[16px] leading-6 text-neutral-900`}>{c.signatory}</td>
                  <td className={`${CELL} whitespace-nowrap text-[16px] leading-6 text-neutral-900`}>{c.code}</td>
                  <td className={CELL}>
                    <StatusPill tone={COUNTERPARTY_STATUS[c.status].tone}>{COUNTERPARTY_STATUS[c.status].label}</StatusPill>
                  </td>
                  <td className={CELL}>
                    <ContractCell counterparty={c} onOpen={() => onOpen(c)} />
                  </td>
                  <td className={CELL}>
                    <button
                      type="button"
                      onClick={() => onOpen(c)}
                      aria-label={`Договори контрагента ${c.name}`}
                      className="flex size-[42px] cursor-pointer items-center justify-center rounded-[26px] text-neutral-900 transition-colors duration-200 hover:bg-bg-subtle hover:text-brand"
                    >
                      <ChevronRightIcon className="size-6" />
                    </button>
                  </td>
                  <td aria-hidden className="p-0" />
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* The master's closing double divider (2 x 0.5 px) under the last row. */}
        {list.length > 0 && <div aria-hidden className="h-px" />}
      </div>
      {/* The box's 1-px #d2d2d2 stroke, drawn inside it as in Figma. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl border border-stroke-subtle" />
    </div>
  );
}

// The add-a-contract cards keep their top where Figma puts it: the
// file-picked state grows the card by 132 (32 gap + the 100 tile) and
// Figma grows it downward from the top the taller state gets when
// centred - «Додати договір» 4868:31278 (598) and 4868:31339 (730) both
// start at 305.5 = (1341 - 730) / 2, «Додати контрагента» 4868:31306
// (828) at 191 ~ (1341 - 828 - 132) / 2. Modal718 centres the card, so
// until a file is picked (no [data-contract-file] inside) the card
// carries a 132-px bottom margin and the centred box is the taller
// state's. Gated to windows tall enough for that taller card plus the
// overlay's 40-px gutters (730 + 80, 960 + 80 device px: html zoom <= 1
// only shrinks the card); shorter windows centre both states as before.
const ANCHOR_ADD_CONTRACT = "sm:[@media(min-height:810px)]:[&:not(:has([data-contract-file]))]:mb-[132px]";
const ANCHOR_ADD_COUNTERPARTY = "sm:[@media(min-height:1040px)]:[&:not(:has([data-contract-file]))]:mb-[132px]";

// «Додати договір» dropzone + the picked file (4868:31347: the uploaded
// tile 32 px under the dropzone). Phones: the picked file REPLACES the
// zone (its cross brings the zone back).
function ContractUpload({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-8" data-contract-file={file ? "" : undefined}>
      <div className={file ? "flex flex-col gap-2 max-lg:hidden" : "flex flex-col gap-2"}>
        <Dropzone
          accept={DROP_ACCEPT}
          maxSizeMb={CONTRACT_MAX_BYTES / (1024 * 1024)}
          hint={COPY.dropzone.hint}
          phoneText={COPY.dropzone.phoneText}
          phoneHint={COPY.dropzone.phoneHint}
          onFiles={([f]) => {
            const message = f ? contractFileError(f) : null;
            setError(message);
            if (f && !message) onFile(f);
          }}
          onReject={(f, reason) =>
            setError(reason === "size" ? "Файл більший за 5 МБ" : contractFileError(f) ?? "Непідтримуваний файл")
          }
        />
        {error && (
          <p role="alert" className="px-6 text-[12px] font-medium leading-4 tracking-[0.15px] text-negative">
            {error}
          </p>
        )}
      </div>
      {file && (
        <UploadedFileTile
          name={file.name}
          note={COPY.dropzone.pending}
          onRemove={() => onFile(null)}
          removeLabel={`Прибрати файл ${file.name}`}
        />
      )}
    </div>
  );
}

// «Один договір» 4868:31167 / «Кілька договорів» 4868:31197.
function ContractsModal({
  counterparty,
  onClose,
  onAdd,
  onRemove,
}: {
  counterparty: Counterparty | undefined;
  onClose: () => void;
  onAdd: () => void;
  onRemove: (contract: Contract) => void;
}) {
  const list = counterparty?.contracts ?? [];
  const single = list.length === 1 ? list[0] : null;
  return (
    <Modal718
      open={Boolean(counterparty)}
      onClose={onClose}
      title={
        single ? (
          <>
            {COPY.contracts.single} <span className="whitespace-nowrap">{single.number}</span>
          </>
        ) : (
          COPY.contracts.many
        )
      }
      titleAdornment={single ? <ContractBadge contract={single} /> : undefined}
      description={counterparty?.name}
      phone={single ? "card" : "sheet"}
      actions={
        <ModalActions>
          <Button type="button" variant="accent" fullWidth onClick={onAdd}>
            {COPY.contracts.add}
          </Button>
        </ModalActions>
      }
    >
      {single ? (
        <ContractTile contract={single} onRemove={() => onRemove(single)} />
      ) : (
        <div data-profile="contract-list" className="flex flex-col lg:contents">
          {list.map((k) => (
            <ContractCard key={k.id} contract={k} onRemove={() => onRemove(k)} />
          ))}
        </div>
      )}
    </Modal718>
  );
}

// «Додати договір» 4868:31278 (empty) / 4868:31339 (file picked): the
// dropzone, the picked file, «Назад» (outlined) + «Додати договір»
// (disabled until a file is picked, then accent), 283 each, gap 32.
function AddContractModal({
  counterparty,
  onBack,
  onClose,
  onSave,
}: {
  counterparty: Counterparty | undefined;
  onBack: () => void;
  onClose: () => void;
  onSave: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <Modal718
      open={Boolean(counterparty)}
      onClose={onClose}
      title={COPY.contracts.addTitle}
      description={counterparty?.name}
      className={ANCHOR_ADD_CONTRACT}
      actions={
        <ModalActions>
          <Button type="button" variant="outlinedDark" fullWidth onClick={onBack}>
            {COPY.contracts.back}
          </Button>
          <Button
            type="button"
            variant="accent"
            fullWidth
            disabled={!file}
            onClick={() => file && onSave(file)}
            disabledStyle="solid"
          >
            {COPY.contracts.add}
          </Button>
        </ModalActions>
      }
    >
      <ContractUpload file={file} onFile={setFile} />
    </Modal718>
  );
}

// «Додати контрагента» 4868:31306 (718 x 828): three fields (gap 24),
// then 40 px lower the «Додати договір» label (Bold 16/24) + 24 + the
// dropzone, then the full-width submit, greyed out until the three
// fields are valid (the contract is optional: it can follow later).
// The dialog owns the form state, so its submit renders in the Modal718
// actions row (form=) - the phone sheet's pinned footer; on desktop that
// row sits 40 under the slot, where the form's gap-10 put it before.
function AddCounterpartyModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: { name: string; code: string; signatory: string; file: File | null }) => void;
}) {
  return open ? <AddCounterpartyDialog onClose={onClose} onSave={onSave} /> : null;
}

function AddCounterpartyDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: { name: string; code: string; signatory: string; file: File | null }) => void;
}) {
  const formId = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [signatory, setSignatory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState({ name: false, code: false, signatory: false });
  const touch = (key: keyof typeof touched) => () => setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  const codeError = touched.code && code.trim() && !isValidCode(code) ? "Вкажіть 8 цифр ЄДРПОУ або 10 цифр ІПН" : undefined;
  const nameError = touched.name && !name.trim() ? COPY.errors.name : undefined;
  const signatoryError = touched.signatory && !signatory.trim() ? COPY.errors.signatory : undefined;
  const ready = Boolean(name.trim() && signatory.trim() && isValidCode(code));
  return (
    <Modal718
      open
      onClose={onClose}
      title={COPY.addCounterparty.title}
      phone="sheet"
      className={`[--field-surface:#fff] ${ANCHOR_ADD_COUNTERPARTY}`}
      actions={
        <ModalActions>
          <SubmitButton type="submit" form={formId} disabled={!ready} variant="solid">
            {COPY.addCounterparty.submit}
          </SubmitButton>
        </ModalActions>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-10"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onSave({ name, code, signatory, file });
        }}
      >
        <div className="flex flex-col gap-6">
          <TextField
            label={COPY.addCounterparty.name}
            value={name}
            onChange={setName}
            onBlur={touch("name")}
            autoComplete="organization"
            enterKeyHint="next"
            error={nameError}
            muiHelper
          />
          <TextField
            label={COPY.addCounterparty.code}
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 10))}
            onBlur={touch("code")}
            inputMode="numeric"
            enterKeyHint="next"
            error={codeError}
            muiHelper
          />
          <TextField
            label={COPY.addCounterparty.signatory}
            value={signatory}
            onChange={setSignatory}
            onBlur={touch("signatory")}
            enterKeyHint="done"
            error={signatoryError}
            muiHelper
          />
        </div>
        <div className="flex flex-col gap-6">
          <p className="text-[16px] font-bold leading-6 text-neutral-900 max-lg:leading-[22px] max-lg:tracking-[0.16px]">
            {COPY.addCounterparty.contract}
          </p>
          <ContractUpload file={file} onFile={setFile} />
        </div>
      </form>
    </Modal718>
  );
}

export function CounterpartiesPanel({
  accountId,
  list,
  layout = "desktop",
}: {
  accountId: string;
  list: Counterparty[];
  layout?: "desktop" | "phone";
}) {
  const phone = layout === "phone";
  const [modal, setModal] = useState<ModalState>(null);
  const find = (id: string) => list.find((c) => c.id === id);
  const current = modal && "id" in modal ? find(modal.id) : undefined;
  const close = () => setModal(null);
  const openAdd = () => setModal({ kind: "addCounterparty" });

  // Phones: an element to focus once the overlays are closed (the new
  // counterparty's row, or the row whose last contract was removed). It
  // runs a frame after useModalBehavior handed the focus back to the
  // opener, so it wins; focus() also scrolls the row into view.
  const focusAfter = useRef<string | null>(null);
  useEffect(() => {
    if (modal || !focusAfter.current) return;
    const selector = focusAfter.current;
    focusAfter.current = null;
    requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());
  }, [modal, list]);
  const focusRow = (id: string) => {
    if (phone) focusAfter.current = `[data-row-id="${id}"]`;
  };
  const toast = (message: string) => {
    if (phone) showToast(message);
  };

  const open = (c: Counterparty) =>
    setModal(c.contracts.length ? { kind: "contracts", id: c.id } : { kind: "addContract", id: c.id, back: false });

  const removing =
    modal?.kind === "removeContract" ? current?.contracts.find((k) => k.id === modal.contractId) : undefined;

  const modals = (
    <>
      <ContractsModal
        counterparty={modal?.kind === "contracts" ? current : undefined}
        onClose={close}
        onAdd={() => current && setModal({ kind: "addContract", id: current.id, back: true })}
        onRemove={(k) => current && setModal({ kind: "removeContract", id: current.id, contractId: k.id, back: true })}
      />
      <AddContractModal
        key={modal?.kind === "addContract" ? `add:${modal.id}` : "add"}
        counterparty={modal?.kind === "addContract" ? current : undefined}
        onClose={close}
        onBack={() =>
          modal?.kind === "addContract" && modal.back && current?.contracts.length
            ? setModal({ kind: "contracts", id: current.id })
            : close()
        }
        onSave={(file) => {
          if (!current) return;
          addContract(accountId, current.id, file);
          setModal({ kind: "contracts", id: current.id });
          toast(COPY.toast.contractAdded);
        }}
      />
      <AddCounterpartyModal
        open={modal?.kind === "addCounterparty"}
        onClose={close}
        onSave={(input) => {
          const added = addCounterparty(accountId, input);
          if (added) focusRow(added.id);
          close();
          toast(COPY.toast.counterpartyAdded);
        }}
      />
      <ConfirmModal
        open={Boolean(removing)}
        onClose={() => (current && modal?.kind === "removeContract" ? setModal({ kind: "contracts", id: current.id }) : close())}
        onConfirm={() => {
          if (!current || !removing) return;
          const left = current.contracts.length - 1;
          removeContract(accountId, current.id, removing.id);
          if (left === 0) focusRow(current.id);
          setModal(left > 0 ? { kind: "contracts", id: current.id } : null);
        }}
        title="Видалити договір?"
        body={`Ви впевнені, що хочете видалити договір ${removing?.number ?? ""}? Цю дію неможливо скасувати.`}
      />
    </>
  );

  if (phone) {
    return (
      <div data-profile="cp-group" className="flex flex-col items-start gap-6">
        {list.length > 0 ? (
          <>
            <Button type="button" size="small" data-profile="cp-add" onClick={openAdd}>
              {COPY.counterparties.add}
            </Button>
            <ListPanel label={COPY.counterparties.title} className="w-full">
              {list.map((c) => (
                <CounterpartyRow key={c.id} counterparty={c} onOpen={() => open(c)} />
              ))}
            </ListPanel>
          </>
        ) : (
          <EmptyState
            surface="panel"
            className="w-full"
            icon={<OrderDocumentsIcon className="size-6" />}
            title={COPY.counterparties.emptyTitle}
            text={COPY.counterparties.emptyText}
            action={
              <Button type="button" size="small" data-profile="cp-empty-cta" onClick={openAdd}>
                {COPY.counterparties.add}
              </Button>
            }
          />
        )}
        {modals}
      </div>
    );
  }

  return (
    <div className="flex flex-col py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6">
        <h2 className="text-[22px] font-bold leading-7 tracking-[-0.44px] text-neutral-900">
          {COPY.counterparties.title}
        </h2>
        <Button type="button" size="small" onClick={() => setModal({ kind: "addCounterparty" })}>
          {COPY.counterparties.add}
        </Button>
      </div>
      <div className="px-6">
        <CounterpartiesTable list={list} onOpen={open} onAdd={() => setModal({ kind: "addCounterparty" })} />
      </div>

      {modals}
    </div>
  );
}
