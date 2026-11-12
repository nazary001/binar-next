"use client";

import {
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  PlayIcon,
  TrashIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { EntityHistory } from "../common/EntityHistory";
import { StaffSelect } from "../common/pickers";
import { countOf, cx, formatDateTime, formatPhone, formatRelative, qs } from "../lib/format";
import { OWNER_ROLE_ID } from "../lib/permissions";
import { useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Badge } from "../ui/Badge";
import { Button, IconButton } from "../ui/Button";
import { confirmDialog } from "../ui/ConfirmDialog";
import { Drawer } from "../ui/Drawer";
import { Textarea } from "../ui/Input";
import { KeyValueList, type KeyValueItem } from "../ui/KeyValue";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { AccountTypeBadge, LeadStatusBadge } from "../ui/status";
import { toast } from "../ui/Toast";
import { Tooltip } from "../ui/Tooltip";
import { COLOR_TRANSITION, FOCUS_RING, SURFACE, TEXT, TONES } from "../ui/tokens";
import { addNote, deleteLead, deleteNote, leadPath, patchLead, type LeadAnswer } from "./actions";
import { mailtoHref, sourceHref } from "./links";
import { ActionLink, BlockTitle, ContactLink, StatusSegments, contactTitle, copyText, deviceOf, pageName, telHref, useNow } from "./parts";
import { LEAD_KIND_LABELS, LEAD_NOTE_MAX, LEAD_STATUS_LABELS, type LeadDetail, type LeadField, type LeadNoteDto, type LeadStatus } from "./types";

// One form submission in the drawer of the inbox (/admin/leads?id=<id>):
// whom to call or write (large buttons, copy), the status and the person
// in charge, the answers in the words the visitor saw, where it came from,
// whether the e-mail notice went out, the next step for a partner request,
// the staff notes and the journal of changes.
//
// Opening a submission changes nothing. The first thing staff do with a
// new one (take it, give it to someone, write a note) moves it to "В
// роботі"; marking it spam or done directly does just that.
//
// Keyboard: ArrowUp / ArrowDown open the previous / next submission of the
// list while focus is not in a field or a control that uses the arrows.

const WIDTH = 600;

// The fields the contact block already shows.
const CONTACT_KEYS = new Set(["name", "phone", "email", "company"]);

// Controls whose arrows belong to themselves.
const OWN_ARROWS =
  "input, textarea, select, [contenteditable='true'], [role='radio'], [role='radiogroup'], [role='listbox'], [role='option'], [role='combobox'], [role='tab'], [role='menu'], [role='menuitem'], [aria-expanded='true']";

// Shows another submission in the open drawer. The body turns into a
// skeleton for a moment: the focus stays in the drawer instead of falling
// to the page, and the new one starts from the top.
function goTo(body: HTMLElement | null, id: string, onNavigate: (id: string) => void): void {
  const dialog = body?.closest<HTMLElement>("[role='dialog']");
  if (dialog && body && document.activeElement && body.contains(document.activeElement)) dialog.focus();
  body?.parentElement?.scrollTo({ top: 0 });
  onNavigate(id);
}

type Props = {
  leadId: string;
  open: boolean;
  onClose: () => void;
  prevId: string | null;
  nextId: string | null;
  onNavigate: (id: string) => void;
};

export function LeadDrawer({ leadId, open, onClose, prevId, nextId, onNavigate }: Props) {
  const { can } = useStaff();
  const query = useAdminQuery<LeadAnswer>(leadPath(leadId));
  // While another submission loads, the cache still holds the last one:
  // never show (or change) a record under the wrong address. A refresh
  // that answers 404 (deleted meanwhile) wins over the cached copy.
  const gone = query.error?.status === 404;
  const lead = !gone && query.data?.lead.id === leadId ? query.data.lead : undefined;
  const bodyRef = useRef<HTMLDivElement>(null);

  const navigate = (id: string | null) => {
    if (id) goTo(bodyRef.current, id, onNavigate);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const body = bodyRef.current;
      const dialog = body?.closest<HTMLElement>("[role='dialog']");
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!dialog || !target) return;
      // Only when this drawer is the layer in front (a confirm or a menu
      // above it keeps the keys).
      if (target !== document.body && !dialog.contains(target)) return;
      if (target.closest(OWN_ARROWS)) return;
      const id = event.key === "ArrowUp" ? prevId : nextId;
      if (!id) return;
      event.preventDefault();
      goTo(body, id, onNavigate);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, prevId, nextId, onNavigate]);

  const notFound = gone;
  const title = lead ? contactTitle(lead.contact) : "Заявка";
  const description = lead ? `${LEAD_KIND_LABELS[lead.kind] ?? lead.kind}, ${formatDateTime(lead.createdAt)}` : undefined;

  const headerActions =
    prevId || nextId ? (
      <>
        <IconButton label="Попередня заявка (стрілка вгору)" icon={ChevronUpIcon} disabled={!prevId} onClick={() => navigate(prevId)} />
        <IconButton label="Наступна заявка (стрілка вниз)" icon={ChevronDownIcon} disabled={!nextId} onClick={() => navigate(nextId)} />
      </>
    ) : undefined;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={WIDTH}
      title={title}
      description={description}
      headerActions={headerActions}
      footer={lead && can("leads.edit") && lead.status !== "done" ? <Footer key={lead.id} lead={lead} onDeleted={onClose} /> : undefined}
      closeLabel="Закрити заявку"
    >
      <div ref={bodyRef} className="flex min-w-0 flex-col gap-7">
        {lead ? (
          <LeadBody key={lead.id} lead={lead} />
        ) : notFound ? (
          <EmptyState
            size="lg"
            icon={<MagnifyingGlassIcon aria-hidden className="size-6" strokeWidth={1.7} />}
            title="Заявку не знайдено"
            text="Можливо, її вже видалили як спам або посилання неточне."
            action={
              <Button variant="secondary" onClick={onClose}>
                Повернутися до списку
              </Button>
            }
          />
        ) : query.error ? (
          <ErrorState failure={query.error} onRetry={query.reload} />
        ) : (
          <LoadingBody />
        )}
      </div>
    </Drawer>
  );
}

// --- loading ------------------------------------------------------------------------

function LoadingBody() {
  return (
    <div aria-hidden className="flex flex-col gap-7">
      <div className={cx(SURFACE.inset, "flex flex-col gap-3 p-4")}>
        <div className="flex items-center gap-3">
          <Skeleton shape="circle" className="size-10" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton shape="pill" className="h-14 w-full rounded-2xl" />
        <Skeleton shape="pill" className="h-14 w-full rounded-2xl" />
      </div>
      <Skeleton shape="pill" className="h-10 w-full" />
      <Skeleton shape="pill" className="h-10 w-full" />
      <SkeletonText lines={5} />
    </div>
  );
}

// --- body ---------------------------------------------------------------------------

function LeadBody({ lead }: { lead: LeadDetail }) {
  const { can } = useStaff();
  const canEdit = can("leads.edit");
  const answers = lead.fields.filter((field) => !CONTACT_KEYS.has(field.key));
  const answersId = useId();
  const factsId = useId();

  return (
    <>
      <ContactBlock lead={lead} />
      {canEdit ? <WorkBlock lead={lead} /> : <ReadOnlyWork lead={lead} />}
      <NextStep lead={lead} />

      <section aria-labelledby={answersId} className="flex flex-col gap-3">
        <BlockTitle id={answersId}>Відповіді</BlockTitle>
        {answers.length > 0 ? (
          <KeyValueList dense items={answers.map((field) => ({ label: field.label, value: <AnswerValue field={field} /> }))} />
        ) : (
          <p className={TEXT.muted}>Відвідувач залишив лише контакти.</p>
        )}
      </section>

      <section aria-labelledby={factsId} className="flex flex-col gap-3">
        <BlockTitle id={factsId}>Звідки заявка</BlockTitle>
        <Facts lead={lead} />
      </section>

      <Notes lead={lead} />

      <EntityHistory type="lead" id={lead.id} bare refreshKey={lead.updatedAt ?? lead.createdAt} collapsedTo={3} />
    </>
  );
}

// --- contacts -----------------------------------------------------------------------

// The drawer's title already names the person: the block holds the ways to
// reach them (and the company the partner form asks for).
function ContactBlock({ lead }: { lead: LeadDetail }) {
  const { phone, email, company } = lead.contact;
  const mailHref = email ? mailtoHref(email) : null;
  return (
    <section aria-label="Контакти" className={cx(SURFACE.inset, "flex flex-col gap-2 p-2 min-[640px]:gap-3 min-[640px]:p-3")}>
      {company && (
        <p className="flex min-w-0 items-center gap-3 px-3 pt-1 text-[15px] font-semibold leading-[22px] text-neutral-900">
          <BuildingOffice2Icon aria-hidden className="size-5 shrink-0 text-neutral-500" strokeWidth={1.7} />
          <span className="min-w-0 [overflow-wrap:anywhere]">{company}</span>
        </p>
      )}
      {phone && (
        <ContactRow
          icon={<PhoneIcon aria-hidden className="size-5" strokeWidth={1.7} />}
          value={<span className="tabular-nums">{formatPhone(phone)}</span>}
          action={
            <ActionLink href={telHref(phone)} icon={<PhoneIcon aria-hidden strokeWidth={1.7} />} label={`Подзвонити: ${formatPhone(phone)}`}>
              Подзвонити
            </ActionLink>
          }
          copy={phone}
          copyLabel="Скопіювати номер"
          copied="Номер скопійовано"
        />
      )}
      {email && (
        <ContactRow
          icon={<EnvelopeIcon aria-hidden className="size-5" strokeWidth={1.7} />}
          value={
            mailHref ? (
              email
            ) : (
              <span className="flex flex-col gap-0.5">
                <span>{email}</span>
                <span className={TEXT.caption}>Адреса має зайві символи, тому не відкриває пошту. Перевірте її, перш ніж писати.</span>
              </span>
            )
          }
          action={
            mailHref ? (
              <ActionLink href={mailHref} icon={<EnvelopeIcon aria-hidden strokeWidth={1.7} />} label={`Написати: ${email}`}>
                Написати
              </ActionLink>
            ) : null
          }
          copy={email}
          copyLabel="Скопіювати e-mail"
          copied="E-mail скопійовано"
        />
      )}
      {!phone && !email && <p className={cx(TEXT.muted, "px-3 py-2")}>Відвідувач не залишив ні телефону, ні e-mail.</p>}
    </section>
  );
}

function ContactRow({
  icon,
  value,
  action,
  copy,
  copyLabel,
  copied,
}: {
  icon: ReactNode;
  value: ReactNode;
  action: ReactNode;
  copy: string;
  copyLabel: string;
  copied: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white py-2 pl-4 pr-2">
      <span className="flex min-w-[180px] flex-1 items-center gap-3">
        <span className="shrink-0 text-neutral-500">{icon}</span>
        <span className="min-w-0 text-[15px] font-semibold leading-[22px] text-neutral-900 [overflow-wrap:anywhere]">{value}</span>
      </span>
      {/* On a phone the call / write button takes the whole line: a big target. */}
      <span className="flex shrink-0 items-center gap-2 max-[479px]:w-full max-[479px]:[&>a]:flex-1">
        {action}
        <IconButton
          label={copyLabel}
          icon={DocumentDuplicateIcon}
          variant="secondary"
          onClick={async () => {
            if (await copyText(copy)) toast.success(copied);
            else toast.error("Не вдалося скопіювати. Виділіть текст і скопіюйте вручну.");
          }}
        />
      </span>
    </div>
  );
}

// --- status and the person in charge ---------------------------------------------------

function WorkBlock({ lead }: { lead: LeadDetail }) {
  const { me } = useStaff();
  const statusLabelId = useId();
  const [busy, setBusy] = useState(false);

  const run = async (body: { status?: LeadStatus; assigneeId?: string | null }, message: string) => {
    if (busy) return;
    setBusy(true);
    const saved = await patchLead(lead.id, body);
    setBusy(false);
    if (saved) toast.success(message);
  };

  const changeStatus = (status: LeadStatus) => run({ status }, `Статус заявки: «${LEAD_STATUS_LABELS[status]}»`);

  const changeAssignee = (id: string | null) => {
    if (id === (lead.assigneeId ?? null)) return;
    // Giving a new submission to somebody is taking it into work.
    const promote = id !== null && lead.status === "new";
    const message = id === null ? "Відповідального знято" : promote ? "Відповідального призначено, заявка в роботі" : "Відповідального змінено";
    void run(promote ? { assigneeId: id, status: "in_progress" } : { assigneeId: id }, message);
  };

  return (
    <section aria-label="Робота із заявкою" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span id={statusLabelId} className={TEXT.label}>
          Статус
        </span>
        <StatusSegments value={lead.status} onChange={changeStatus} disabled={busy} labelledBy={statusLabelId} />
      </div>
      <StaffSelect
        label="Відповідальний"
        value={lead.assigneeId}
        onChange={changeAssignee}
        clearable
        placeholder="Не призначено"
        fallbackName={lead.assigneeName ?? undefined}
        disabled={busy}
        labelAction={
          lead.assigneeId !== me.id ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => changeAssignee(me.id)}
              className={cx(
                "cursor-pointer rounded-sm text-[13px] font-semibold leading-[18px] text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900 disabled:cursor-not-allowed disabled:text-neutral-300 motion-reduce:transition-none",
                COLOR_TRANSITION,
                FOCUS_RING,
              )}
            >
              Призначити мене
            </button>
          ) : undefined
        }
      />
    </section>
  );
}

function ReadOnlyWork({ lead }: { lead: LeadDetail }) {
  return (
    <KeyValueList
      columns={2}
      dense
      items={[
        { label: "Статус", value: <LeadStatusBadge status={lead.status} /> },
        {
          label: "Відповідальний",
          value: lead.assigneeId ? (lead.assigneeName ?? "Колишній співробітник") : <span className="text-neutral-500">Не призначено</span>,
        },
      ]}
    />
  );
}

// --- the next step ------------------------------------------------------------------------

function NextStep({ lead }: { lead: LeadDetail }) {
  const { can } = useStaff();
  const { name, email, phone, company } = lead.contact;

  if (lead.kind === "partner-contact" && !lead.account && can("customers.edit")) {
    const href = `/admin/customers/new?${qs({ name, email, phone, companyName: company })}`;
    return (
      <section aria-label="Наступний крок" className="flex flex-col gap-3 rounded-2xl border border-stroke-subtle p-4">
        <div className="flex flex-col gap-1">
          <p className={TEXT.bodyStrong}>Наступний крок: акаунт партнера</p>
          <p className={TEXT.muted}>
            {"Коли домовитеся про співпрацю, створіть партнеру акаунт у кабінеті. Ім'я, телефон, e-mail і компанія з заявки вже будуть заповнені."}
          </p>
        </div>
        <Button variant="secondary" iconLeft={UserPlusIcon} href={href} className="self-start max-[639px]:w-full">
          Створити акаунт партнера
        </Button>
      </section>
    );
  }

  if (lead.kind === "star-checklist" && email) {
    const stars = typeof lead.payload.stars === "number" ? lead.payload.stars : null;
    const hotel = stars ? `готелю на ${countOf(stars, ["зірку", "зірки", "зірок"])}` : "готелю";
    const letter = mailtoHref(email, `Чеклист для ${hotel}`);
    return (
      <section aria-label="Наступний крок" className="flex flex-col gap-3 rounded-2xl border border-stroke-subtle p-4">
        <div className="flex flex-col gap-1">
          <p className={TEXT.bodyStrong}>Відвідувач чекає на чеклист</p>
          <p className={cx(TEXT.muted, "[overflow-wrap:anywhere]")}>
            Сайт пообіцяв надіслати вимоги до комплектації {hotel} на {email} протягом доби. Надішліть їх листом.
          </p>
        </div>
        {letter && (
          <span className="self-start max-[639px]:w-full max-[639px]:[&>a]:w-full">
            <ActionLink href={letter} icon={<EnvelopeIcon aria-hidden strokeWidth={1.7} />}>
              Написати лист
            </ActionLink>
          </span>
        )}
      </section>
    );
  }

  return null;
}

// --- answers --------------------------------------------------------------------------

function Stars({ count }: { count: number }) {
  return (
    <span aria-hidden className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon key={index} className="size-4" style={{ color: index < count ? TONES.amber.dot : "#d2d2d2" }} />
      ))}
    </span>
  );
}

function AnswerValue({ field }: { field: LeadField }) {
  switch (field.type) {
    case "email": {
      const href = mailtoHref(field.value);
      return href ? <ContactLink href={href}>{field.value}</ContactLink> : <span className="[overflow-wrap:anywhere]">{field.value}</span>;
    }
    case "phone":
      return (
        <ContactLink href={telHref(field.value)} className="tabular-nums">
          {formatPhone(field.value)}
        </ContactLink>
      );
    case "long":
      return <span className="block whitespace-pre-line">{field.value}</span>;
    case "stars": {
      const count = Number.parseInt(field.value, 10);
      return (
        <span className="inline-flex items-center gap-2">
          {Number.isFinite(count) && <Stars count={count} />}
          <span>{field.value}</span>
        </span>
      );
    }
    case "list":
      return (
        <span className="flex flex-col gap-0.5">
          {field.value.split(", ").map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </span>
      );
    default:
      return <>{field.value}</>;
  }
}

// --- where it came from ------------------------------------------------------------------

function Facts({ lead }: { lead: LeadDetail }) {
  const { can } = useStaff();
  const now = useNow();
  const page = pageName(lead.source);
  // Only a page of this site is a link: a source stored before the form
  // route refused "//host" and "/\host" stays text, so a click never leaves
  // the site.
  const pageHref = sourceHref(lead.source);
  const items: KeyValueItem[] = [
    {
      label: "Сторінка",
      value: pageHref ? (
        <a
          href={pageHref}
          target="_blank"
          rel="noreferrer"
          className={cx(
            "inline-flex items-center gap-1 rounded-sm underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900 motion-reduce:transition-none",
            COLOR_TRANSITION,
            FOCUS_RING,
          )}
        >
          {page}
          <ArrowTopRightOnSquareIcon aria-hidden className="size-3.5 text-neutral-500" strokeWidth={1.7} />
        </a>
      ) : (
        <span className="[overflow-wrap:anywhere]">{lead.source}</span>
      ),
      // The address helps where the name is ours; the home page needs none.
      hint: pageHref
        ? page !== lead.source && lead.source !== "/"
          ? `Адреса: ${lead.source}`
          : undefined
        : "Це не адреса сторінки сайту, тому посилання вимкнено.",
    },
    {
      label: "Надіслано",
      value: <span className="tabular-nums">{formatDateTime(lead.createdAt)}</span>,
      hint: now ? formatRelative(lead.createdAt, now) : undefined,
    },
    {
      label: "Акаунт на сайті",
      value: lead.account ? (
        <span className="inline-flex flex-wrap items-center gap-2">
          {can("customers.view") ? (
            <Link
              href={`/admin/customers/${encodeURIComponent(lead.account.id)}`}
              className={cx("rounded-sm underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900", FOCUS_RING)}
            >
              {lead.account.name}
            </Link>
          ) : (
            lead.account.name
          )}
          <AccountTypeBadge type={lead.account.type} />
        </span>
      ) : (
        <span className="text-neutral-500">Відвідувач не входив в акаунт</span>
      ),
    },
    {
      label: "Лист менеджерам про заявку",
      value: <Notice lead={lead} />,
    },
  ];
  if (lead.userAgent) {
    items.push({ label: "Пристрій", value: <span title={lead.userAgent}>{deviceOf(lead.userAgent)}</span> });
  }
  return <KeyValueList dense items={items} />;
}

function Notice({ lead }: { lead: LeadDetail }) {
  const { can } = useStaff();
  const mayOpenMail = can("integrations.view");
  const outbox = lead.outbox;
  const linkClass = cx(
    "w-fit rounded-sm text-[13px] font-semibold leading-[18px] underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900",
    FOCUS_RING,
  );

  if (!outbox) return <span className="text-neutral-500">{"Лист не створювався: заявка надійшла раніше, ніж з'явилася пошта."}</span>;

  if (outbox.sentAt) {
    return (
      <span className="flex flex-col items-start gap-1">
        <Badge tone="green" dot>
          Надіслано
        </Badge>
        <span className="text-neutral-600">
          На {outbox.to}, {formatDateTime(outbox.sentAt)}
        </span>
      </span>
    );
  }

  if (!lead.mailConfigured) {
    return (
      <span className="flex flex-col items-start gap-1">
        <Badge tone="amber" dot>
          Пошта не налаштована
        </Badge>
        <span className="text-neutral-600">Лист на {outbox.to} чекає в черзі й піде, щойно пошту налаштують.</span>
        {mayOpenMail ? (
          <Link href="/admin/integrations/mail" className={linkClass}>
            Налаштувати пошту
          </Link>
        ) : (
          <span className={TEXT.caption}>Попросіть адміністратора налаштувати пошту в розділі «Інтеграції».</span>
        )}
      </span>
    );
  }

  if (outbox.attempts > 0) {
    return (
      <span className="flex flex-col items-start gap-1">
        <Badge tone="red" dot>
          Не вдалося надіслати
        </Badge>
        <span className="text-neutral-600">
          На {outbox.to}, спроб: {outbox.attempts}
          {outbox.lastError ? `. Причина: ${outbox.lastError}` : ""}
        </span>
        {mayOpenMail && (
          <Link href={`/admin/integrations/mail?${qs({ id: outbox.id })}`} className={linkClass}>
            Відкрити лист
          </Link>
        )}
      </span>
    );
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <Badge tone="blue" dot>
        У черзі
      </Badge>
      <span className="text-neutral-600">Лист на {outbox.to} буде надіслано найближчим часом.</span>
    </span>
  );
}

// --- notes -----------------------------------------------------------------------------

// A member of staff removes their own notes; an owner also removes a
// colleague's (the API holds the same rule and answers 403 "not-author"
// to anybody else).
function Notes({ lead }: { lead: LeadDetail }) {
  const { me, can } = useStaff();
  const canEdit = can("leads.edit");
  const isOwner = me.roleId === OWNER_ROLE_ID;
  const now = useNow();
  const notesId = useId();
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (note: LeadNoteDto) => {
    const own = note.by.id === me.id;
    const yes = await confirmDialog({
      title: own ? "Видалити нотатку?" : "Видалити нотатку колеги?",
      text: own
        ? "Текст нотатки зникне назавжди; у журналі залишиться лише запис про видалення."
        : `Автор нотатки: ${note.by.name}. Текст зникне назавжди; у журналі залишиться запис про видалення з іменем автора.`,
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!yes) return;
    setRemoving(note.id);
    const saved = await deleteNote(lead.id, note.id);
    setRemoving(null);
    if (saved) toast.success("Нотатку видалено");
  };

  return (
    <section aria-labelledby={notesId} className="flex flex-col gap-3">
      <BlockTitle id={notesId} aside={lead.notes.length > 0 ? <span className={TEXT.caption}>{lead.notes.length}</span> : undefined}>
        Нотатки
      </BlockTitle>
      {lead.notes.length === 0 && (
        <p className={TEXT.muted}>
          {canEdit ? "Нотаток ще немає. Запишіть, про що домовилися, щоб колеги знали." : "Нотаток ще немає."}
        </p>
      )}
      {lead.notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {lead.notes.map((note) => {
            const own = note.by.id === me.id;
            return (
              <li key={note.id} className={cx(SURFACE.inset, "flex flex-col gap-1.5 py-3 pl-4 pr-2")}>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[13px] font-semibold leading-[18px] text-neutral-900">{own ? `${note.by.name} (ви)` : note.by.name}</span>
                  <Tooltip content={formatDateTime(note.at)} describe={false}>
                    <time dateTime={note.at} className={cx(TEXT.caption, "shrink-0 tabular-nums")}>
                      {now ? formatRelative(note.at, now) : formatDateTime(note.at)}
                    </time>
                  </Tooltip>
                  <span className="ml-auto" />
                  {canEdit && (own || isOwner) && (
                    <IconButton
                      label="Видалити нотатку"
                      icon={TrashIcon}
                      variant="danger"
                      size="sm"
                      loading={removing === note.id}
                      onClick={() => remove(note)}
                    />
                  )}
                </div>
                <p className={cx(TEXT.body, "whitespace-pre-line pr-2 [overflow-wrap:anywhere]")}>{note.text}</p>
              </li>
            );
          })}
        </ul>
      )}
      {canEdit && <NoteForm lead={lead} />}
    </section>
  );
}

function NoteForm({ lead }: { lead: LeadDetail }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = text.trim().length > 0;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    const saved = await addNote(lead.id, text.trim());
    if (!saved) {
      setBusy(false);
      return;
    }
    setText("");
    // A note on a new submission means somebody works on it.
    if (saved.status === "new") {
      const moved = await patchLead(lead.id, { status: "in_progress" });
      setBusy(false);
      toast.success(moved ? "Нотатку додано, заявка в роботі" : "Нотатку додано");
      return;
    }
    setBusy(false);
    toast.success("Нотатку додано");
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        aria-label="Нова нотатка"
        value={text}
        onChange={setText}
        rows={2}
        autoGrow
        maxRows={8}
        maxLength={LEAD_NOTE_MAX}
        placeholder="Наприклад: передзвонити у вівторок після 14:00"
        disabled={busy}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void submit();
          }
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cx(TEXT.caption, "max-[639px]:hidden")}>Ctrl + Enter, щоб додати. Нотатки бачать лише співробітники.</span>
        <Button size="sm" variant="secondary" onClick={submit} loading={busy} disabled={!ready} className="max-[639px]:w-full">
          Додати нотатку
        </Button>
      </div>
    </div>
  );
}

// --- footer ----------------------------------------------------------------------------

// The obvious next move for the status the submission has.
function Footer({ lead, onDeleted }: { lead: LeadDetail; onDeleted: () => void }) {
  const { me } = useStaff();
  const [busy, setBusy] = useState(false);

  const take = async () => {
    setBusy(true);
    const saved = await patchLead(lead.id, { status: "in_progress", ...(lead.assigneeId ? {} : { assigneeId: me.id }) });
    setBusy(false);
    if (saved) toast.success(lead.assigneeId ? "Заявку взято в роботу" : "Заявку взято в роботу, відповідальний - ви");
  };

  const finish = async () => {
    setBusy(true);
    const saved = await patchLead(lead.id, { status: "done" });
    setBusy(false);
    if (saved) toast.success("Заявку опрацьовано");
  };

  const remove = async () => {
    const yes = await confirmDialog({
      title: "Видалити заявку?",
      text: "Заявку буде видалено назавжди разом із нотатками; у журналі залишиться запис про видалення.",
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!yes) return;
    setBusy(true);
    const done = await deleteLead(lead.id);
    setBusy(false);
    if (done) {
      toast.success("Заявку видалено");
      onDeleted();
    }
  };

  if (lead.status === "new") {
    return (
      <Button iconLeft={PlayIcon} loading={busy} onClick={take}>
        Взяти в роботу
      </Button>
    );
  }
  if (lead.status === "in_progress") {
    return (
      <Button iconLeft={CheckCircleIcon} loading={busy} onClick={finish}>
        Позначити опрацьованою
      </Button>
    );
  }
  if (lead.status === "spam") {
    return (
      <Button variant="dangerGhost" iconLeft={TrashIcon} loading={busy} onClick={remove}>
        Видалити заявку
      </Button>
    );
  }
  return null;
}
