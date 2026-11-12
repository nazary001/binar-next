// Outgoing mail of the site as the panel sees it: the mail settings
// (GET / PUT /api/admin/integrations/mail/settings), the test message
// (POST /api/admin/integrations/mail/test) and the outbox
// (GET /api/admin/outbox, GET /api/admin/outbox/<id>, POST .../deliver,
// .../<id>/retry, .../<id>/mark-sent, DELETE /api/admin/outbox/<id>).
// Shared by the routes, src/server/mail and the screens. Types and plain
// constants only: no "use client", no server import.

// --- messages ---------------------------------------------------------------

// Mirrors OutboxDoc["kind"] (src/server/db/collections.ts); the server
// asserts the two stay equal.
export type OutboxKind =
  | "password-reset"
  | "email-changed"
  | "employee-invite"
  | "lead"
  | "order-placed"
  | "order-status"
  | "staff-invite"
  | "staff-password";

export const OUTBOX_KINDS: readonly OutboxKind[] = [
  "lead",
  "order-placed",
  "order-status",
  "employee-invite",
  "email-changed",
  "password-reset",
  "staff-invite",
  "staff-password",
];

export const OUTBOX_KIND_LABELS: Record<OutboxKind, string> = {
  lead: "Заявка з сайту",
  "order-placed": "Нове замовлення",
  "order-status": "Статус замовлення",
  "employee-invite": "Запрошення співробітника",
  "email-changed": "Зміна e-mail",
  "password-reset": "Відновлення пароля",
  "staff-invite": "Доступ до панелі",
  "staff-password": "Пароль до панелі",
};

// Kinds whose stored message cannot be mailed: the mail must carry a
// secret that is never stored (the reset link). Such a message stays in
// the outbox as a record; the flow that creates the secret mails it at
// once through sendNow (src/server/mail/deliver.ts).
export const UNRENDERABLE_KINDS: readonly OutboxKind[] = ["password-reset"];

export function isRenderableKind(kind: OutboxKind): boolean {
  return !UNRENDERABLE_KINDS.includes(kind);
}

// After this many failed attempts the mailer stops trying by itself;
// "Надіслати ще раз" (retry) starts the count again.
export const MAIL_MAX_ATTEMPTS = 5;

// - pending: waits for the mailer (never tried yet);
// - sent: delivered to the provider (or marked as handled by hand);
// - failed: tried at least once and not delivered (the mailer keeps trying
//   until MAIL_MAX_ATTEMPTS, waiting longer after each failure);
// - unsendable: a kind of UNRENDERABLE_KINDS, never mailed from the outbox.
export type OutboxState = "pending" | "sent" | "failed" | "unsendable";

export const OUTBOX_STATES: readonly OutboxState[] = ["pending", "failed", "sent", "unsendable"];

export const OUTBOX_STATE_LABELS: Record<OutboxState, string> = {
  pending: "Очікує",
  sent: "Надіслано",
  failed: "Помилка",
  unsendable: "Не надсилається",
};

export type OutboxCounts = Record<OutboxState, number>;

// One line of the outbox list.
export type OutboxRow = {
  id: string;
  kind: OutboxKind;
  kindLabel: string;
  // The recipient as stored: an e-mail, or (old reset notices of phone
  // accounts) a phone number, which no mailer can deliver.
  to: string;
  state: OutboxState;
  createdAt: string;
  sentAt: string | null;
  attempts: number;
  // The last refusal: a code of MAIL_ERROR_LABELS, "http-<status>: <text>"
  // or the provider's own words. Never a key.
  lastError: string | null;
  lastAttemptAt: string | null;
  // Set on messages that must not outlive what they announce.
  expiresAt: string | null;
  // One line from the payload: the lead's contact, the order number, ...
  summary: string;
};

// GET /api/admin/outbox?kind=lead,order-placed&state=failed&q=<recipient>&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=20&sort=-createdAt
// (sortable: createdAt, sentAt, attempts, to, kind; default -createdAt).
// `counts` covers the same filters except `state`.
export type OutboxListAnswer = {
  ok: true;
  items: OutboxRow[];
  total: number;
  page: number;
  limit: number;
  counts: OutboxCounts;
  status: MailStatusDto;
};

// The message as the recipient would get it, rendered now from the stored
// payload (and the current settings). `html` is a whole document with every
// value escaped; show it only inside <iframe sandbox="" srcDoc={html}>, never
// through dangerouslySetInnerHTML (its <style>-free inline layout is meant
// for a mail client, and the panel must not run anything from it).
export type MailPreview = { subject: string; html: string; text: string };

// One delivery attempt of a message (the exchange journal, system "mail").
export type MailDeliveryDto = {
  id: string;
  at: string;
  status: "ok" | "error";
  error: string | null;
  durationMs: number;
  // Who started it ("Система" for the automatic run).
  actor: string | null;
};

// GET /api/admin/outbox/<id>
export type OutboxDetailAnswer = {
  ok: true;
  message: OutboxRow;
  // The stored payload as is (no message ever holds a live secret).
  payload: Record<string, unknown>;
  // null for an unrenderable kind or when the payload cannot be rendered
  // (`previewError` says why).
  preview: MailPreview | null;
  previewError: string | null;
  // Newest first, at most 20.
  deliveries: MailDeliveryDto[];
};

// The outcome of one run of the mailer.
export type DeliverResult = {
  // false = no provider is configured: nothing was tried, nothing changed.
  configured: boolean;
  sent: number;
  failed: number;
  // Pending messages the run did not try because their kind cannot be
  // mailed from the outbox (UNRENDERABLE_KINDS).
  skipped: number;
};

// POST /api/admin/outbox/deliver  { ids?: string[] }  (at most 100 ids;
// without ids: the 20 oldest messages that are due).
export type DeliverAnswer = { ok: true; result: DeliverResult; counts: OutboxCounts };

// POST /api/admin/outbox/<id>/retry  (attempts back to 0, one attempt now)
// Refusals: 404 not-found, 409 "state" (already sent, or a kind that
// cannot be mailed), 409 "busy" (being sent this very moment),
// 409 "no-provider" (nothing would send it).
// POST /api/admin/outbox/<id>/mark-sent  (handled by hand; 409 "state" when sent)
// DELETE /api/admin/outbox/<id>
export type OutboxMessageAnswer = { ok: true; message: OutboxRow };
export type OutboxRetryAnswer = { ok: true; message: OutboxRow; result: MailSendResult };

// --- provider ---------------------------------------------------------------

export type MailProvider = "none" | "resend" | "webhook";

export const MAIL_PROVIDERS: readonly MailProvider[] = ["none", "resend", "webhook"];

export const MAIL_PROVIDER_LABELS: Record<MailProvider, string> = {
  none: "Не підключено",
  resend: "Resend",
  webhook: "Webhook",
};

// What keeps the configured provider from sending.
export type MailMissing = "provider" | "apiKey" | "from" | "webhookUrl" | "secretsKey";

export const MAIL_MISSING_LABELS: Record<MailMissing, string> = {
  provider: "Не обрано сервіс надсилання",
  apiKey: "Не вказано ключ API",
  from: "Не вказано адресу відправника",
  webhookUrl: "Не вказано адресу webhook",
  secretsKey: "Збережений ключ не відкривається: на сервері змінився ключ шифрування, введіть ключ API ще раз",
};

export type MailStatusDto = {
  provider: MailProvider;
  // true = messages are being sent.
  configured: boolean;
  from: string;
  missing: MailMissing[];
};

// What a provider answered.
export type MailSendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string; retryable: boolean };

// Codes of `lastError` / MailSendResult.error the mailer itself writes.
// Besides these: "http-<status>: <provider's words>".
export const MAIL_ERROR_LABELS: Record<string, string> = {
  "no-provider": "Сервіс надсилання не підключено",
  "not-configured": "Сервіс надсилання налаштовано не повністю",
  timeout: "Сервіс не відповів за 10 секунд",
  network: "Не вдалося з'єднатися із сервісом",
  address: "Адреса одержувача не є e-mail",
  template: "Лист не вдалося скласти з даних повідомлення",
  "secret-required": "Цей лист можна надіслати лише в момент створення",
};

// --- settings ---------------------------------------------------------------

// GET /api/admin/integrations/mail/settings -> MailSettingsAnswer.
// The key itself is never sent: `hasKey` and `keyHint` ("****ab12") only.
export type MailSettingsDto = {
  provider: MailProvider;
  // "Binar 2000 <no-reply@binar-2000.com>" or a bare address.
  from: string;
  // Where replies go when a message has no reply address of its own.
  replyTo: string;
  // provider "webhook": the address the site POSTs every message to (JSON
  // { to, subject, html, text, from, replyTo }). With a key stored, the
  // call carries "Authorization: Bearer <key>".
  webhookUrl: string;
  // Read by queueMail (src/server/mail/queue.ts) when a message is written:
  // "a new order" notices to the orders inbox, "a form was sent" notices
  // to the leads inbox, the order confirmation to the customer.
  notifyNewOrder: boolean;
  notifyNewLead: boolean;
  confirmOrderToCustomer: boolean;
  hasKey: boolean;
  keyHint: string;
};

export type MailSettingsAnswer = {
  ok: true;
  settings: MailSettingsDto;
  status: MailStatusDto;
  // false = the server has no key to seal secrets with (SECRETS_KEY or
  // REVALIDATE_SECRET): an API key cannot be saved (PUT answers 503
  // "secrets-key").
  secretsAvailable: boolean;
};

// Where the staff notices go: the general settings' inboxes (edited on the
// settings page, shown on the mail page). GET and PUT of the mail settings
// answer MailSettingsView.
export type MailInboxes = { leads: string; orders: string[] };
export type MailSettingsView = MailSettingsAnswer & { inboxes: MailInboxes };

// PUT /api/admin/integrations/mail/settings: any subset of the fields.
// `apiKey`: a new key to seal; "" removes the stored one; absent keeps it.
// Refusals: 400 "bad-request" (shape), 400 "fields" + { fields: { from |
// replyTo | webhookUrl | apiKey: "format" | "https" | "credentials" } },
// 503 "secrets-key". Answer: MailSettingsAnswer.
export type MailSettingsInput = Partial<
  Pick<
    MailSettingsDto,
    "provider" | "from" | "replyTo" | "webhookUrl" | "notifyNewOrder" | "notifyNewLead" | "confirmOrderToCustomer"
  >
> & { apiKey?: string };

export const MAIL_FIELD_ERRORS: Record<string, string> = {
  format: "Перевірте формат",
  https: "Потрібна адреса https:// (http:// лише для localhost)",
  credentials: "Не додавайте логін і пароль в адресу: вкажіть ключ у полі «Ключ API»",
};

// POST /api/admin/integrations/mail/test  { to: "someone@example.com" }
// -> the provider's answer as is (HTTP 200 also when the provider refused).
export type MailTestAnswer = { ok: true; provider: MailProvider; result: MailSendResult };

// --- payloads -----------------------------------------------------------------
// What the code that writes a message puts into `payload`. Everything is
// optional for the renderer: an order message is completed from the order
// itself (looked up by orderId), so a writer may store just the ids.

// Written by src/server/repos/leads.ts.
export type LeadPayload = {
  leadId: string;
  kind: "quiz" | "star-checklist" | "partner-contact";
  // The page the form was sent from ("/hotels").
  source: string;
  contact: { name?: string; email?: string; phone?: string; company?: string };
};

export type OrderPlacedPayload = {
  orderId: string;
  number?: string;
  // "staff": the notice to the orders inbox; "customer": the confirmation
  // to the buyer. Absent: "customer" when `to` is the order's own e-mail.
  audience?: "staff" | "customer";
  channel?: "b2b" | "retail";
  total?: number;
  customer?: { name?: string; company?: string; phone?: string; email?: string };
};

export type OrderStatusPayload = {
  orderId: string;
  number?: string;
  // The status the order moved to (a key of ORDER_STATUS_META) and from.
  status: string;
  from?: string;
  // A line from the manager shown in the message.
  note?: string;
  // The carrier's waybill number, when the parcel left.
  ttn?: string;
};

// Written by src/server/repos/users.ts noteEmailChange.
export type EmailChangedPayload = { login: string; userId: string; from: string; to: string };

// Written by src/server/repos/profile.ts. The invitation link is built
// from the company's invite token (employee -> company), or from
// `clientId` when the writer stores it.
export type EmployeeInvitePayload = { company: string; employeeId: string; clientId?: string; resend?: boolean };

// A member of staff got access to the panel / a new password. The
// password itself is never stored: a flow that wants it in the mail sends
// the message with sendNow(..., { password }).
export type StaffInvitePayload = { staffId: string; name?: string; email?: string; roleName?: string };
export type StaffPasswordPayload = { staffId: string; name?: string; email?: string; byAdmin?: boolean };

// Written by src/server/repos/users.ts createPasswordReset. Mailed only
// through sendNow(..., { resetToken }) at the moment the link is made.
export type PasswordResetPayload = { login: string; userId: string };
