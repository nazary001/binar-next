"use client";

import { phoneDigits } from "@/components/auth/data";
import { ChevronSideIcon } from "@/components/catalog/icons";
import { DocumentGlyph, KebabMenu, KeyValueLine, ListRow, MailIcon, PhoneIcon, StatusPill } from "@/components/platform/ui";
import { Button } from "@/components/ui/Button";
import { OrderDocumentsIcon } from "../orderIcons";
import { COPY, COUNTERPARTY_STATUS, formatEmployeePhone, inviteNote, type Counterparty, type Employee } from "./data";

// Phone rows of "Мій профіль" (< 640, profile spec 2.4.2 / 2.5.2): the
// TR-07 list rows that stand in for the 1000-px counterparties table and
// the grey employee cards. They live in a ListPanel (white r32, 1-px
// #d2d2d2 lines inset 24) and never render from 640.

// The row title: Title Small 16/22 Bold (row ids / names, D9). Names
// break between words (not inside one, the phone-wide overflow-wrap rule
// is overridden) and clamp to two lines; the overlay shows them in full.
const ROW_TITLE = "text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900";

// "Договір" summary of a counterparty row: "Додати договір" (brand, the
// row then opens the add-contract card), "No 432-01" with the document
// glyph, or the first number + the "+ n" count of the others. 38 tall so
// it centres with the md StatusPill when the line wraps.
function ContractSummary({ counterparty }: { counterparty: Counterparty }) {
  const list = counterparty.contracts;
  if (list.length === 0) {
    return (
      <span className="inline-flex h-[38px] items-center whitespace-nowrap text-[14px] font-semibold leading-5 text-brand">
        {COPY.contracts.add}
      </span>
    );
  }
  const many = list.length > 1;
  return (
    <span className="inline-flex h-[38px] items-center gap-1 whitespace-nowrap text-[14px] font-semibold leading-5 text-neutral-900">
      {many ? <OrderDocumentsIcon className="size-5 shrink-0" /> : <DocumentGlyph className="size-5 shrink-0" />}
      {list[0].number}
      {many && (
        <span className="ml-1 rounded-[40px] bg-neutral-40 px-2 py-0.5 text-[14px] font-semibold leading-5">
          + {list.length - 1}
        </span>
      )}
    </span>
  );
}

// Counterparty row: the name is the row's button (stretched over the whole
// row, its focus ring and :active tint drawn by ListRow), then the status
// pill + the contract summary, then "Підписант" / "ЄДРПОУ/ІПН" lines.
// Opens what the desktop row opens: one contract -> the contract card,
// several -> the "Договори" sheet, none -> "Додати договір".
export function CounterpartyRow({ counterparty: c, onOpen }: { counterparty: Counterparty; onOpen: () => void }) {
  const status = COUNTERPARTY_STATUS[c.status];
  return (
    <ListRow data-profile="cp-item">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            data-row-open=""
            data-row-id={c.id}
            onClick={onOpen}
            className={`min-w-0 flex-1 cursor-pointer text-left outline-none after:absolute after:inset-0 after:content-[''] ${ROW_TITLE}`}
          >
            <span className="line-clamp-2 text-pretty [overflow-wrap:break-word]!">{c.name}</span>
          </button>
          <ChevronSideIcon mirrored className="size-6 shrink-0 text-neutral-900" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <ContractSummary counterparty={c} />
        </div>
        <div className="flex flex-col gap-1">
          <KeyValueLine label={COPY.counterparties.heads[1]} value={c.signatory} />
          <KeyValueLine label={COPY.counterparties.heads[2]} value={c.code} nowrap />
        </div>
      </div>
    </ListRow>
  );
}

// Contact line of an active employee: a 44-tall tel: / mailto: link.
const CONTACT =
  "flex min-h-11 items-center gap-3 self-start text-[14px] leading-5 text-neutral-900 transition-colors duration-200 active:text-brand motion-reduce:transition-none focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

// Employee row: name (or the invited e-mail) over the position, the 40-px
// kebab disc right; the sm status pill; then the contacts (44-px rows) or
// the invitation note + the full-width "Надіслати повторно".
export function EmployeeRow({
  employee: e,
  now,
  onEdit,
  onRemove,
  onResend,
}: {
  employee: Employee;
  now: number;
  onEdit: () => void;
  onRemove: () => void;
  onResend: () => void;
}) {
  const invited = e.status === "invited";
  const title = invited ? e.email : e.fullName;
  return (
    <ListRow>
      <article data-profile="emp-item" data-row-id={e.id} tabIndex={-1} className="flex flex-col outline-none">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3 className={ROW_TITLE}>{title}</h3>
            {!invited && e.position && <p className="text-[14px] leading-5 text-neutral-500">{e.position}</p>}
          </div>
          <KebabMenu
            phoneDisc
            className="-my-[9px] shrink-0"
            label={`Дії: ${title}`}
            items={[
              { key: "edit", label: COPY.employees.edit, onSelect: onEdit },
              { key: "remove", label: COPY.employees.remove, onSelect: onRemove },
            ]}
          />
        </div>
        <div className="mt-3 flex">
          <StatusPill tone={invited ? "blue" : "green"} size="sm">
            {invited ? COPY.employees.invited : COPY.employees.active}
          </StatusPill>
        </div>
        {invited ? (
          <>
            <p className="mt-3 text-[14px] leading-5 text-neutral-900">{inviteNote(e.invitedAt, now)}</p>
            <div className="mt-4 flex">
              <Button type="button" size="small" variant="outlinedDark" fullWidth onClick={onResend}>
                {COPY.employees.resend}
              </Button>
            </div>
          </>
        ) : (
          (e.phone || e.email) && (
            <div className="-mb-3 mt-1 flex flex-col">
              {e.phone && (
                <a href={`tel:+38${phoneDigits(e.phone)}`} className={CONTACT}>
                  <PhoneIcon className="size-5 shrink-0" />
                  <span className="whitespace-nowrap">{formatEmployeePhone(e.phone)}</span>
                </a>
              )}
              {e.email && (
                <a href={`mailto:${e.email}`} className={CONTACT}>
                  <MailIcon className="size-5 shrink-0" />
                  <span className="min-w-0">{e.email}</span>
                </a>
              )}
            </div>
          )
        )}
      </article>
    </ListRow>
  );
}
