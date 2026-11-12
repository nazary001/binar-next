import "server-only";
import type { ZodType } from "zod";
import {
  BAS_API_BASE,
  BAS_API_VERSION,
  BAS_LIMITS,
  type BasAckAnswer,
  type BasOrderPacket,
  type BasPullAnswer,
  type BasPushAnswer,
  type BasReturnPacket,
  type BasSpecDto,
  type BasSpecEndpoint,
} from "@/components/admin/integrations/types";
import {
  AckEnvelope,
  BatchEnvelope,
  ClientItem,
  DocumentItem,
  DocumentsEnvelope,
  LedgerEnvelope,
  LedgerItem,
  OrderAckItem,
  OrderStatusItem,
  PriceItem,
  PriceTypeItem,
  ProductItem,
  PullQuery,
  ReturnAckItem,
  StockItem,
  describeIssues,
} from "./contract";

// The contract of the machine API as data: the documentation page of the
// panel (GET /api/admin/integrations/bas/spec) renders it for the BAS
// developer. The examples are parsed by validateSpecExamples() with the
// very schemas the routes use (audit/admin/checks/bas-db.ts runs it), so
// the page cannot show a body the API would refuse.
// No next/* import: the tsx check reads this file.

const G = {
  client: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a01",
  counterparty: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a02",
  contract: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a03",
  product: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a04",
  pack: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a05",
  group: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a06",
  priceBase: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a07",
  pricePartner: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a08",
  order: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a09",
  invoice: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a10",
  ledger1: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a11",
  ledger2: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a12",
  ret: "6b1f3c2a-8d4e-11ef-9a6b-0050569c1a13",
} as const;

const BATCH = "0f8e2d4c-1b3a-4c5d-8e9f-a0b1c2d3e4f5";

function pushAnswer(results: BasPushAnswer["results"]): BasPushAnswer {
  const counts = { received: results.length, created: 0, updated: 0, unchanged: 0, failed: 0 };
  for (const row of results) {
    if (row.status === "error") counts.failed += 1;
    else counts[row.status] += 1;
  }
  return { ok: true, batchId: BATCH, results, counts };
}

const ORDER_PACKET: BasOrderPacket = {
  seq: 121,
  orderId: "48291065",
  number: "48291065",
  channel: "b2b",
  createdAt: "2026-11-12T08:15:30.000Z",
  date: "2026-11-12",
  status: "new",
  client: { externalId: G.client, name: "Мережа готелів «Зоряний шлях»" },
  counterparty: { externalId: G.counterparty, name: 'ТОВ "Зоряний шлях"', edrpou: "12345678" },
  contract: { externalId: G.contract, number: "Д-17/2026" },
  buyer: { userId: "8a6e0e8e-4f8c-4b1e-9d1e-3c2b1a0f9e8d", name: "Марина Левченко", email: "buyer@example.com", phone: "0671234567" },
  items: [
    {
      sku: "УН-00005301",
      productExternalId: G.product,
      name: "Шампунь для волосся і тіла, 40мл, Botanica",
      quantity: 240,
      unitCode: "PACK12",
      coefficient: 12,
      price: 28.99,
      sum: 6957.6,
    },
  ],
  total: 6957.6,
  delivery: {
    method: "np-branch",
    methodName: "Нова Пошта (Самовивіз)",
    city: "Київ",
    address: "Відділення №12",
    ttn: null,
  },
  payment: { method: "Безготівковий розрахунок" },
  comment: "Доставити до 20.11",
  warnings: [
    "Прострочена заборгованість за договором Д-17/2026: 1500.00 грн, найстаріший борг 12 дн.",
    "Замовлення разом із поточним боргом перевищує кредитний ліміт договору Д-17/2026 на 2457.60 грн",
  ],
};

const RETURN_PACKET: BasReturnPacket = {
  seq: 122,
  returnId: "1029",
  orderId: "48291037",
  orderNumber: "48291037",
  orderExternalId: G.order,
  createdAt: "2026-11-12T09:00:00.000Z",
  date: "2026-11-12",
  status: "created",
  client: { externalId: G.client, name: "Мережа готелів «Зоряний шлях»" },
  buyer: { userId: "8a6e0e8e-4f8c-4b1e-9d1e-3c2b1a0f9e8d", name: "Марина Левченко", email: "buyer@example.com", phone: "0671234567" },
  lines: [
    {
      itemId: "shampoo-1-1",
      sku: "УН-00005301",
      productExternalId: G.product,
      name: "Шампунь для волосся і тіла, 40мл, Botanica",
      quantity: 12,
      unitCode: "PACK12",
      coefficient: 12,
      price: 28.99,
      sum: 347.88,
      reason: "Брак",
    },
  ],
  total: 347.88,
  solution: "Кредит-нота на баланс",
  delivery: "Відправити поштою (Нова Пошта)",
};

const ackAnswer = (ids: string[]): BasAckAnswer => ({
  ok: true,
  results: ids.map((id) => ({ id, status: "acked" as const })),
  counts: { received: ids.length, created: 0, updated: ids.length, unchanged: 0, failed: 0 },
});

type Check = { envelope: ZodType<unknown>; item?: ZodType<unknown> } | { query: ZodType<unknown> };

type Definition = BasSpecEndpoint & { check?: Check; queryExample?: Record<string, string> };

const DEFINITIONS: Definition[] = [
  {
    id: "ping",
    method: "GET",
    path: "/ping",
    scopes: ["bas:read", "bas:write"],
    acceptFlag: null,
    title: "Перевірка зв'язку",
    description: "Перевіряє ключ і показує час сервера, версію API та чи увімкнено обмін. Працює й тоді, коли обмін вимкнено.",
    query: [],
    request: null,
    response: { ok: true, time: "2026-11-12T08:00:00.000Z", version: BAS_API_VERSION, enabled: true },
    notes: [],
  },
  {
    id: "price-types",
    method: "PUT",
    path: "/price-types",
    scopes: ["bas:write"],
    acceptFlag: "acceptPrices",
    title: "Типи цін",
    description:
      "Довідник типів цін. Призначення типу на сайті (базова ціна для гостей, індивідуальна для партнерів) задають у панелі, а не в BAS.",
    query: [],
    request: {
      batchId: BATCH,
      items: [
        { externalId: G.priceBase, name: "Роздрібна", currency: "UAH", vatIncluded: true },
        { externalId: G.pricePartner, name: "Оптова", currency: "UAH", vatIncluded: true },
      ],
    },
    response: pushAnswer([
      { externalId: G.priceBase, status: "unchanged" },
      { externalId: G.pricePartner, status: "created" },
    ]),
    notes: [],
    check: { envelope: BatchEnvelope, item: PriceTypeItem },
  },
  {
    id: "products",
    method: "PUT",
    path: "/products",
    scopes: ["bas:write"],
    acceptFlag: "acceptProducts",
    title: "Товари",
    description:
      "Номенклатура з одиницями та упаковками. Товар шукається за externalId, а якщо його ще немає, то за артикулом (sku), і тоді externalId прив'язується. В існуючого товару оновлюються лише облікові поля; назва, фото, опис і категорія лишаються сайтові. Новий товар створюється прихованим і недоступним, з назвою як заголовком, у категорії, зіставленій з групою (groupExternalId) у налаштуваннях каталогу.",
    query: [],
    request: {
      batchId: BATCH,
      mode: "delta",
      items: [
        {
          externalId: G.product,
          sku: "УН-00005301",
          name: "Шампунь для волосся і тіла 40 мл Botanica",
          barcode: "4820000000017",
          unit: { code: "796", name: "шт" },
          packages: [
            { unitCode: "796", name: "шт", coefficient: 1 },
            { externalId: G.pack, unitCode: "PACK12", name: "уп. 12 шт", coefficient: 12, isDefault: true },
          ],
          multiplicity: 12,
          groupExternalId: G.group,
          brand: "Botanica",
          manufacturer: "Binar 2000",
          country: "Україна",
          isCustomizable: true,
          minCustomQty: 5000,
          leadTimeDays: 3,
          deleted: false,
        },
      ],
    },
    response: pushAnswer([{ externalId: G.product, status: "updated" }]),
    notes: [
      "Поля, яких немає в елементі, не змінюються.",
      "Список packages щоразу надсилається цілим; рівно одна упаковка стає основною (isDefault, інакше перша).",
      "deleted: true знімає товар з продажу (архів) і ховає його з каталогу.",
    ],
    check: { envelope: BatchEnvelope, item: ProductItem },
  },
  {
    id: "prices",
    method: "PUT",
    path: "/prices",
    scopes: ["bas:write"],
    acceptFlag: "acceptPrices",
    title: "Ціни",
    description:
      "Ціна товару за типом ціни, у гривнях. Ціна базового типу стає ціною на сайті (а під час акції - звичайною ціною, від якої рахується знижка).",
    query: [],
    request: {
      batchId: BATCH,
      items: [
        { productExternalId: G.product, priceTypeExternalId: G.priceBase, price: "31.65", currency: "UAH" },
        { sku: "УН-00005301", priceTypeExternalId: G.pricePartner, price: 28.99 },
      ],
    },
    response: pushAnswer([
      { externalId: `${G.product}:${G.priceBase}`, status: "updated" },
      { externalId: `УН-00005301:${G.pricePartner}`, status: "created" },
    ]),
    notes: ["externalId рядка відповіді: <productExternalId або sku>:<priceTypeExternalId>."],
    check: { envelope: BatchEnvelope, item: PriceItem },
  },
  {
    id: "stock",
    method: "PUT",
    path: "/stock",
    scopes: ["bas:write"],
    acceptFlag: "acceptStock",
    title: "Залишки",
    description:
      "Вільний залишок у базових одиницях і термін постачання. Якщо в налаштуваннях увімкнено «залишок визначає наявність», товар із залишком 0 стає недоступним.",
    query: [],
    request: {
      batchId: BATCH,
      items: [
        { productExternalId: G.product, qty: 1440, leadTimeDays: 2 },
        { sku: "УН-00005302", qty: 0, expectedDate: "2026-11-20" },
      ],
    },
    response: pushAnswer([
      { externalId: G.product, status: "updated" },
      { externalId: "УН-00005302", status: "unchanged" },
    ]),
    notes: [
      "expectedDate зберігається як дата очікуваного надходження; null її прибирає.",
      "Без leadTimeDays днів до expectedDate стають терміном постачання.",
    ],
    check: { envelope: BatchEnvelope, item: StockItem },
  },
  {
    id: "clients",
    method: "PUT",
    path: "/clients",
    scopes: ["bas:write"],
    acceptFlag: "acceptClients",
    title: "Клієнти, контрагенти, договори",
    description:
      "Ієрархія B2B: клієнт (холдинг) -> контрагенти (юрособи з ЄДРПОУ) -> договори зі знижкою, кредитним лімітом і боргом. Після кожного клієнта сайт перераховує кредитні ліміти за контрагентами і знижку компанії (знижка першого діючого договору).",
    query: [],
    request: {
      batchId: BATCH,
      mode: "full",
      items: [
        {
          externalId: G.client,
          name: "Мережа готелів «Зоряний шлях»",
          edrpou: "12345678",
          region: "Київська",
          city: "Київ",
          isActive: true,
          counterparties: [
            {
              externalId: G.counterparty,
              name: 'ТОВ "Зоряний шлях"',
              edrpou: "12345678",
              signatory: "Олена Коваль",
              isActive: true,
              contracts: [
                {
                  externalId: G.contract,
                  number: "Д-17/2026",
                  date: "2026-01-15",
                  discountPercent: 8.4,
                  creditLimit: "200000.00",
                  currentDebt: "35400.00",
                  overdueDebt: "0",
                  oldestDebtDays: 0,
                  paymentTerms: "deferred",
                  paymentDays: 60,
                  priceTypeExternalId: G.pricePartner,
                  isActive: true,
                },
              ],
            },
          ],
        },
      ],
    },
    response: pushAnswer([{ externalId: G.client, status: "created" }]),
    notes: [
      'mode: "full": контрагенти та договори з externalId, яких немає в елементі, вимикаються. Без нього (delta) вони лишаються як є.',
      "Контрагенти й договори, додані на сайті без externalId, BAS не змінює.",
    ],
    check: { envelope: BatchEnvelope, item: ClientItem },
  },
  {
    id: "ledger",
    method: "PUT",
    path: "/ledger",
    scopes: ["bas:write"],
    acceptFlag: "acceptLedger",
    title: "Взаєморозрахунки",
    description:
      "Рядки акту звірки за одним договором: залишок на початок, замовлення, рахунки, оплати, повернення; plus збільшує борг, minus зменшує. replace: true спершу прибирає записи договору від дати from, яких немає в пакеті.",
    query: [],
    request: {
      batchId: BATCH,
      contractExternalId: G.contract,
      from: "2026-01-01",
      replace: true,
      items: [
        {
          externalId: G.ledger1,
          docType: "opening_balance",
          docNumber: "ЗП-2026",
          docDate: "2026-01-01",
          amount: "35400.00",
          impact: "plus",
        },
        {
          externalId: G.ledger2,
          docType: "invoice",
          docNumber: "РН-000123",
          docDate: "2026-11-12T10:00:00",
          amount: 6957.6,
          impact: "plus",
          orderNumber: "48291065",
        },
      ],
    },
    response: pushAnswer([
      { externalId: G.ledger1, status: "unchanged" },
      { externalId: G.ledger2, status: "created" },
    ]),
    notes: ["Невідомий договір: відповідь 404, пакет не запам'ятовується (спершу надішліть клієнтів, потім повторіть)."],
    check: { envelope: LedgerEnvelope, item: LedgerItem },
  },
  {
    id: "order-statuses",
    method: "PUT",
    path: "/orders/statuses",
    scopes: ["bas:write"],
    acceptFlag: "acceptOrderStatuses",
    title: "Статуси замовлень",
    description:
      "Що сталося із замовленням у BAS: статус, оплата, номер документа, ТТН. Замовлення шукається за номером сайту (orderNumber) або за GUID документа в BAS (orderExternalId). Кожна зміна з'являється в історії замовлення.",
    query: [],
    request: {
      batchId: BATCH,
      items: [
        {
          orderNumber: "48291065",
          status: "in_progress",
          number: "ЗП-000777",
          externalId: G.order,
          payment: { state: "partial", paid: "3000.00" },
          comment: "Комплектується на складі",
        },
        { orderExternalId: G.order, status: "shipped", ttn: "20450000000000", expectedDate: "2026-11-14" },
      ],
    },
    response: pushAnswer([
      { externalId: "48291065", status: "updated" },
      { externalId: G.order, status: "updated" },
    ]),
    notes: ["payment.state: awaiting | partial (з paid) | paid | overdue (дні рахуються від терміну оплати)."],
    check: { envelope: BatchEnvelope, item: OrderStatusItem },
  },
  {
    id: "documents",
    method: "PUT",
    path: "/documents",
    scopes: ["bas:write"],
    acceptFlag: "acceptDocuments",
    title: "Документи",
    description: `Друковані форми до замовлень сайту (партнерських і роздрібних) у PDF (base64). До ${BAS_LIMITS.documents} документів за раз, кожен до 3 МБ після декодування; файл має бути справжнім PDF. Той самий externalId замінює попередній файл того самого документа.`,
    query: [],
    request: {
      batchId: BATCH,
      items: [
        {
          orderNumber: "48291065",
          externalId: G.invoice,
          type: "invoice",
          title: "Рахунок на оплату №РН-000123",
          date: "2026-11-12",
          pdf: { base64: "JVBERi0xLjQKJSBleGFtcGxlCg==" },
        },
      ],
    },
    response: pushAnswer([{ externalId: G.invoice, status: "created" }]),
    notes: ["type: invoice | waybill | act | reconciliation | other.", "Тіло запиту разом не більше 4 МБ: великі файли надсилайте по одному."],
    check: { envelope: DocumentsEnvelope, item: DocumentItem },
  },
  {
    id: "orders-pull",
    method: "GET",
    path: "/orders",
    scopes: ["bas:read"],
    acceptFlag: null,
    title: "Черга нових замовлень",
    description:
      "Замовлення, які BAS ще не підтвердив, у порядку seq. Запис лишається в черзі, доки не прийде підтвердження, тож невдале отримання просто повторюють. Для наступного запиту передайте nextAfter як after.",
    query: [
      { name: "after", description: "seq останнього обробленого запису (0 - з початку)" },
      { name: "limit", description: `скільки записів повернути, 1..${BAS_LIMITS.pullLimit}` },
    ],
    request: null,
    response: { ok: true, items: [ORDER_PACKET], nextAfter: 121 } satisfies BasPullAnswer<BasOrderPacket>,
    notes: [
      "unitCode і coefficient - упаковка рядка: кількість у базових одиницях = quantity * coefficient.",
      "contract - договір, за яким оформлено замовлення; якщо замовлення договору не називає, це перший діючий договір контрагента.",
      "warnings - попередження вимоги: прострочений борг і перевищення кредитного ліміту за цим договором.",
    ],
    check: { query: PullQuery },
    queryExample: { after: "120", limit: "100" },
  },
  {
    id: "orders-ack",
    method: "POST",
    path: "/orders/ack",
    scopes: ["bas:write"],
    acceptFlag: null,
    title: "Підтвердження замовлень",
    description:
      "BAS прийняв замовлення: його GUID і номер у BAS. З error запис позначається як помилковий і більше не видається, доки його не повернуть у чергу в панелі. Повторне підтвердження нічого не змінює.",
    query: [],
    request: {
      items: [
        { orderId: "48291065", externalId: G.order, number: "ЗП-000777" },
        { orderId: "BN-100012", error: "Не знайдено контрагента" },
      ],
    },
    response: {
      ok: true,
      results: [
        { id: "48291065", status: "acked" },
        { id: "BN-100012", status: "error", error: "recorded: the entry is marked as failed" },
      ],
      counts: { received: 2, created: 0, updated: 1, unchanged: 0, failed: 1 },
    } satisfies BasAckAnswer,
    notes: [],
    check: { envelope: AckEnvelope, item: OrderAckItem },
  },
  {
    id: "returns-pull",
    method: "GET",
    path: "/returns",
    scopes: ["bas:read"],
    acceptFlag: null,
    title: "Черга заявок на повернення",
    description: "Так само, як черга замовлень: заявки партнерів на повернення товару.",
    query: [
      { name: "after", description: "seq останнього обробленого запису" },
      { name: "limit", description: `1..${BAS_LIMITS.pullLimit}` },
    ],
    request: null,
    response: { ok: true, items: [RETURN_PACKET], nextAfter: 122 } satisfies BasPullAnswer<BasReturnPacket>,
    notes: [],
    check: { query: PullQuery },
    queryExample: { after: "0", limit: "50" },
  },
  {
    id: "returns-ack",
    method: "POST",
    path: "/returns/ack",
    scopes: ["bas:write"],
    acceptFlag: null,
    title: "Підтвердження повернень",
    description: "BAS прийняв заявку на повернення (або не зміг: error).",
    query: [],
    request: { items: [{ returnId: "1029", externalId: G.ret, number: "ПВ-000045" }] },
    response: ackAnswer(["1029"]),
    notes: [],
    check: { envelope: AckEnvelope, item: ReturnAckItem },
  },
];

const CONVENTIONS = [
  `Адреса: https://<сайт>${BAS_API_BASE}. Лише HTTPS, без переадресацій.`,
  "Автентифікація: заголовок Authorization: Bearer <ключ>. Ключ створюють у панелі (Інтеграції -> BAS -> Ключі доступу); його показують один раз. Дозволи: bas:read забирає черги, bas:write надсилає дані та підтвердження.",
  "Тіло: JSON у UTF-8, заголовок Content-Type: application/json. BOM на початку сайт пропускає, але краще його не писати (ИспользованиеByteOrderMark.НеИспользовать).",
  `Розмір тіла до ${BAS_LIMITS.bodyBytes / (1024 * 1024)} МБ, у пакеті до ${BAS_LIMITS.items} елементів.`,
  "Дати ISO 8601: 2026-11-12, 2026-11-12T10:00:00 (час без зсуву вважається київським) або зі зсувом. 0001-01-01 означає «дату не задано».",
  "Посилання на об'єкти - їхні GUID у BAS (externalId). Нульовий GUID 00000000-0000-0000-0000-000000000000 означає «не задано».",
  'Гроші - число або десятковий рядок ("1234.50"); кома й пробіли між тисячами також приймаються. Усі суми в гривнях.',
  `Кожен пакет має batchId - будь-який унікальний рядок (наприклад, новий UUID). Повтор того самого batchId протягом ${BAS_LIMITS.batchDays} днів отримує збережену відповідь, і нічого не застосовується вдруге.`,
  "Помилковий елемент не зриває пакет: у results він має status error і текст помилки, решта застосовується.",
  "Елемент перевіряється суворо: поле, якого немає в контракті, - це помилка цього елемента.",
  `Не більше ${BAS_LIMITS.callsPerMinute} викликів на хвилину на ключ. Повторюйте запит при 5xx, 429 і тайм-аутах із наростанням паузи (1, 2, 4, 8 хв, до 1 год).`,
  "Кожен виклик записується в журнал обміну панелі: хто, що, скільки, з якими помилками.",
];

const ERRORS: BasSpecDto["errors"] = [
  { status: 400, code: "json", meaning: "Тіло не є JSON." },
  { status: 400, code: "bad-request", meaning: "Тіло не відповідає контракту; issues називає поля." },
  { status: 401, code: "unauthorized", meaning: "Ключа немає, він невідомий, вимкнений або прострочений (reason)." },
  { status: 403, code: "forbidden", meaning: "Ключ не має потрібного дозволу (scope)." },
  { status: 403, code: "disabled", meaning: "Обмін вимкнено або вимкнено прийом цих даних (setting називає налаштування)." },
  { status: 404, code: "not-found", meaning: "Договір пакета розрахунків невідомий." },
  { status: 413, code: "too-large", meaning: `Тіло більше ${BAS_LIMITS.bodyBytes / (1024 * 1024)} МБ.` },
  { status: 415, code: "content-type", meaning: "Content-Type не application/json." },
  { status: 429, code: "rate", meaning: "Забагато викликів; retryAfter - через скільки секунд повторити." },
  { status: 500, code: "server", meaning: "Помилка сайту; повторіть пізніше." },
];

const STATUS_MAP: BasSpecDto["statusMap"] = [
  { bas: "new", site: "new", label: "Нове" },
  { bas: "awaiting_payment", site: "new", label: "Нове, очікує оплату" },
  { bas: "blocked", site: "blocked", label: "Заблоковано" },
  { bas: "in_progress", site: "inProgress", label: "В роботі" },
  { bas: "shipped", site: "shipped", label: "Відвантажено" },
  { bas: "delivered", site: "received", label: "Отримано" },
  { bas: "completed", site: "completed", label: "Завершено" },
  { bas: "cancelled", site: "cancelled", label: "Скасовано" },
];

const REQUEST_SAMPLE = `// Загальний модуль розширення (сервер). Один запит до сайту.
// КлючAPI() читає ключ із безпечного сховища (БезопасноеХранилищеДанных).
Функция ВыполнитьЗапрос(Метод, Путь, Данные = Неопределено) Экспорт
    Соединение = Новый HTTPСоединение("binar-2000.com", 443, , , , 30,
        Новый ЗащищенноеСоединениеOpenSSL());
    Запрос = Новый HTTPЗапрос("${BAS_API_BASE}" + Путь);
    Запрос.Заголовки.Вставить("Authorization", "Bearer " + КлючAPI());
    Если Данные <> Неопределено Тогда
        Запрос.Заголовки.Вставить("Content-Type", "application/json; charset=utf-8");
        Запись = Новый ЗаписьJSON;
        Запись.УстановитьСтроку();
        Настройки = Новый НастройкиСериализацииJSON;
        Настройки.ФорматСериализацииДаты = ФорматДатыJSON.ISO;
        ЗаписатьJSON(Запись, Данные, Настройки);
        Запрос.УстановитьТелоИзСтроки(Запись.Закрыть(), КодировкаТекста.UTF8,
            ИспользованиеByteOrderMark.НеИспользовать);
    КонецЕсли;
    Ответ = Соединение.ВызватьHTTPМетод(Метод, Запрос);
    Если Ответ.КодСостояния >= 500 Или Ответ.КодСостояния = 429 Тогда
        // Регламентне завдання повторить пізніше.
        ВызватьИсключение "Сайт тимчасово недоступний: " + Ответ.КодСостояния;
    КонецЕсли;
    Чтение = Новый ЧтениеJSON;
    Чтение.УстановитьСтроку(Ответ.ПолучитьТелоКакСтроку(КодировкаТекста.UTF8));
    Результат = ПрочитатьJSON(Чтение);
    Чтение.Закрыть();
    Если Ответ.КодСостояния <> 200 Тогда
        ВызватьИсключение "Сайт відповів " + Ответ.КодСостояния + ": " + Результат.error;
    КонецЕсли;
    Возврат Результат;
КонецФункции`;

const PUSH_SAMPLE = `// Товари порціями по 500. Посилання передаються рядком GUID.
Процедура ОтправитьТовары(Выборка) Экспорт
    Элементы = Новый Массив;
    Пока Выборка.Следующий() Цикл
        Элемент = Новый Структура;
        Элемент.Вставить("externalId", Строка(Выборка.Ссылка.УникальныйИдентификатор()));
        Элемент.Вставить("sku", Выборка.Артикул);
        Элемент.Вставить("name", Выборка.Наименование);
        Элемент.Вставить("deleted", Выборка.ПометкаУдаления);
        Элементы.Добавить(Элемент);
        Если Элементы.Количество() = 500 Тогда
            ОтправитьПорцию("/products", Элементы);
            Элементы = Новый Массив;
        КонецЕсли;
    КонецЦикла;
    Если Элементы.Количество() > 0 Тогда
        ОтправитьПорцию("/products", Элементы);
    КонецЕсли;
КонецПроцедуры

Процедура ОтправитьПорцию(Путь, Элементы)
    // Новий batchId на кожну порцію; при повторі після збою - той самий.
    Пакет = Новый Структура("batchId, mode, items",
        Строка(Новый УникальныйИдентификатор), "delta", Элементы);
    Результат = ВыполнитьЗапрос("PUT", Путь, Пакет);
    Для Каждого Рядок Из Результат.results Цикл
        Если Рядок.status = "error" Тогда
            ЗаписьЖурналаРегистрации("Обмін з сайтом", УровеньЖурналаРегистрации.Предупреждение, , ,
                Рядок.externalId + ": " + Рядок.error);
        КонецЕсли;
    КонецЦикла;
КонецПроцедуры`;

const PULL_SAMPLE = `// Нові замовлення сайту: забрати, створити документ, підтвердити.
Процедура ЗабратьЗаказы() Экспорт
    Курсор = Константы.КурсорЗаказовСайта.Получить(); // число, спершу 0
    Пока Истина Цикл
        Ответ = ВыполнитьЗапрос("GET", "/orders?after=" + Формат(Курсор, "ЧН=0; ЧГ=0") + "&limit=100");
        Если Ответ.items.Количество() = 0 Тогда
            Прервать;
        КонецЕсли;
        Подтверждения = Новый Массив;
        Для Каждого Пакет Из Ответ.items Цикл
            Попытка
                Документ = СоздатьЗаказПокупателя(Пакет); // ваша обробка, повертає посилання
                Подтверждения.Добавить(Новый Структура("orderId, externalId, number",
                    Пакет.orderId, Строка(Документ.УникальныйИдентификатор()), Документ.Номер));
            Исключение
                Подтверждения.Добавить(Новый Структура("orderId, error",
                    Пакет.orderId, КраткоеПредставлениеОшибки(ИнформацияОбОшибке())));
            КонецПопытки;
        КонецЦикла;
        ВыполнитьЗапрос("POST", "/orders/ack", Новый Структура("items", Подтверждения));
        Курсор = Ответ.nextAfter;
        Константы.КурсорЗаказовСайта.Установить(Курсор);
    КонецЦикла;
КонецПроцедуры`;

function publicEndpoint(definition: Definition): BasSpecEndpoint {
  const { check: _check, queryExample: _example, ...endpoint } = definition;
  void _check;
  void _example;
  return endpoint;
}

export function basSpec(): BasSpecDto {
  return {
    version: BAS_API_VERSION,
    basePath: BAS_API_BASE,
    auth: "Authorization: Bearer <ключ>",
    conventions: CONVENTIONS,
    errors: ERRORS,
    statusMap: STATUS_MAP,
    endpoints: DEFINITIONS.map(publicEndpoint),
    codeSamples: [
      { title: "Запит до сайту", language: "bsl", code: REQUEST_SAMPLE },
      { title: "Надсилання товарів", language: "bsl", code: PUSH_SAMPLE },
      { title: "Черга нових замовлень", language: "bsl", code: PULL_SAMPLE },
    ],
  };
}

// Every example through the schema its route uses: [] when all are valid.
export function validateSpecExamples(): string[] {
  const problems: string[] = [];
  for (const definition of DEFINITIONS) {
    const check = definition.check;
    if (!check) continue;
    if ("query" in check) {
      const parsed = check.query.safeParse(definition.queryExample ?? {});
      if (!parsed.success) problems.push(`${definition.id} query: ${describeIssues(parsed.error)}`);
      continue;
    }
    const envelope = check.envelope.safeParse(definition.request);
    if (!envelope.success) {
      problems.push(`${definition.id} envelope: ${describeIssues(envelope.error)}`);
      continue;
    }
    const items = (definition.request as { items?: unknown[] }).items ?? [];
    items.forEach((item, index) => {
      const parsed = check.item?.safeParse(item);
      if (parsed && !parsed.success) problems.push(`${definition.id} items.${index}: ${describeIssues(parsed.error)}`);
    });
  }
  return problems;
}

export const SPEC_ENDPOINT_COUNT = DEFINITIONS.length;
