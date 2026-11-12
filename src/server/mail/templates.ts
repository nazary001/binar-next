import "server-only";
import { formatDate, formatDateTime, formatMoney } from "@/components/admin/lib/format";
import { MAIL_PROVIDER_LABELS, type MailProvider, type OutboxKind } from "@/components/admin/mail/types";
import { GENERATED_PASSWORD_TTL_HOURS } from "@/components/admin/staff/types";
import { DELIVERY_OPTIONS } from "@/components/checkout/data";
import { ORDER_STATUS_META, type OrderStatusKey } from "@/components/platform/ui/OrderStatusBadge";
import { RETURN_STATUS_META, type ReturnStatusKey } from "@/components/platform/ui/ReturnStatusBadge";
import type { LeadDoc, OrderDoc } from "../db/collections";
import { headerText, isMailAddress } from "./provider";

// The messages of the site: one plain, robust HTML e-mail layout (a table
// layout with inline styles and system fonts, as every mail client
// renders it) and a text version without markup, built from the same
// blocks so the two always say the same.
//
//   const mail = renderMessage("lead", doc.payload, context);   // null = cannot
//
// Everything that comes from data goes through `escapeHtml` on its way
// into the HTML; links are built here from the site address and ids, never
// taken whole from a payload. Pure functions: the database lookups a
// message needs (the order, the lead, the invite token) are made by
// context.ts beforehand. Ukrainian copy.

export type MailCompany = { name: string; phone: string; email: string; address: string };

// Secrets a flow hands to sendNow for one message; never stored.
export type MailSecret = { resetToken?: string; password?: string };

export type MailContext = {
  // "https://binar-2000.com" (no trailing slash).
  siteUrl: string;
  // The "general" settings: the footer and the brand in the copy.
  company: MailCompany;
  // The recipient of the message (who a confirmation is for).
  to?: string;
  // When the message was written (the lead's "sent at").
  createdAt?: Date | null;
  order?: OrderDoc | null;
  lead?: LeadDoc | null;
  // The company's invitation token (employee-invite).
  inviteToken?: string | null;
  secret?: MailSecret;
};

export type RenderedMail = { subject: string; html: string; text: string; replyTo?: string };

export type RenderOutcome = { ok: true; mail: RenderedMail } | { ok: false; error: "template" | "secret-required" };

// The site address for links in messages: SITE_URL, else the public
// address the metadata uses; this machine in development.
export function siteUrl(): string {
  const env = process.env.SITE_URL?.trim();
  if (env && /^https?:\/\/[^\s/]+/.test(env)) return env.replace(/\/+$/, "");
  return process.env.NODE_ENV === "production" ? "https://binar-2000.com" : "http://localhost:3000";
}

// --- escaping and payload readers -------------------------------------------

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// Escaped, with the line breaks kept.
function htmlLines(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function str(value: unknown, max = 300): string {
  if (typeof value === "string") return value.trim().slice(0, max);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function safeId(value: string): string | null {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value) ? value : null;
}

function link(context: MailContext, path: string): string {
  return `${context.siteUrl}${path}`;
}

function brandOf(context: MailContext): string {
  return context.company.name || "Binar 2000";
}

// --- layout -------------------------------------------------------------------

const INK = "#1d1d1f";
const MUTED = "#777779";
const HAIRLINE = "#d2d2d2";
const SLAB = "#f5f5f5";
const BRAND = "#f85a0b";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type Row = [label: string, value: string];
type Item = { name: string; qty: number; unit: string; price: number | null };

type Block =
  | { type: "p"; text: string }
  | { type: "rows"; rows: Row[] }
  | { type: "items"; items: Item[]; total: number | null }
  // A quoted text: a comment, a note from the manager.
  | { type: "quote"; text: string }
  // A value to copy exactly (a temporary password).
  | { type: "code"; label: string; value: string }
  | { type: "note"; text: string };

type Letter = {
  subject: string;
  // The hidden first line most clients show next to the subject.
  preheader: string;
  title: string;
  // Empty entries (a block a message does not need) are left out.
  blocks: (Block | null | false | undefined)[];
  button?: { label: string; url: string } | null;
  replyTo?: string;
};

function cell(content: string, padding = "16px 32px 0 32px"): string {
  return `<tr><td style="padding:${padding};font-family:${FONT};font-size:15px;line-height:24px;color:${INK};">${content}</td></tr>`;
}

// Rows without a value are left out.
function filled(rows: Row[]): Row[] {
  return rows.filter((row) => Boolean(row[1]));
}

function present<T>(value: T | null | undefined | false): value is T {
  return Boolean(value);
}

function rowsHtml(rows: Row[]): string {
  const lines = filled(rows)
    .map(
      ([label, value]) =>
        `<tr><td valign="top" style="padding:6px 16px 6px 0;font-family:${FONT};font-size:14px;line-height:20px;color:${MUTED};white-space:nowrap;">${escapeHtml(label)}</td>` +
        `<td valign="top" style="padding:6px 0;font-family:${FONT};font-size:14px;line-height:20px;color:${INK};">${htmlLines(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${lines}</table>`;
}

function itemsHtml(items: Item[], total: number | null): string {
  const lines = items
    .map((item) => {
      const amount = item.price !== null ? formatMoney(item.price * item.qty) : "";
      const each = item.price !== null ? ` x ${formatMoney(item.price)}` : "";
      return (
        `<tr><td valign="top" style="padding:10px 12px 10px 0;border-top:1px solid ${HAIRLINE};font-family:${FONT};font-size:14px;line-height:20px;color:${INK};">${escapeHtml(item.name)}` +
        `<div style="font-size:13px;line-height:18px;color:${MUTED};">${escapeHtml(`${item.qty} ${item.unit}${each}`)}</div></td>` +
        `<td valign="top" align="right" style="padding:10px 0;border-top:1px solid ${HAIRLINE};font-family:${FONT};font-size:14px;line-height:20px;color:${INK};white-space:nowrap;">${escapeHtml(amount)}</td></tr>`
      );
    })
    .join("");
  const sum =
    total !== null
      ? `<tr><td style="padding:12px 12px 0 0;border-top:1px solid ${INK};font-family:${FONT};font-size:15px;font-weight:700;color:${INK};">Разом</td>` +
        `<td align="right" style="padding:12px 0 0 0;border-top:1px solid ${INK};font-family:${FONT};font-size:15px;font-weight:700;color:${INK};white-space:nowrap;">${escapeHtml(formatMoney(total))}</td></tr>`
      : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${lines}${sum}</table>`;
}

function blockHtml(block: Block): string {
  switch (block.type) {
    case "p":
      return cell(htmlLines(block.text));
    case "rows":
      return filled(block.rows).length > 0 ? cell(rowsHtml(block.rows)) : "";
    case "items":
      return cell(itemsHtml(block.items, block.total));
    case "quote":
      return cell(
        `<div style="padding:12px 16px;background:${SLAB};border-radius:12px;font-size:14px;line-height:22px;color:${INK};">${htmlLines(block.text)}</div>`,
      );
    case "code":
      return cell(
        `<div style="font-size:13px;line-height:18px;color:${MUTED};">${escapeHtml(block.label)}</div>` +
          `<div style="display:inline-block;margin-top:6px;padding:10px 16px;background:${SLAB};border-radius:12px;font-family:Consolas, Menlo, monospace;font-size:16px;letter-spacing:1px;color:${INK};">${escapeHtml(block.value)}</div>`,
      );
    case "note":
      return cell(`<div style="font-size:13px;line-height:20px;color:${MUTED};">${htmlLines(block.text)}</div>`);
  }
}

function blockText(block: Block): string {
  switch (block.type) {
    case "p":
    case "note":
      return block.text;
    case "rows":
      return filled(block.rows)
        .map(([label, value]) => `${label}: ${value}`)
        .join("\n");
    case "items": {
      const lines = block.items.map((item) => {
        const each = item.price !== null ? ` x ${formatMoney(item.price)} = ${formatMoney(item.price * item.qty)}` : "";
        return `- ${item.name}: ${item.qty} ${item.unit}${each}`;
      });
      if (block.total !== null) lines.push(`Разом: ${formatMoney(block.total)}`);
      return lines.join("\n");
    }
    case "quote":
      return block.text
        .split(/\r?\n/)
        .map((line) => `> ${line}`)
        .join("\n");
    case "code":
      return `${block.label}: ${block.value}`;
  }
}

function footerLines(context: MailContext): string[] {
  const { company } = context;
  return [brandOf(context), [company.phone, company.email].filter(Boolean).join(" | "), company.address, context.siteUrl].filter(
    Boolean,
  );
}

// One layout for every message. The subject and the hidden first line are
// one line each: a line break or another control character from the data
// (a lead's name, a company) becomes a space, so no provider or webhook
// receiver ever gets a subject that reads as more than one header.
export function layout(input: Letter, context: MailContext): RenderedMail {
  const letter: Letter = { ...input, subject: headerText(input.subject), preheader: headerText(input.preheader) };
  const brand = brandOf(context);
  const blocks = letter.blocks.filter(present);
  const button = letter.button;
  const buttonHtml = button
    ? cell(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:999px;background:${BRAND};">` +
          `<a href="${escapeHtml(button.url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(button.label)}</a>` +
          `</td></tr></table>` +
          `<div style="padding-top:12px;font-size:12px;line-height:18px;color:${MUTED};">Якщо кнопка не відкривається, скопіюйте посилання в браузер:<br><a href="${escapeHtml(button.url)}" target="_blank" style="color:${MUTED};word-break:break-all;">${escapeHtml(button.url)}</a></div>`,
        "24px 32px 0 32px",
      )
    : "";
  const footer = footerLines(context)
    .map((line) => escapeHtml(line))
    .join("<br>");

  const html =
    `<!doctype html><html lang="uk"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light only">` +
    `<title>${escapeHtml(letter.subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:${SLAB};">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${SLAB};">${escapeHtml(letter.preheader)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SLAB};"><tr><td align="center" style="padding:24px 12px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:24px;">` +
    cell(`<span style="font-size:15px;font-weight:700;color:${INK};">${escapeHtml(brand)}</span>`, "28px 32px 0 32px") +
    cell(`<span style="font-size:22px;line-height:30px;font-weight:700;color:${INK};">${escapeHtml(letter.title)}</span>`, "16px 32px 0 32px") +
    blocks.map(blockHtml).join("") +
    buttonHtml +
    cell(
      `<div style="border-top:1px solid ${HAIRLINE};padding-top:16px;font-size:12px;line-height:18px;color:${MUTED};">${footer}</div>`,
      "32px 32px 28px 32px",
    ) +
    `</table></td></tr></table></body></html>`;

  const text = [
    letter.title,
    ...blocks.map(blockText).filter(Boolean),
    ...(button ? [`${button.label}: ${button.url}`] : []),
    ["--", ...footerLines(context)].join("\n"),
  ].join("\n\n");

  return { subject: letter.subject, html, text, ...(letter.replyTo ? { replyTo: letter.replyTo } : {}) };
}

// --- orders -------------------------------------------------------------------

type OrderView = {
  id: string;
  number: string;
  channel: "b2b" | "retail" | null;
  date: string;
  status: string;
  total: number | null;
  items: Item[];
  customer: { name: string; company: string; phone: string; email: string };
  delivery: string;
  payment: string;
  comment: string;
};

function deliveryOf(checkout: Record<string, unknown>): string {
  const option = DELIVERY_OPTIONS.find((entry) => entry.value === checkout.delivery);
  const address = [str(checkout.street), str(checkout.house), str(checkout.flat) ? `кв. ${str(checkout.flat)}` : ""]
    .filter(Boolean)
    .join(", ");
  const place =
    checkout.delivery === "np-branch"
      ? str(checkout.branch)
      : checkout.delivery === "np-locker"
        ? str(checkout.locker)
        : checkout.delivery === "np-address"
          ? address
          : "";
  return [option?.label ?? "", str(checkout.city), place].filter(Boolean).join(", ");
}

function orderView(payload: Record<string, unknown>, order: OrderDoc | null | undefined): OrderView | null {
  const customer = obj(payload.customer);
  const checkout = obj(order?.checkout);
  let items: Item[] = [];
  let delivery = "";
  let company = "";
  let name = "";
  let payment = "";
  if (order?.channel === "b2b") {
    items = order.items.map((item) => ({ name: item.name, qty: item.qty, unit: item.unit || "шт", price: item.price }));
    delivery = [order.delivery?.method, order.delivery?.city].filter(Boolean).join(", ");
    company = order.counterparty;
    name = str(checkout.name) || order.createdBy;
    payment = order.paymentType;
  } else if (order?.channel === "retail") {
    items = order.items.map((item) => ({ name: item.title, qty: item.qty, unit: "шт", price: item.price }));
    delivery = deliveryOf(checkout);
    company = checkout.invoice === true ? str(checkout.company) : "";
    name = str(checkout.name);
    payment = str(checkout.payment);
  }
  // An order's id is its number ("48291064", "BN-100122"), so a message
  // whose order cannot be read (removed since) still names it.
  const number = str(payload.number, 40) || order?.number || safeId(str(payload.orderId, 64)) || "";
  if (!number) return null;
  const channel = payload.channel === "b2b" || payload.channel === "retail" ? payload.channel : (order?.channel ?? null);
  return {
    id: safeId(str(payload.orderId, 64)) ?? order?._id ?? safeId(number) ?? "",
    number,
    channel,
    date: order?.date ?? "",
    status: order?.status ?? "",
    total: num(payload.total) ?? order?.total ?? null,
    items,
    customer: {
      name: str(customer.name, 200) || name,
      company: str(customer.company, 200) || company,
      phone: str(customer.phone, 64) || str(checkout.phone, 64),
      email: str(customer.email, 254) || str(checkout.email, 254),
    },
    delivery,
    payment,
    comment: str(checkout.comment, 2000),
  };
}

function statusLabel(status: string): string {
  return ORDER_STATUS_META[status as OrderStatusKey]?.label ?? status;
}

function contactNote(context: MailContext, lead: string): Block | null {
  const ways = [context.company.phone, context.company.email].filter(Boolean).join(" або ");
  return ways ? { type: "note", text: `${lead} ${ways}.` } : null;
}

function orderPlaced(payload: Record<string, unknown>, context: MailContext): RenderOutcome {
  const view = orderView(payload, context.order);
  if (!view) return { ok: false, error: "template" };
  const brand = brandOf(context);
  const audience =
    payload.audience === "staff" || payload.audience === "customer"
      ? payload.audience
      : view.customer.email && view.customer.email.toLowerCase() === (context.to ?? "").trim().toLowerCase()
        ? "customer"
        : "staff";
  const items: Block | null = view.items.length > 0 ? { type: "items", items: view.items, total: view.total } : null;
  const totalRow: Row[] = view.items.length === 0 && view.total !== null ? [["Сума", formatMoney(view.total)]] : [];

  if (audience === "staff") {
    const rows: Row[] = [
      ["Канал", view.channel === "b2b" ? "Кабінет партнера" : view.channel === "retail" ? "Роздріб, сайт" : ""],
      ["Клієнт", view.customer.name],
      ["Компанія", view.customer.company],
      ["Телефон", view.customer.phone],
      ["E-mail", view.customer.email],
      ["Доставка", view.delivery],
      ["Оплата", view.payment],
      ...totalRow,
    ];
    return {
      ok: true,
      mail: layout(
        {
          subject: `Нове замовлення №${view.number}${view.total !== null ? ` на ${formatMoney(view.total)}` : ""}`,
          preheader: [view.customer.company || view.customer.name, view.delivery].filter(Boolean).join(", "),
          title: `Нове замовлення №${view.number}`,
          blocks: [
            {
              type: "p",
              text: view.channel === "b2b" ? "Партнер оформив замовлення в кабінеті." : "На сайті оформили нове замовлення.",
            },
            { type: "rows", rows },
            items,
            view.comment ? { type: "quote", text: view.comment } : null,
          ],
          button: view.id ? { label: "Відкрити замовлення", url: link(context, `/admin/orders/${encodeURIComponent(view.id)}`) } : null,
          replyTo: isMailAddress(view.customer.email) ? view.customer.email : undefined,
        },
        context,
      ),
    };
  }

  const rows: Row[] = [
    ["Номер", `№${view.number}`],
    ["Дата", view.date ? formatDate(view.date) : ""],
    ["Доставка", view.delivery],
    ["Оплата", view.payment],
    ...totalRow,
  ];
  const button =
    view.channel === "b2b" && view.id
      ? { label: "Відкрити замовлення", url: link(context, `/orders/${encodeURIComponent(view.id)}`) }
      : { label: "Перейти до каталогу", url: link(context, "/catalog") };
  return {
    ok: true,
    mail: layout(
      {
        subject: `Ваше замовлення №${view.number} прийнято`,
        preheader: `Дякуємо! Ми вже працюємо над замовленням №${view.number}.`,
        title: "Дякуємо за замовлення!",
        blocks: [
          {
            type: "p",
            text: `${view.customer.name ? `${view.customer.name}, ми` : "Ми"} отримали ваше замовлення №${view.number} і вже працюємо над ним. Менеджер ${brand} зв'яжеться з вами, щоб підтвердити деталі.`,
          },
          { type: "rows", rows },
          items,
          contactNote(context, "Питання щодо замовлення? Телефонуйте або пишіть:"),
        ],
        button,
      },
      context,
    ),
  };
}

function orderStatus(payload: Record<string, unknown>, context: MailContext): RenderOutcome {
  const view = orderView(payload, context.order);
  const status = str(payload.status, 40) || view?.status || "";
  if (!view || !status) return { ok: false, error: "template" };
  const label = statusLabel(status);
  const ttn = str(payload.ttn, 40) || str(context.order?.shipment?.ttn, 40);
  const note = str(payload.note, 2000);
  const lines: Record<string, string> = {
    inProgress: "Ми взяли замовлення в роботу і готуємо його до відвантаження.",
    shipped: "Замовлення відвантажено і передано перевізнику.",
    received: "Замовлення отримано. Дякуємо, що обираєте нас!",
    completed: "Замовлення завершено. Дякуємо, що обираєте нас!",
    cancelled: "Замовлення скасовано. Якщо це сталося помилково, зв'яжіться з нами.",
    blocked: "Замовлення тимчасово призупинено. Менеджер зв'яжеться з вами щодо деталей.",
  };
  return {
    ok: true,
    mail: layout(
      {
        subject: `Замовлення №${view.number}: ${label}`,
        preheader: `Статус замовлення №${view.number} змінено на «${label}».`,
        title: `Замовлення №${view.number}`,
        blocks: [
          { type: "p", text: `Статус замовлення змінено на «${label}».` },
          lines[status] ? { type: "p", text: lines[status] } : null,
          ttn ? { type: "rows", rows: [["Номер накладної", ttn]] } : null,
          note ? { type: "quote", text: note } : null,
          contactNote(context, "Питання щодо замовлення? Телефонуйте або пишіть:"),
        ],
        button:
          view.channel === "b2b" && view.id
            ? { label: "Відкрити замовлення", url: link(context, `/orders/${encodeURIComponent(view.id)}`) }
            : null,
      },
      context,
    ),
  };
}

// --- returns --------------------------------------------------------------------

// What staff decided on a return request, for the partner. Only the
// decisions a partner acts on are mailed (returns.ts decides which); the
// words follow the cabinet's status names.
function returnStatus(payload: Record<string, unknown>, context: MailContext): RenderOutcome {
  const id = safeId(str(payload.returnId, 64));
  const status = str(payload.status, 40);
  if (!id || !status) return { ok: false, error: "template" };
  const label = str(payload.label, 80) || RETURN_STATUS_META[status as ReturnStatusKey]?.label || status;
  const orderNumber = str(payload.orderNumber, 40);
  const reason = str(payload.reason, 2000);
  const refund = num(payload.refundAmount);
  const lines: Record<string, string> = {
    approved: "Ми погодили повернення. Передайте товар так, як обрали в запиті: після того як склад його прийме, ми завершимо повернення.",
    rejected: "На жаль, ми не можемо погодити це повернення.",
    completed: "Повернення завершено. Дякуємо, що обираєте нас!",
  };
  return {
    ok: true,
    mail: layout(
      {
        subject: `Повернення №${id}: ${label}`,
        preheader: orderNumber
          ? `Рішення щодо повернення товарів із замовлення №${orderNumber}.`
          : `Рішення щодо запиту на повернення №${id}.`,
        title: `Запит на повернення №${id}`,
        blocks: [
          {
            type: "p",
            text: orderNumber
              ? `Статус запиту на повернення товарів із замовлення №${orderNumber} змінено на «${label}».`
              : `Статус запиту на повернення змінено на «${label}».`,
          },
          lines[status] ? { type: "p", text: lines[status] } : null,
          status === "rejected" && reason ? { type: "rows", rows: [["Причина відмови", reason]] } : null,
          status === "completed" && refund !== null ? { type: "rows", rows: [["Сума повернення", formatMoney(refund)]] } : null,
          contactNote(context, "Питання щодо повернення? Телефонуйте або пишіть:"),
        ],
        button: { label: "Відкрити запит", url: link(context, `/orders/returns/${encodeURIComponent(id)}`) },
      },
      context,
    ),
  };
}

// --- the other kinds ------------------------------------------------------------

const LEAD_KIND_LABELS: Record<string, string> = {
  quiz: "Квіз на сайті",
  "star-checklist": "Чеклист за зірковістю",
  "partner-contact": "Форма «Цікавить співпраця?»",
};

function lead(payload: Record<string, unknown>, context: MailContext): RenderOutcome {
  const stored = context.lead;
  const contact = { ...obj(stored?.contact), ...obj(payload.contact) };
  const kind = str(payload.kind, 40) || stored?.kind || "";
  const kindLabel = LEAD_KIND_LABELS[kind] ?? (kind || "Форма на сайті");
  const name = str(contact.name, 200);
  const email = str(contact.email, 254);
  const rawSource = str(payload.source, 200) || stored?.source || "";
  // Only a path of this site becomes a link ("//host" would leave it).
  const source = /^\/(?!\/)[^\s]*$/.test(rawSource) ? rawSource : "";
  const leadId = safeId(str(payload.leadId, 64)) ?? stored?._id ?? null;
  const details = obj(stored?.payload);
  const rows: Row[] = [
    ["Форма", kindLabel],
    ["Хто написав", name],
    ["Телефон", str(contact.phone, 64)],
    ["E-mail", email],
    ["Компанія", str(contact.company, 300)],
    ["Роль", kind === "partner-contact" ? str(details.role, 300) : ""],
    ["Зірковість", kind === "star-checklist" && num(details.stars) !== null ? String(num(details.stars)) : ""],
    ["Сторінка", source ? link(context, source) : rawSource],
    ["Надіслано", stored?.createdAt ? formatDateTime(stored.createdAt) : context.createdAt ? formatDateTime(context.createdAt) : ""],
  ];
  const comment = kind === "partner-contact" ? str(details.comment, 5000) : "";
  return {
    ok: true,
    mail: layout(
      {
        subject: `Нова заявка з сайту: ${kindLabel}${name ? `, ${name}` : ""}`,
        preheader: [name, str(contact.phone, 64) || email].filter(Boolean).join(", "),
        title: "Нова заявка з сайту",
        blocks: [
          { type: "p", text: "На сайті заповнили форму. Зв'яжіться з клієнтом і позначте заявку в панелі." },
          { type: "rows", rows },
          comment ? { type: "quote", text: comment } : null,
        ],
        button: {
          label: "Відкрити заявку",
          url: link(context, leadId ? `/admin/leads?id=${encodeURIComponent(leadId)}` : "/admin/leads"),
        },
        replyTo: isMailAddress(email) ? email : undefined,
      },
      context,
    ),
  };
}

function emailChanged(payload: Record<string, unknown>, context: MailContext): RenderOutcome {
  const login = str(payload.login, 320);
  const from = str(payload.from, 254);
  const to = str(payload.to, 254);
  const brand = brandOf(context);
  return {
    ok: true,
    mail: layout(
      {
        subject: "Адресу e-mail вашого акаунта змінено",
        preheader: `Зміна адреси e-mail акаунта на сайті ${brand}.`,
        title: "Адресу e-mail змінено",
        blocks: [
          {
            type: "p",
            text: `Для вашого акаунта на сайті ${brand}${login ? ` (${login})` : ""} змінено адресу e-mail.`,
          },
          from || to
            ? {
                type: "rows",
                rows: [
                  ["Попередня адреса", from],
                  ["Нова адреса", to],
                ],
              }
            : null,
          { type: "p", text: "Ми надіслали цей лист на попередню адресу, щоб ви знали про зміну." },
          contactNote(context, "Якщо це зробили не ви, негайно зв'яжіться з нами:") ?? {
            type: "note",
            text: "Якщо це зробили не ви, негайно зв'яжіться з нами.",
          },
        ],
      },
      context,
    ),
  };
}

function employeeInvite(payload: Record<string, unknown>, context: MailContext): RenderOutcome {
  const token = context.inviteToken;
  if (!token || !/^[A-Za-z0-9_-]{1,64}$/.test(token)) return { ok: false, error: "template" };
  const brand = brandOf(context);
  const company = str(payload.company, 200) || "Ваша компанія";
  const resend = payload.resend === true;
  return {
    ok: true,
    mail: layout(
      {
        subject: resend ? `Нагадування: ${company} запрошує вас на платформу ${brand}` : `${company} запрошує вас на платформу ${brand}`,
        preheader: `Запрошення до кабінету партнера ${brand}.`,
        title: "Запрошення до кабінету партнера",
        blocks: [
          {
            type: "p",
            text: `Компанія «${company}» запрошує вас приєднатися до її кабінету на платформі ${brand}: замовлення, документи та розрахунки в одному місці.`,
          },
          { type: "note", text: "Якщо ви не чекали цього листа, просто проігноруйте його." },
        ],
        button: { label: "Прийняти запрошення", url: link(context, `/invite/${encodeURIComponent(token)}`) },
      },
      context,
    ),
  };
}

// A generated password opens the account for a limited time only
// (src/server/admin/staff.ts), and the person has to know it.
const TEMPORARY_PASSWORD_HOLDS = `Тимчасовий пароль діє ${GENERATED_PASSWORD_TTL_HOURS} год від моменту видачі: пізніше він уже не відкриє акаунт, і адміністратору доведеться скинути пароль ще раз.`;

function staffInvite(payload: Record<string, unknown>, context: MailContext): RenderOutcome {
  const brand = brandOf(context);
  const name = str(payload.name, 200);
  const roleName = str(payload.roleName, 120);
  const email = str(payload.email, 254) || str(context.to, 254);
  const password = context.secret?.password;
  return {
    ok: true,
    mail: layout(
      {
        subject: `Доступ до панелі керування ${brand}`,
        preheader: "Для вас створено обліковий запис у панелі керування сайтом.",
        title: name ? `Вітаємо, ${name}!` : "Вітаємо!",
        blocks: [
          {
            type: "p",
            text: `Для вас створено обліковий запис у панелі керування сайтом ${brand}${roleName ? ` з роллю «${roleName}»` : ""}.`,
          },
          { type: "rows", rows: [["Логін", email]] },
          password ? { type: "code", label: "Тимчасовий пароль", value: password } : null,
          {
            type: "p",
            text: password
              ? "Після першого входу система попросить задати власний пароль."
              : "Тимчасовий пароль вам передасть адміністратор. Після першого входу система попросить задати власний пароль.",
          },
          { type: "p", text: TEMPORARY_PASSWORD_HOLDS },
        ],
        button: { label: "Увійти в панель", url: link(context, "/admin/login") },
      },
      context,
    ),
  };
}

function staffPassword(payload: Record<string, unknown>, context: MailContext): RenderOutcome {
  const name = str(payload.name, 200);
  const byAdmin = payload.byAdmin === true;
  const password = context.secret?.password;
  return {
    ok: true,
    mail: layout(
      {
        subject: "Пароль до панелі керування змінено",
        preheader: "Пароль вашого облікового запису в панелі керування змінено.",
        title: name ? `${name}, пароль змінено` : "Пароль змінено",
        blocks: [
          {
            type: "p",
            text: byAdmin
              ? "Адміністратор задав новий пароль для вашого облікового запису в панелі керування."
              : "Пароль вашого облікового запису в панелі керування змінено.",
          },
          password ? { type: "code", label: "Тимчасовий пароль", value: password } : null,
          password
            ? { type: "p", text: "Після входу система попросить задати власний пароль." }
            : byAdmin
              ? { type: "p", text: "Новий тимчасовий пароль вам передасть адміністратор." }
              : null,
          password || byAdmin ? { type: "p", text: TEMPORARY_PASSWORD_HOLDS } : null,
          { type: "note", text: "Якщо ви цього не робили, негайно повідомте адміністратора." },
        ],
        button: { label: "Увійти в панель", url: link(context, "/admin/login") },
      },
      context,
    ),
  };
}

function passwordReset(payload: Record<string, unknown>, context: MailContext): RenderOutcome {
  const token = context.secret?.resetToken;
  if (!token) return { ok: false, error: "secret-required" };
  const brand = brandOf(context);
  const login = str(payload.login, 320);
  return {
    ok: true,
    mail: layout(
      {
        subject: "Відновлення пароля",
        preheader: `Посилання, щоб задати новий пароль на сайті ${brand}.`,
        title: "Відновлення пароля",
        blocks: [
          { type: "p", text: `Ви попросили відновити пароль до акаунта${login ? ` ${login}` : ""} на сайті ${brand}.` },
          { type: "p", text: "Натисніть кнопку, щоб задати новий пароль. Посилання діє 1 годину і спрацює лише один раз." },
          { type: "note", text: "Якщо ви не просили відновлення, просто проігноруйте цей лист: пароль залишиться тим самим." },
        ],
        button: { label: "Задати новий пароль", url: link(context, `/?reset=${encodeURIComponent(token)}`) },
      },
      context,
    ),
  };
}

// --- entry points ---------------------------------------------------------------

export function tryRender(kind: OutboxKind, payload: Record<string, unknown>, context: MailContext): RenderOutcome {
  const data = obj(payload);
  switch (kind) {
    case "lead":
      return lead(data, context);
    case "order-placed":
      return orderPlaced(data, context);
    case "order-status":
      return orderStatus(data, context);
    case "return-status":
      return returnStatus(data, context);
    case "email-changed":
      return emailChanged(data, context);
    case "employee-invite":
      return employeeInvite(data, context);
    case "staff-invite":
      return staffInvite(data, context);
    case "staff-password":
      return staffPassword(data, context);
    case "password-reset":
      return passwordReset(data, context);
  }
}

// The message of an outbox entry, or null when it cannot be rendered from
// what is stored: a kind that needs a live secret (password-reset), or a
// payload that lacks what the message cannot go without.
export function renderMessage(kind: OutboxKind, payload: Record<string, unknown>, context: MailContext): RenderedMail | null {
  const outcome = tryRender(kind, payload, context);
  return outcome.ok ? outcome.mail : null;
}

// The panel's "send a test message".
export function renderTestMessage(context: MailContext, input: { by: string; provider: MailProvider; at: Date }): RenderedMail {
  const brand = brandOf(context);
  return layout(
    {
      subject: `Перевірка пошти ${brand}`,
      preheader: "Тестовий лист із панелі керування.",
      title: "Пошта працює",
      blocks: [
        {
          type: "p",
          text: "Це тестовий лист із панелі керування сайтом. Якщо ви його бачите, надсилання листів налаштовано правильно.",
        },
        {
          type: "rows",
          rows: [
            ["Сервіс", MAIL_PROVIDER_LABELS[input.provider]],
            ["Надіслав", input.by],
            ["Час", formatDateTime(input.at)],
          ],
        },
      ],
      button: { label: "Відкрити панель", url: link(context, "/admin/integrations/mail") },
    },
    context,
  );
}
