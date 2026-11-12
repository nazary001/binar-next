"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { FitText } from "@/components/ui/FitText";
import type { Order } from "../orders/data";
import { ROW_ICON_BUTTON } from "../orders/listParts";
import { paymentKind } from "../orders/payment";
import { useCreditLimits, useOrders } from "../orders/store";
import { useProfile } from "../profile/store";
import {
  CabinetPage,
  CabinetPageHead,
  ChevronRightIcon,
  InfoHeadIcon,
  MailIcon,
  OrderStatusBadge,
  PaymentBadge,
  PhoneIcon,
  Select,
  SignInPrompt,
  TitleLight,
  useHydrated,
} from "../ui";
import { CABINET_SECTION_TITLE } from "../ui/CabinetPageHead";
import { AttentionTileIcon, CoinIcon, PaymentChevronIcon, PersonFilledIcon, WalletIcon } from "./icons";
import {
  ALL,
  MANAGER,
  PAYMENTS_STEP,
  PAYMENTS_VISIBLE,
  counterpartyOptions,
  dueParts,
  formatDate,
  formatSum,
  kpisFor,
  ledgerCounterparties,
  paymentCaption,
  paymentsFor,
  readStoredFilter,
  recentOrders,
  storeFilter,
  type CounterpartyFilter,
  type UpcomingPayment,
} from "./data";
import {
  AllOrdersPhoneLink,
  ManagerCardPhone,
  PaymentsPhone,
  RecentOrdersPhoneEmpty,
  RecentOrdersPhoneList,
} from "./phoneParts";

// «Dashboard» — Figma 5052:32106 (1710 x 1157) inside the platform shell.
// The content surface (CabinetPage: #f5f5f5, r48 top-left, pb-40 here)
// holds:
//   title block 144 (CabinetPageHead): Light «Вітаю,» + Bold company,
//     14/24 subtitle, Button/Large outlined «Замовити акт звірки» 229 +
//     solid «Зробити замовлення» 237, gap 16;
//   body 1534 centred (36-px side gutters at 1710): left column 1013 /
//     26 gap / right column 495, scaled proportionally on narrower
//     canvases;
//   left: the «Усі контрагенти» <Select> 234 x 46 + pb-16, three KPI
//     tiles 320 x 186 (gap 26, #1d1d1f r24 p-24, 52-px #343435 icon
//     tile, 18/24 Medium label, 32/28 Bold value; the credit tile adds
//     the 6-px usage bar and «Доступно»), 40 px, then «Останні
//     замовлення» (title row 74 with Button/Small «Усі замовлення», white
//     r24 table: #343435 head row pt-8 px-24, 0.5-px #d2d2d2 dividers,
//     112-px rows with top-aligned cells);
//   right: «Найближчі платежі» (title row 60, white r24 p-24 card of
//     «Платіж» rows 447 x 114 + Button/Small «Показати ще N»), 24 px,
//     «Ваш менеджер» (title row 60, white r24 card: avatar row 108,
//     contacts row 56 between 0.5-px dividers, Button/Small row 86).

// Phones (< 640, dashboard spec 2.1 - 2.11): one column, sections 48
// apart, Title Large section titles 24 above their panels, r32 tiles and
// panels; the phone-only trees (orders / payments panels, load-more,
// manager card, empty panels) live in phoneParts.tsx next to the
// untouched desktop trees (`max-lg:hidden`).
const H2 = CABINET_SECTION_TITLE;

const COPY = {
  noLimit: "Ліміт не встановлено",
} as const;

// The master's 0.5-px #d2d2d2 dividers («Divider» 3712:17841) render in
// Figma as one #e8e8e8 pixel row. Chrome snaps background tiles to whole
// pixels, so a 0.5-px tile moves or vanishes depending on where it lands
// (and at the 0.898 canvas zoom of a 1536 window); a 1-px tile of the
// stroke at 50 % gives the same #e8 pixel at zoom 1 and never vanishes.
// It takes no layout: the boxes carrying it start on the pixel row the
// Figma render paints (the extra half pixel goes into the paddings).
// `inset` = the master's side inset of the divider.
function hairline(inset: number) {
  return `linear-gradient(color-mix(in srgb,var(--color-stroke-subtle) 50%,transparent),color-mix(in srgb,var(--color-stroke-subtle) 50%,transparent)) ${inset}px 0 / calc(100% - ${inset * 2}px) 1px no-repeat`;
}

// ------------------------------------------------------------ KPI tiles

function KpiTile({
  icon,
  label,
  value,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  children?: ReactNode;
}) {
  // 320 px wide at 1710 (272 of content); on the narrower canvases
  // (1440..1709 layout px, windows below 1197) a tile drops to ~265, so
  // under 250 px of content (a ~298 tile; container queries measure the
  // content box) the gap tightens to 16 and the value to 28 px to keep
  // «500 000 ₴» inside.
  return (
    <div className="@container flex min-w-0 flex-1 overflow-clip rounded-[32px] bg-neutral-900 p-6 lg:rounded-3xl">
      <div className="flex min-w-0 flex-1 items-start gap-4 lg:gap-6 lg:@max-[250px]:gap-4">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-white">
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:gap-8">
          {/* Phones: label 14/20 Medium #8e8e8f, 8, value Stat 30/36 that
              shrinks to fit (>= 24) instead of running into the padding. */}
          <div className="flex flex-col items-start gap-2 whitespace-nowrap text-white lg:gap-3">
            <p className="text-[14px] font-medium leading-5 tracking-normal text-neutral-400 lg:text-[18px] lg:leading-6 lg:tracking-[-0.36px] lg:text-white">
              {label}
            </p>
            <FitText
              as="p"
              min={24}
              className="text-[30px] font-bold leading-9 tracking-[-0.6px] max-lg:self-stretch lg:text-[32px] lg:leading-7 lg:tracking-[-0.64px] lg:@max-[250px]:text-[28px]"
            >
              {value}
            </FitText>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function CreditUsage({ limit, used }: { limit: number; used: number }) {
  const share = limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0;
  return (
    // Phones: the bar spans the whole tile content (-68 = icon 52 + gap
    // 16); a zero limit shows "Ліміт не встановлено" instead of an empty
    // bar and "Доступно: 0".
    <div className="flex flex-col items-start gap-3 max-lg:-ml-[68px]">
      <div
        role="progressbar"
        aria-label="Використано кредитного ліміту"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-valuetext={`${formatSum(used)} із ${formatSum(limit)}`}
        className={`h-[6px] w-full overflow-hidden rounded-lg bg-[rgba(241,241,242,0.63)]${limit === 0 ? " max-lg:hidden" : ""}`}
      >
        <div className="h-full rounded-lg bg-brand" style={{ width: `${share * 100}%` }} />
      </div>
      <p
        className={`whitespace-nowrap text-[14px] font-medium capitalize leading-5 text-neutral-400 lg:leading-6 lg:text-neutral-500${
          limit === 0 ? " max-lg:hidden" : ""
        }`}
      >
        Доступно: {formatSum(Math.max(0, limit - used))}
      </p>
      {limit === 0 && <p className="text-[14px] font-medium leading-5 text-neutral-400 lg:hidden">{COPY.noLimit}</p>}
    </div>
  );
}

// ------------------------------------------------------- Recent orders

function Head({ children, info, className = "" }: { children?: string; info?: boolean; className?: string }) {
  return (
    <th scope="col" className={`p-0 pt-2 text-left align-top font-normal ${className}`}>
      {children && (
        <span className="flex items-center gap-1 p-4">
          <span className="whitespace-nowrap text-[14px] font-semibold leading-6 text-white">{children}</span>
          {info && (
            <span className="flex items-start pl-2 pr-1">
              <InfoHeadIcon className="size-[18px] text-[#bbbbbc]" />
            </span>
          )}
        </span>
      )}
    </th>
  );
}

// «Badge / Payment Status» with its one caption line (5052:32197: chip 38
// + caption 26 = 64), or the bare chip for a cancelled order.
function PaymentCell({ order }: { order: Order }) {
  const caption = paymentCaption(order);
  return <PaymentBadge kind={paymentKind(order)} caption={caption?.text} captionTone={caption?.tone} />;
}

// Cells: px-16 py-24, top-aligned, under the row's 0.5-px divider. A row
// is 112.5 tall (0.5 divider + 112), so every second one starts on a half
// pixel; the half pixel moves into the paddings (row 1 = 24.5 / 23.5,
// row 2 = 25 / 24, row 3 = 24.5 / 24) so each row - and the hairline at
// its top - starts on the pixel row the Figma render paints (662 / 774 /
// 887) while the content keeps its master y (686.5 / 799 / 911.5).
function cellPad(i: number, last: boolean) {
  const top = i % 2 === 1 ? "pt-[25px]" : "pt-[24.5px]";
  const bottom = i % 2 === 0 && !last ? "pb-[23.5px]" : "pb-6";
  return `px-4 align-top ${top} ${bottom}`;
}

// The same paddings around the 64-px payment stack, as the row's height:
// a row whose payment cell has no caption (a cancelled order) stays as
// tall as the master's rows instead of shrinking to the 38-px chips.
function rowHeight(i: number, last: boolean) {
  return (i % 2 === 1 ? 25 : 24.5) + 64 + (i % 2 === 0 && !last ? 23.5 : 24);
}

// The master table needs its full 1013 px (the chevron ends at 992); the
// section is a size container, and a column narrower than that (the
// 640..1196-px windows, where the canvas zoom stops at 0.7 or the canvas
// is 1440 wide, and phones) shows the stacked list below instead of a
// clipped, scrolling table (literal classes: @min-[1012px]:block on the
// table, @min-[1012px]:hidden on the list).

function RecentOrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter();
  return (
    <div className="hidden overflow-x-auto rounded-3xl bg-white @min-[1012px]:block">
      <table className="w-full table-fixed border-separate border-spacing-0">
        <colgroup>
          <col className="w-6" />
          <col className="w-[180px]" />
          <col className="w-[130px]" />
          <col className="w-[160px]" />
          <col className="w-[196px]" />
          <col className="w-[244px]" />
          <col />
          <col className="w-6" />
        </colgroup>
        <thead>
          <tr className="bg-neutral-800">
            <th aria-hidden className="p-0" />
            <Head>Замовлення №</Head>
            <Head>Дата</Head>
            <Head>Сума</Head>
            <Head info>Статус замовлення</Head>
            {/* The master's «Статус замовлення» head cell is 200 over 196-px
                body cells, so this label sits 4 px right of its column. */}
            <Head info className="[&>span]:pl-5">
              Статус оплати
            </Head>
            <th className="p-0">
              <span className="sr-only">Деталі</span>
            </th>
            <th aria-hidden className="p-0" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order, i) => {
            const last = i === orders.length - 1;
            const CELL = cellPad(i, last);
            return (
              <tr
                key={order.id}
                onClick={() => router.push(`/orders/${order.id}`)}
                className="cursor-pointer"
                // The head divider is inset 15, the row dividers 16 (5052:32173 / 5052:32206).
                style={{ background: hairline(i === 0 ? 15 : 16), height: rowHeight(i, last) }}
              >
                <td aria-hidden className="p-0" />
                <td className={`${CELL} whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900`}>
                  {order.number}
                </td>
                <td className={`${CELL} whitespace-nowrap text-[16px] leading-6 text-neutral-900`}>{formatDate(order.date)}</td>
                <td className={`${CELL} whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900`}>
                  {formatSum(order.total)}
                </td>
                <td className={CELL}>
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className={CELL}>
                  <PaymentCell order={order} />
                </td>
                <td className={CELL}>
                  <Link
                    href={`/orders/${order.id}`}
                    aria-label={`Деталі замовлення №${order.number}`}
                    onClick={(e) => e.stopPropagation()}
                    className={ROW_ICON_BUTTON}
                  >
                    <ChevronRightIcon className="size-6" />
                  </Link>
                </td>
                <td aria-hidden className="p-0" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Narrow columns (no Figma frame): the same orders as a stacked list in
// the white card - number + date, sum, the two badges, the chevron - so
// nothing scrolls sideways. The link's visible text is its accessible
// name, so screen readers hear the sum and both statuses too.
function RecentOrdersList({ orders }: { orders: Order[] }) {
  return (
    <ul className="flex flex-col rounded-3xl bg-white px-4 max-lg:hidden @min-[1012px]:hidden">
      {orders.map((order, i) => (
        <li key={order.id} style={i > 0 ? { background: hairline(0) } : undefined}>
          <Link href={`/orders/${order.id}`} className="flex items-start gap-3 py-4">
            <span className="flex min-w-0 flex-1 flex-col items-start gap-3">
              <span className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900">
                  №{order.number}
                </span>
                <span className="whitespace-nowrap text-[14px] leading-6 text-neutral-500">{formatDate(order.date)}</span>
              </span>
              <span className="whitespace-nowrap text-[16px] font-semibold leading-6 text-neutral-900">
                {formatSum(order.total)}
              </span>
              <span className="flex flex-wrap items-start gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentCell order={order} />
              </span>
            </span>
            <ChevronRightIcon className="mt-0 size-6 shrink-0 text-neutral-900" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------ Payments

// «Платіж» (4949:62452): Default = white, #343435 date tile with a brand
// «до»; Протермінований = #ffe7e5, #d92d20 tile with a white «до» and the
// «Протерміновано» chip (#ffbfba / #d92d20, 4949:62517). The tile hugs
// its text (px-16: 60 / 58 / 59 px in the render).
function PaymentRow({ payment, ref }: { payment: UpcomingPayment; ref?: Ref<HTMLAnchorElement> }) {
  const { overdue } = payment;
  const { day, month } = dueParts(payment.due);
  return (
    <Link
      ref={ref}
      href={`/orders/${payment.orderId}`}
      className={`group flex items-center rounded-3xl py-4 pl-4 transition-colors duration-200 ${
        overdue ? "bg-[#ffe7e5]" : "bg-white hover:bg-bg-subtle"
      }`}
    >
      {/* Tile + text grow (the master's flex-1 column) and the chip follows;
          where the two do not fit on one line (narrow canvases, phones)
          the chip wraps under them, right-aligned, instead of covering
          the invoice number. */}
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-y-2">
        <span className="flex min-w-0 flex-[1_1_auto] items-center gap-4">
          <span
            className={`flex shrink-0 flex-col items-center gap-1 overflow-clip rounded-xl px-4 py-2 text-center ${
              overdue ? "bg-negative" : "bg-neutral-800"
            }`}
          >
            <span
              className={`w-full text-[12px] font-medium leading-3 tracking-[0.15px] ${
                overdue ? "text-white" : "text-brand"
              }`}
            >
              до
            </span>
            <span className="flex flex-col items-center whitespace-nowrap">
              <span className="mb-[-2px] text-[24px] font-semibold leading-7 tracking-[-0.48px] text-white">{day}</span>
              <span className="text-[14px] font-medium uppercase leading-6 text-white/70">{month}</span>
            </span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
            <span className="whitespace-nowrap text-[22px] font-bold leading-7 tracking-[-0.44px] text-neutral-900">
              {formatSum(payment.amount)}
            </span>
            <span className="flex flex-wrap items-center gap-x-1 text-[16px] leading-6">
              <span className="whitespace-nowrap text-neutral-500">Рахунок №</span>
              <span className="whitespace-nowrap font-medium text-neutral-900">{payment.invoice}</span>
            </span>
          </span>
        </span>
        {overdue && (
          <span className="ml-auto inline-flex h-[38px] shrink-0 items-center justify-center whitespace-nowrap rounded-[40px] bg-[#ffbfba] px-3 py-1 text-[14px] font-medium leading-[22px] text-negative">
            Протерміновано
          </span>
        )}
      </span>
      <span className="flex items-center self-stretch p-4">
        <PaymentChevronIcon className="size-6 text-neutral-900 transition-colors duration-200 group-hover:text-brand" />
      </span>
    </Link>
  );
}

function Payments({ payments }: { payments: UpcomingPayment[] }) {
  // «Показати ще 5»: each press reveals up to five more cards.
  const [count, setCount] = useState(PAYMENTS_VISIBLE);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  // The phone rows (PaymentsPhone): LoadMore focuses the first new one.
  const phoneLinks = useRef<(HTMLAnchorElement | null)[]>([]);
  // The first card a press revealed takes the focus once it is rendered,
  // so keyboard and screen-reader users stay in the list (the button
  // unmounts with the last reveal, which would drop the focus to <body>).
  const revealed = useRef<number | null>(null);
  useEffect(() => {
    const i = revealed.current;
    if (i === null) return;
    revealed.current = null;
    links.current[i]?.focus();
  }, [count]);
  const shown = payments.slice(0, count);
  const more = Math.min(PAYMENTS_STEP, payments.length - shown.length);
  return (
    <section aria-labelledby="dashboard-payments" className="flex flex-col">
      <div className="flex items-start pb-6 lg:py-4">
        <h2 id="dashboard-payments" className={H2}>
          Найближчі платежі
        </h2>
      </div>
      <div className="flex flex-col rounded-3xl bg-white p-4 max-lg:hidden lg:p-6">
        {payments.length === 0 ? (
          <p className="py-4 text-[16px] leading-6 text-neutral-500">Найближчих платежів немає.</p>
        ) : (
          <ul className="flex flex-col">
            {shown.map((p, i) => (
              <li key={p.id}>
                <PaymentRow
                  payment={p}
                  ref={(el) => {
                    links.current[i] = el;
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        {more > 0 && (
          <div className="flex justify-center">
            <Button
              size="small"
              variant="outlinedDark"
              onClick={() => {
                revealed.current = shown.length;
                setCount((c) => c + PAYMENTS_STEP);
              }}
            >
              {`Показати ще ${more}`}
            </Button>
          </div>
        )}
      </div>
      <PaymentsPhone
        payments={payments}
        shown={count}
        firstBatch={PAYMENTS_VISIBLE}
        onMore={() => setCount((c) => c + PAYMENTS_STEP)}
        onLess={() => setCount(PAYMENTS_VISIBLE)}
        links={phoneLinks}
      />
    </section>
  );
}

// ------------------------------------------------------------- Manager

function ManagerCard() {
  return (
    <section aria-labelledby="dashboard-manager" className="flex flex-col">
      <div className="flex items-start pb-6 lg:py-4">
        <h2 id="dashboard-manager" className={H2}>
          Ваш менеджер
        </h2>
      </div>
      <div className="flex flex-col rounded-3xl bg-white max-lg:hidden">
        <div className="flex items-center gap-4 p-6">
          <span className="flex size-[60px] shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
            <PersonFilledIcon className="size-11" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
            <p className="text-[18px] font-extrabold leading-6 tracking-[-0.36px] text-neutral-900">{MANAGER.name}</p>
            <p className="text-[14px] font-medium capitalize leading-6 text-neutral-500">{MANAGER.role}</p>
          </div>
        </div>
        {/* Contacts row 56 between two 0.5-px dividers inset 24 (the half
            pixels sit in pt-16.5 / pb-15.5 and the next row's pt-25). */}
        <div
          className="flex flex-wrap items-start gap-x-10 gap-y-2 px-6 pb-[15.5px] pt-[16.5px]"
          style={{ background: hairline(24) }}
        >
          <a
            href={`tel:${MANAGER.phoneHref}`}
            className="flex items-center gap-[10px] text-[14px] leading-6 text-neutral-900 transition-colors duration-200 hover:text-brand"
          >
            <PhoneIcon className="size-5 shrink-0" />
            {MANAGER.phone}
          </a>
          <a
            href={`mailto:${MANAGER.email}`}
            className="flex items-center gap-[10px] text-[14px] leading-6 text-neutral-900 transition-colors duration-200 hover:text-brand"
          >
            <MailIcon className="size-5 shrink-0" />
            {MANAGER.email}
          </a>
        </div>
        <div className="flex px-6 pb-6 pt-[25px]" style={{ background: hairline(24) }}>
          {/* Button/Small in its 14/22 size (5052:32306): px-24 py-8, 38 tall. */}
          <Button href={`mailto:${MANAGER.email}`} size="xsmall">
            Написати менеджеру
          </Button>
        </div>
      </div>
      <ManagerCardPhone />
    </section>
  );
}

// ---------------------------------------------------------------- Page

export function DashboardView() {
  const hydrated = useHydrated();
  const { user } = useAuth();
  // Restored from the tab's sessionStorage (nothing renders before
  // `hydrated`, so the server pass never depends on it).
  const [counterparty, setCounterparty] = useState<CounterpartyFilter>(readStoredFilter);
  const allOrders = useOrders();
  const creditLimits = useCreditLimits();
  const partner = user?.type === "b2b" ? user : null;
  // Orders, payments and balances are the company's own (the session
  // payload, as on /orders). The select lists the counterparties of its
  // credit lines and orders; a company with neither sees an empty cabinet
  // and the counterparties of its own "Мій профіль :: Контрагенти".
  const ledgerNames = ledgerCounterparties(allOrders, creditLimits);
  const profile = useProfile(partner && ledgerNames.length === 0 ? partner.id : null);

  // The session lives in localStorage: render nothing until the client
  // knows who is signed in, so a partner never sees the sign-in prompt
  // flash before the dashboard.
  if (!hydrated) return <div className="flex-1" />;

  // Visitors and B2C customers: the dashboard belongs to the partner cabinet.
  if (!partner) {
    return (
      <SignInPrompt
        title="Дашборд"
        text="Огляд фінансів і замовлень доступний в особистому кабінеті бізнес-клієнта."
      />
    );
  }

  const names = ledgerNames.length
    ? ledgerNames
    : [...new Set((profile?.counterparties ?? []).map((c) => c.name.trim()).filter(Boolean))];
  const options = counterpartyOptions(names);
  // A counterparty removed in the profile meanwhile falls back to «Усі».
  const filter = options.some((o) => o.value === counterparty) ? counterparty : ALL;
  const kpis = kpisFor(allOrders, filter, creditLimits);
  const orders = recentOrders(allOrders, filter);
  const payments = paymentsFor(allOrders, filter);
  const company = partner.company.name.trim();
  const reconciliation = `mailto:${MANAGER.email}?subject=${encodeURIComponent(
    `Акт звірки${company ? ` - ${company}` : ""}`,
  )}&body=${encodeURIComponent(
    `Доброго дня! Прошу надіслати акт звірки взаєморозрахунків${
      company ? ` для ${company}${partner.company.edrpou ? ` (ЄДРПОУ ${partner.company.edrpou})` : ""}` : ""
    }.`,
  )}`;

  return (
    <CabinetPage className="lg:pb-10">
      <CabinetPageHead
        title={
          company ? (
            <>
              {/* Phones: the company on its own line(s) under "Вітаю,",
                  clamped to two; desktop: the same inline run as before. */}
              <TitleLight>Вітаю,</TitleLight> <span className="max-lg:line-clamp-2">{company}</span>
            </>
          ) : (
            <TitleLight>Вітаю!</TitleLight>
          )
        }
        subtitle="Огляд фінансів та останньої активності компанії"
        actions={
          <>
            <Button href={reconciliation} variant="outlinedDark" size="responsive">
              Замовити акт звірки
            </Button>
            <Button href="/catalog" size="responsive">
              Зробити замовлення
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-12 px-6 lg:grid lg:grid-cols-[minmax(0,1013fr)_minmax(0,495fr)] lg:items-start lg:gap-[26px] lg:px-9">
        <div className="flex min-w-0 flex-col gap-12 lg:gap-10">
          <div className="flex flex-col">
            {/* Phones: shown only with something to choose (2+ counterparties),
                white on the slab. */}
            <div className={`${names.length < 2 ? "max-lg:hidden " : ""}pb-4`}>
              <Select
                label="Контрагент"
                value={filter}
                options={options}
                onChange={(v) => {
                  setCounterparty(v);
                  storeFilter(v);
                }}
                className="w-full lg:w-[234px] max-lg:[&>button]:bg-white"
              />
            </div>
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-[26px]">
              <KpiTile icon={<WalletIcon className="size-6" />} label="Поточний баланс" value={formatSum(kpis.balance)} />
              <KpiTile icon={<AttentionTileIcon className="size-7" />} label="Прострочена ДЗ" value={formatSum(kpis.overdue)} />
              <KpiTile icon={<CoinIcon className="size-6" />} label="Кредитний ліміт" value={formatSum(kpis.creditLimit)}>
                <CreditUsage limit={kpis.creditLimit} used={kpis.creditUsed} />
              </KpiTile>
            </div>
          </div>

          <section aria-labelledby="dashboard-orders" className="@container flex min-w-0 flex-col">
            <div className="flex items-center justify-between gap-4 pb-6 lg:py-4">
              <h2 id="dashboard-orders" className={H2}>
                Останні замовлення
              </h2>
              <Button href="/orders" size="small" variant="outlinedDark" className="max-lg:hidden">
                Усі замовлення
              </Button>
            </div>
            {orders.length === 0 ? (
              <>
                <p className="rounded-3xl bg-white px-6 py-10 text-[16px] leading-6 text-neutral-500 max-lg:hidden">
                  {filter === ALL ? "Замовлень ще немає." : "Замовлень цього контрагента ще немає."}
                </p>
                <RecentOrdersPhoneEmpty filtered={filter !== ALL} />
              </>
            ) : (
              <>
                <RecentOrdersTable orders={orders} />
                <RecentOrdersList orders={orders} />
                <RecentOrdersPhoneList orders={orders} />
                <AllOrdersPhoneLink />
              </>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-12 lg:gap-6">
          {/* Remount per counterparty so «Показати ще» collapses again. */}
          <Payments key={filter} payments={payments} />
          <ManagerCard />
        </div>
      </div>
    </CabinetPage>
  );
}
