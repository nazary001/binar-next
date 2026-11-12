"use client";

import { ArrowDownTrayIcon, ChevronDownIcon, PrinterIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { cx, formatNumber } from "../../lib/format";
import { useAdminQuery } from "../../lib/query";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { CopyButton, KeyValueList } from "../../ui/KeyValue";
import { PageSection } from "../../ui/Page";
import { Skeleton, SkeletonText } from "../../ui/Skeleton";
import { ErrorState } from "../../ui/States";
import { COLOR_TRANSITION, FOCUS_RING_INSET, SURFACE, TEXT, type Tone } from "../../ui/tokens";
import { BAS_ACCEPT_FLAGS, BAS_LIMITS, type BasSpecAnswer, type BasSpecEndpoint, type BasSpecPush } from "../types";
import { basTabHref } from "./links";

// "Для розробника BAS": the contract of the machine API, rendered from
// GET /api/admin/integrations/bas/spec, for the customer to hand to the
// developer who sets up the exchange on the BAS side. Everything is on the
// page: the address, the header, the rules, every endpoint with example
// bodies and answers, what the site posts to BAS in the push mode, the
// error codes and 1C code samples. It prints as a document (the panel's
// chrome is hidden on paper, every block is open) and downloads as JSON.

const METHOD_TONE: Record<BasSpecEndpoint["method"], Tone> = { GET: "blue", PUT: "indigo", POST: "green" };

const FLAG_LABEL = Object.fromEntries(BAS_ACCEPT_FLAGS.map((flag) => [flag.key, flag.label]));

// The site's own address, known only in the browser (empty on the server
// pass, so the first paint and hydration agree).
const noSubscribe = () => () => {};
function useOrigin(): string {
  return useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function CodeBlock({ code, label, language = "json" }: { code: string; label: string; language?: "json" | "bsl" | "http" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className={TEXT.label}>{label}</span>
        <span className="print:hidden">
          <CopyButton text={code} label={label} />
        </span>
      </div>
      <pre
        data-language={language}
        className="admin-scroll max-h-[420px] min-w-0 overflow-auto rounded-2xl bg-neutral-900 p-4 font-mono text-[12.5px] leading-5 text-neutral-100 print:max-h-none print:overflow-visible print:whitespace-pre-wrap print:break-words print:border print:border-neutral-300 print:bg-white print:text-neutral-900"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointBlock({ endpoint, base }: { endpoint: BasSpecEndpoint; base: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const flag = endpoint.acceptFlag ? FLAG_LABEL[endpoint.acceptFlag] : null;
  return (
    <section className={cx(SURFACE.card, "min-w-0 overflow-hidden print:break-inside-avoid-page print:rounded-none print:border-t print:border-neutral-300")}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={cx(
            "flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left hover:bg-bg-subtle min-[1024px]:px-6 print:px-0",
            COLOR_TRANSITION,
            FOCUS_RING_INSET,
          )}
        >
          <Badge tone={METHOD_TONE[endpoint.method]} size="md" className="w-[60px] justify-center font-semibold">
            {endpoint.method}
          </Badge>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 min-[1024px]:flex-row min-[1024px]:items-baseline min-[1024px]:gap-3">
            <span className="font-mono text-[14px] font-semibold leading-5 text-neutral-900 [overflow-wrap:anywhere]">{endpoint.path}</span>
            <span className={cx(TEXT.muted, "truncate")}>{endpoint.title}</span>
          </span>
          <ChevronDownIcon
            aria-hidden
            className={cx("size-5 shrink-0 text-neutral-500 transition-[rotate] duration-200 motion-reduce:transition-none print:hidden", open && "rotate-180")}
          />
        </button>
      </h3>
      <div id={panelId} className={cx("border-t border-stroke-subtle px-5 pb-6 pt-5 min-[1024px]:px-6 print:block print:px-0", open ? "block" : "hidden")}>
        <div className="flex flex-col gap-5">
          <p className={cx(TEXT.body, "max-w-[820px] text-neutral-800")}>{endpoint.description}</p>
          <div className="flex min-w-0 items-center gap-2 rounded-xl bg-bg-subtle py-1.5 pl-4 pr-1.5 print:px-0">
            <span className="min-w-0 flex-1 break-all font-mono text-[13px] leading-5 text-neutral-900">
              <span className="font-semibold">{endpoint.method}</span> {`${base}${endpoint.path}`}
            </span>
            <span className="print:hidden">
              <CopyButton text={`${base}${endpoint.path}`} label={`адреса ${endpoint.path}`} />
            </span>
          </div>
          <KeyValueList
            columns={2}
            dense
            items={[
              { label: "Дозвіл ключа", value: endpoint.scopes.join(" або ") },
              { label: "Налаштування в панелі", value: flag ? `«${flag}» має бути увімкнено` : "Лише головний перемикач обміну" },
            ]}
          />
          {endpoint.query.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className={TEXT.label}>Параметри адреси</span>
              <ul className="flex flex-col divide-y divide-stroke-subtle rounded-2xl bg-bg-subtle px-4">
                {endpoint.query.map((param) => (
                  <li key={param.name} className="flex flex-col gap-0.5 py-2.5 min-[640px]:flex-row min-[640px]:gap-4">
                    <span className="w-28 shrink-0 font-mono text-[13px] font-semibold leading-5">{param.name}</span>
                    <span className={cx(TEXT.body, "text-neutral-700")}>{param.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {endpoint.notes.length > 0 && (
            <ul className={cx(TEXT.body, "flex list-disc flex-col gap-1.5 pl-5 text-neutral-700 marker:text-neutral-400")}>
              {endpoint.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2 print:grid-cols-1">
            {endpoint.request !== null && <CodeBlock label="Приклад запиту" code={json(endpoint.request)} />}
            <CodeBlock label="Приклад відповіді" code={json(endpoint.response)} />
          </div>
        </div>
      </div>
    </section>
  );
}

// The push mode, the other way round: the site calls BAS.
function PushSection({ push }: { push: BasSpecPush }) {
  return (
    <PageSection
      title="Режим надсилання: що сайт надсилає в BAS"
      description="Лише коли в налаштуваннях обміну обрано «Сайт ще й надсилає замовлення». Тут не BAS звертається до сайту, а сайт - до адреси BAS."
    >
      <Card className="print:break-inside-avoid-page">
        <div className="flex min-w-0 flex-col gap-5">
          <p className={cx(TEXT.body, "max-w-[820px] text-neutral-800")}>{push.description}</p>
          <div className="flex min-w-0 items-center gap-2 rounded-xl bg-bg-subtle px-4 py-2.5 print:px-0">
            <span className="min-w-0 flex-1 break-all font-mono text-[13px] leading-5 text-neutral-900">
              <span className="font-semibold">POST</span> {"<адреса з налаштувань обміну>"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className={TEXT.label}>Заголовки запиту</span>
            <ul className="flex flex-col divide-y divide-stroke-subtle rounded-2xl bg-bg-subtle px-4">
              {push.headers.map((header) => (
                <li key={header.name} className="flex flex-col gap-0.5 py-2.5 min-[640px]:flex-row min-[640px]:gap-4">
                  <span className="shrink-0 font-mono text-[13px] font-semibold leading-5 min-[640px]:w-36">{header.name}</span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-mono text-[13px] leading-5 text-neutral-900 [overflow-wrap:anywhere]">{header.value}</span>
                    <span className={cx(TEXT.body, "text-neutral-700")}>{header.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <span className={TEXT.label}>Відповідь і повтори</span>
            <ul className={cx(TEXT.body, "flex list-disc flex-col gap-1.5 pl-5 text-neutral-700 marker:text-neutral-400")}>
              {push.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-2 print:grid-cols-1">
            {push.examples.map((example) => (
              <CodeBlock key={example.label} label={example.label} code={json(example.body)} />
            ))}
          </div>
        </div>
      </Card>
    </PageSection>
  );
}

function download(spec: BasSpecAnswer, base: string) {
  const { ok: _ok, ...contract }: BasSpecAnswer = spec;
  void _ok;
  const blob = new Blob([JSON.stringify({ site: base.replace(/\/api\/.*$/, ""), baseUrl: base, ...contract }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `binar-bas-api-${spec.version}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// While the tab is open, paper shows the document only: the side menu and
// the top bar of the panel are hidden (they are not this screen's to
// style otherwise), and the grey slab turns white.
const PRINT_CSS =
  "@media print{[data-admin] aside,[data-admin] header.sticky,[data-bas-docs] dd button{display:none!important}[data-admin] main{background:#fff!important;border-radius:0!important}html,body{background:#fff!important}}";

export function BasDocsTab() {
  const answer = useAdminQuery<BasSpecAnswer>("/integrations/bas/spec");
  const origin = useOrigin();
  const spec = answer.data;

  if (answer.error && !spec) {
    return (
      <Card>
        <ErrorState failure={answer.error} onRetry={answer.reload} />
      </Card>
    );
  }
  if (!spec) {
    return (
      <div className="flex flex-col gap-4" data-loading="true">
        <Card>
          <Skeleton className="h-6 w-72" />
          <SkeletonText lines={3} className="mt-4" />
        </Card>
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} shape="card" className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const base = `${origin || "https://<адреса сайту>"}${spec.basePath}`;

  return (
    <div data-bas-docs="" className="flex min-w-0 flex-col gap-6 print:gap-4">
      <style>{PRINT_CSS}</style>
      <h1 className="hidden text-[24px] font-bold leading-8 print:block">Binar 2000: обмін з BAS, опис API {spec.version}</h1>

      <Card tone="dark" padding="lg" className="print:hidden">
        <div className="flex flex-col gap-5 min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:justify-between">
          <div className="min-w-0 max-w-[720px]">
            <h2 className="text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-white">Опис обміну для розробника BAS</h2>
            <p className="mt-2 text-[14px] leading-5 text-neutral-300">
              Передайте цю сторінку розробнику, який налаштовує обмін у BAS: тут адреса, авторизація, правила, кожен метод з
              прикладами і зразок коду для 1С. Ключ доступу передайте окремо: його створюють на вкладці «Ключі доступу».
            </p>
          </div>
          <div className="flex flex-wrap gap-2 min-[1024px]:shrink-0">
            <Button variant="accent" iconLeft={ArrowDownTrayIcon} onClick={() => download(spec, base)}>
              Завантажити опис (JSON)
            </Button>
            <Button variant="secondary" iconLeft={PrinterIcon} onClick={() => window.print()}>
              Надрукувати
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2 print:grid-cols-1">
        <Card title="Підключення">
          <KeyValueList
            items={[
              { label: "Адреса API", value: <span className="font-mono text-[13px]">{base}</span>, copy: base },
              { label: "Авторизація (заголовок кожного запиту)", value: <span className="font-mono text-[13px]">{spec.auth}</span>, copy: spec.auth },
              { label: "Формат", value: "JSON у UTF-8, заголовок Content-Type: application/json" },
              {
                label: "Ключ доступу",
                value: (
                  <>
                    Створюється в панелі на вкладці{" "}
                    <Link href={basTabHref("keys")} className="font-semibold underline underline-offset-4 print:no-underline">
                      «Ключі доступу»
                    </Link>{" "}
                    і показується один раз.
                  </>
                ),
              },
              { label: "Версія", value: spec.version },
            ]}
          />
        </Card>
        <Card title="Обмеження">
          <KeyValueList
            items={[
              { label: "Елементів у пакеті", value: `до ${formatNumber(BAS_LIMITS.items)}` },
              { label: "Документів за один виклик", value: `до ${formatNumber(BAS_LIMITS.documents)}, кожен PDF до 3 МБ` },
              { label: "Розмір тіла запиту", value: "до 4 МБ" },
              { label: "Записів черги за один запит", value: `до ${formatNumber(BAS_LIMITS.pullLimit)}` },
              { label: "Викликів одного ключа", value: `до ${formatNumber(BAS_LIMITS.callsPerMinute)} на хвилину` },
              { label: "Повтор того самого batchId", value: `відповідь зберігається ${formatNumber(BAS_LIMITS.batchDays)} днів` },
            ]}
          />
        </Card>
      </div>

      <Card title="Загальні правила">
        <ol className={cx(TEXT.body, "flex list-decimal flex-col gap-2.5 pl-5 text-neutral-800 marker:font-semibold marker:text-neutral-400")}>
          {spec.conventions.map((rule) => (
            <li key={rule} className="pl-1">
              {rule}
            </li>
          ))}
        </ol>
      </Card>

      <PageSection
        title="Методи"
        description={`${formatNumber(spec.endpoints.length)} методів: що BAS надсилає на сайт і що забирає. Натисніть метод, щоб побачити приклади.`}
      >
        <div className="flex min-w-0 flex-col gap-3">
          {spec.endpoints.map((endpoint) => (
            <EndpointBlock key={endpoint.id} endpoint={endpoint} base={base} />
          ))}
        </div>
      </PageSection>

      {spec.push && <PushSection push={spec.push} />}

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-2 print:grid-cols-1">
        <Card title="Коди відповідей з помилкою" padding="none">
          <ul className="flex flex-col divide-y divide-stroke-subtle px-5 pb-5 min-[1024px]:px-6">
            {spec.errors.map((error) => (
              <li key={`${error.status}-${error.code}`} className="flex flex-col gap-0.5 py-3 first:pt-0 min-[640px]:flex-row min-[640px]:gap-4">
                <span className="shrink-0 whitespace-nowrap font-mono text-[13px] font-semibold leading-5 tabular-nums min-[640px]:w-44">
                  {error.status} {error.code}
                </span>
                <span className={cx(TEXT.body, "text-neutral-700")}>{error.meaning}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Статуси замовлень" subtitle="Як статус з BAS стає статусом на сайті." padding="none">
          <ul className="flex flex-col divide-y divide-stroke-subtle px-5 pb-5 min-[1024px]:px-6">
            {spec.statusMap.map((row) => (
              <li key={row.bas} className="flex items-center gap-4 py-3 first:pt-0">
                <span className="w-36 shrink-0 font-mono text-[13px] font-semibold leading-5 min-[640px]:w-44">{row.bas}</span>
                <span className={cx(TEXT.body, "text-neutral-700")}>{row.label}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <PageSection
        title="Зразок коду для BAS (1С)"
        description="Готові процедури, з яких можна почати: запит до сайту, надсилання товарів, отримання черги і прийом замовлень у режимі надсилання."
      >
        <div className="flex min-w-0 flex-col gap-4">
          {spec.codeSamples.map((sample) => (
            <Card key={sample.title} title={sample.title} className="print:break-inside-avoid-page">
              <CodeBlock label="Код 1С" language="bsl" code={sample.code} />
            </Card>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
