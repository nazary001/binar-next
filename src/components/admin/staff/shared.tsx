"use client";

import {
  ArrowRightEndOnRectangleIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { useState, type ReactNode } from "react";
import { OWNER_ROLE_ID } from "../lib/permissions";
import { countOf, cx, formatDate, formatDateTime, formatNumber, formatRelative } from "../lib/format";
import { Badge, type BadgeSize } from "../ui/Badge";
import { Button } from "../ui/Button";
import { CopyButton } from "../ui/KeyValue";
import { TEXT, TONES, type Tone } from "../ui/tokens";
import { GENERATED_PASSWORD_TTL_HOURS, type StaffJournalLine, type StaffRow, type StaffSessionDto } from "./types";

export const HOUR_FORMS = ["годину", "години", "годин"] as const;

// Pieces the staff screens and the own-account page share: the role and
// state badges, the notes that explain a disabled control, the list of
// sessions, the sign-in lines and the one-time password.

// --- badges -------------------------------------------------------------------

// The owner role in the brand tone, every other role quiet.
export function RoleBadge({ roleId, name, size = "sm" }: { roleId: string; name: string; size?: BadgeSize }) {
  return (
    <Badge tone={roleId === OWNER_ROLE_ID ? "brand" : "neutral"} size={size}>
      {name}
    </Badge>
  );
}

// Blocked, a generated password that no longer opens the account, waiting
// for the first own password, or active.
export function StaffStateBadge({
  row,
  size = "sm",
}: {
  row: Pick<StaffRow, "isActive" | "mustChangePassword" | "passwordExpired">;
  size?: BadgeSize;
}) {
  if (!row.isActive) {
    return (
      <Badge tone="red" dot size={size}>
        Заблокований
      </Badge>
    );
  }
  if (row.mustChangePassword && row.passwordExpired) {
    return (
      <Badge tone="red" dot size={size} title="Тимчасовий пароль більше не відкриває акаунт: скиньте пароль ще раз">
        Пароль прострочено
      </Badge>
    );
  }
  if (row.mustChangePassword) {
    return (
      <Badge tone="amber" dot size={size} title="Людина ще не задала власний пароль">
        Тимчасовий пароль
      </Badge>
    );
  }
  return (
    <Badge tone="green" dot size={size}>
      Активний
    </Badge>
  );
}

// --- notes --------------------------------------------------------------------

const NOTE_TONE: Record<"info" | "warning" | "danger", { tone: Tone; Icon: typeof InformationCircleIcon }> = {
  info: { tone: "blue", Icon: InformationCircleIcon },
  warning: { tone: "amber", Icon: ExclamationTriangleIcon },
  danger: { tone: "red", Icon: ShieldExclamationIcon },
};

// A tinted line that says why something is the way it is ("Свою роль
// змінити не можна ...").
export function Note({ tone = "info", children, className }: { tone?: "info" | "warning" | "danger"; children: ReactNode; className?: string }) {
  const { tone: color, Icon } = NOTE_TONE[tone];
  return (
    <p
      className={cx("flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13px] leading-[18px]", className)}
      style={{ backgroundColor: TONES[color].bg, color: TONES[color].text }}
    >
      <Icon aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.8} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

// --- devices --------------------------------------------------------------------

export type Device = { label: string; mobile: boolean };

const BROWSERS: [RegExp, string][] = [
  // Order matters: Edge, Opera and the others also say "Chrome" and "Safari".
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/YaBrowser\//, "Яндекс Браузер"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/CriOS\/|HeadlessChrome\/|Chrome\//, "Chrome"],
  [/Version\/[\d.]+.*Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows NT|Windows/, "Windows"],
  [/CrOS/, "ChromeOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

// Scripts sign in too (the audit checks, a monitoring tool).
const PROGRAMS = /^(node|undici|curl|wget|python|axios|got|okhttp|Go-http-client|PostmanRuntime)/i;

// "Chrome, Windows": enough to tell two devices apart, not a full parser.
export function describeDevice(userAgent: string | null): Device {
  const ua = (userAgent ?? "").trim();
  if (!ua) return { label: "Невідомий пристрій", mobile: false };
  if (PROGRAMS.test(ua)) return { label: "Програма або скрипт", mobile: false };
  const browser = BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] ?? null;
  const system = SYSTEMS.find(([pattern]) => pattern.test(ua))?.[1] ?? null;
  const mobile = /Mobi|iPhone|Android|iPad/.test(ua);
  if (!browser && !system) return { label: "Невідомий пристрій", mobile };
  return { label: [browser ?? "Браузер", system].filter(Boolean).join(", "), mobile };
}

// --- sessions -------------------------------------------------------------------

const ROW = "flex min-w-0 items-start gap-3 py-3 first:pt-0 last:pb-0";
const TILE = "flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-subtle text-neutral-800";

// This device first, then the most recently used. The first `collapsedTo`
// show; "Показати ще" opens the rest. `total` is the number of live
// sessions when the API sent fewer (its list stops at 100).
export function SessionList({
  sessions,
  now,
  onEnd,
  ending,
  label = "Сеанси",
  collapsedTo = 5,
  total,
}: {
  sessions: StaffSessionDto[];
  now: number;
  // null: the list is read only (no "Завершити").
  onEnd: ((session: StaffSessionDto) => void) | null;
  ending: string | null;
  label?: string;
  collapsedTo?: number;
  total?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const ordered = [...sessions.filter((session) => session.current), ...sessions.filter((session) => !session.current)];
  const shown = expanded ? ordered : ordered.slice(0, collapsedTo);
  const more = total !== undefined && total > sessions.length ? total - sessions.length : 0;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-stroke-subtle" aria-label={label}>
        {shown.map((session) => {
          const device = describeDevice(session.userAgent);
          const Icon = device.mobile ? DevicePhoneMobileIcon : ComputerDesktopIcon;
          return (
            <li key={session.id} className={ROW} data-session={session.id}>
              <span aria-hidden className={TILE}>
                <Icon className="size-5" strokeWidth={1.7} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={cx(TEXT.bodyStrong, "min-w-0 truncate")} title={session.userAgent ?? undefined}>
                    {device.label}
                  </span>
                  {session.current && (
                    <Badge tone="green" dot>
                      Цей пристрій
                    </Badge>
                  )}
                </span>
                <span className={cx(TEXT.caption, "tabular-nums")} title={formatDateTime(session.lastSeenAt)}>
                  Активність {formatRelative(session.lastSeenAt, now || undefined)}
                  {session.ip ? `, адреса ${session.ip}` : ""}
                </span>
                <span className={cx(TEXT.caption, "tabular-nums")}>
                  Вхід {formatDateTime(session.createdAt)}, діє до {formatDate(session.expiresAt)}
                  {session.remember ? ", пристрій запам'ятано" : ""}
                </span>
              </span>
              {onEnd && !session.current && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  aria-label={`Завершити сеанс: ${device.label}`}
                  loading={ending === session.id}
                  onClick={() => onEnd(session)}
                >
                  Завершити
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {ordered.length > collapsedTo && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Згорнути" : `Показати ще ${formatNumber(ordered.length - collapsedTo)}`}
          </Button>
          {expanded && more > 0 && (
            <span className={TEXT.caption}>
              Показано {formatNumber(ordered.length)} найсвіжіших із {formatNumber(total ?? 0)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// --- sign-ins -------------------------------------------------------------------

// The badge of a refused sign-in, by its reason.
function refusalLabel(reason: string | null): string {
  if (reason === "rate") return "Забагато спроб, вхід призупинено";
  if (reason === "expired") return "Тимчасовий пароль прострочено";
  return "Невдала спроба";
}

export function SignInList({ lines, now }: { lines: StaffJournalLine[]; now: number }) {
  return (
    <ul className="flex flex-col divide-y divide-stroke-subtle" aria-label="Останні входи">
      {lines.map((line) => {
        const refused = line.action === "staff.sign-in-refused";
        const Icon = refused ? ShieldExclamationIcon : ArrowRightEndOnRectangleIcon;
        return (
          <li key={line.id} className={ROW}>
            <span
              aria-hidden
              className={TILE}
              style={refused ? { backgroundColor: TONES.red.bg, color: TONES.red.text } : undefined}
            >
              <Icon className="size-5" strokeWidth={1.7} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cx(TEXT.bodyStrong, "tabular-nums")}>{formatDateTime(line.at)}</span>
                {refused && (
                  <Badge tone="red" dot>
                    {refusalLabel(line.reason)}
                  </Badge>
                )}
              </span>
              <span className={cx(TEXT.caption, "tabular-nums")}>
                {formatRelative(line.at, now || undefined)}, {line.ip ? `адреса ${line.ip}` : "адреса невідома"}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// --- the one-time password --------------------------------------------------------

// The e-mail and a generated password, each with a copy button, the
// address to sign in at, and the warning that the password is shown once.
export function OneTimePassword({ email, password, signInUrl }: { email: string; password: string; signInUrl: string }) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col divide-y divide-stroke-subtle rounded-2xl bg-bg-subtle px-4">
        <div className="flex min-w-0 flex-col gap-1 py-3">
          <dt className={TEXT.caption}>Адреса для входу</dt>
          <dd className="flex min-w-0 items-center gap-1">
            <span className={cx(TEXT.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")} data-testid="secret-url">
              {signInUrl}
            </span>
            <CopyButton text={signInUrl} label="Адреса для входу" />
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1 py-3">
          <dt className={TEXT.caption}>E-mail</dt>
          <dd className="flex min-w-0 items-center gap-1">
            <span className={cx(TEXT.bodyStrong, "min-w-0 [overflow-wrap:anywhere]")} data-testid="secret-email">
              {email}
            </span>
            <CopyButton text={email} label="E-mail" />
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1 py-3">
          <dt className={TEXT.caption}>Тимчасовий пароль</dt>
          <dd className="flex min-w-0 items-center gap-1">
            <span
              className="min-w-0 text-[18px] font-semibold leading-7 tracking-[0.04em] text-neutral-900 tabular-nums [overflow-wrap:anywhere]"
              data-testid="secret-password"
            >
              {password}
            </span>
            <CopyButton text={password} label="Пароль" />
          </dd>
        </div>
      </dl>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-[14px] leading-5 text-neutral-800 marker:text-neutral-500">
        <li>
          Людина відкриває адресу для входу і вводить свій e-mail та тимчасовий пароль. Пароль діє{" "}
          {countOf(GENERATED_PASSWORD_TTL_HOURS, HOUR_FORMS)}: пізніше він уже не відкриє акаунт, і пароль доведеться скинути ще раз.
        </li>
        <li>Панель одразу попросить задати власний пароль. До того нічого іншого відкрити не вийде.</li>
      </ol>
      <Note tone="warning">
        Пароль показано один раз і ніде не збережено у відкритому вигляді. Скопіюйте його й передайте людині зараз: після закриття
        вікна його вже не можна буде подивитися.
      </Note>
    </div>
  );
}

// The address a new member of staff signs in at (read in an event handler,
// never while rendering).
export function signInAddress(): string {
  return `${window.location.origin}/admin/login`;
}
