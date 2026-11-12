"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { BackCrumb, PhoneBackCrumb, ShopCrumbs, Slash } from "@/components/ui/Breadcrumb";
import { ChipTabs, chipTabPanelProps } from "@/components/ui/ChipTabs";
import { SearchField } from "@/components/ui/SearchField";
import { FilterButton } from "@/components/ui/FilterButton";
import { AppliedChips } from "@/components/ui/AppliedChips";
import { SortMenu } from "@/components/ui/SortMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadMore } from "@/components/ui/LoadMore";
import { PRODUCT_LINE_LIST, PRODUCT_LINE_TOTAL, ProductLine, ProductLineRemove } from "@/components/ui/ProductLine";
import { KeyValueCard, KeyValueList } from "@/components/ui/KeyValueList";
import { ChoiceRow, RadioGroup } from "@/components/ui/ChoiceRow";
import { FitText } from "@/components/ui/FitText";
import { QtyStepper } from "@/components/catalog/QtyStepper";
import { ChipsRow } from "@/components/catalog/ChipsRow";
import { CheckboxOnIcon } from "@/components/catalog/icons";
import { formatPrice } from "@/components/catalog/data";
import { useListingProducts } from "@/components/catalog/CatalogRegistry";
import { CartIcon } from "@/components/catalog/icons";
import { PreorderIcon } from "@/components/platform/icons";
import { OrderDocumentsIcon } from "@/components/platform/orderIcons";
import {
  DocumentRow,
  DocumentRowList,
  KeyValueLine,
  ListPanel,
  ListRow,
  OrderStatusBadge,
  PaymentBadge,
  PaymentCaptionLine,
  RecordRow,
  ReturnStatusBadge,
  RowDisc,
  Select,
  StatusPill,
} from "@/components/platform/ui";
import { AutocompleteField, CheckboxField, SelectField, TextArea, TextField } from "@/components/checkout/fields";
import { BRANCHES, CITIES, DELIVERY_OPTIONS } from "@/components/checkout/data";

// Phone gallery of the F2 atoms (mobile pass, system spec 3.4). Open at
// 320 / 360 / 390 / 430 / 600 wide; every block is `section[data-gallery]`
// with a stable id, the interactive atoms are live.

function Section({
  id,
  title,
  slab = false,
  children,
}: {
  id: string;
  title: string;
  slab?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      data-gallery={id}
      className={`flex flex-col gap-6 px-6 py-12 ${slab ? "bg-bg-cabinet" : "bg-white"} [&+&]:border-t [&+&]:border-stroke-subtle`}
    >
      <h2 className="font-mono text-[14px] font-medium leading-5 text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}

const SORTS = [
  { value: "date-desc", label: "Спочатку нові" },
  { value: "date-asc", label: "Спочатку старі" },
  { value: "total-desc", label: "Сума: від більшої" },
  { value: "total-asc", label: "Сума: від меншої" },
];

const COUNTERPARTY_OPTIONS = [
  { value: "all", label: "Усі контрагенти" },
  { value: "star", label: "ТОВ \"Мережа готелів \"Зоряний шлях\"" },
  { value: "mirotel", label: "Mirotel LTD" },
  { value: "fop", label: "ФОП Коваленко Олена Петрівна" },
];

const BRANCH_OPTIONS = BRANCHES.map((b) => {
  const [primary, secondary] = b.split(": ");
  return { value: b, label: b, primary, secondary };
});

const DOC_META = ["27.04.2026", "0.9 МБ", "PDF"];

export function PhoneAtomsGallery() {
  // A10
  const [ordersTab, setOrdersTab] = useState<"orders" | "returns">("orders");
  const [profileTab, setProfileTab] = useState<"account" | "counterparties" | "employees">("account");
  // A11
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<string[]>(["Останні 90 днів", "ТОВ \"Мережа готелів \"Зоряний шлях\"", "Скасовано"]);
  const [sheetOpen, setSheetOpen] = useState(false);
  // A12
  const [sort, setSort] = useState("date-desc");
  // A9
  const [shown, setShown] = useState(10);
  const [payShown, setPayShown] = useState(3);
  // A18
  const [qtyA, setQtyA] = useState(1);
  const [qtyB, setQtyB] = useState(2);
  const [qtyC, setQtyC] = useState(120);
  // A24
  const [delivery, setDelivery] = useState("");
  const [showError, setShowError] = useState(false);
  const [all, setAll] = useState(false);
  const [lineChecked, setLineChecked] = useState(true);
  // A22
  const [cp, setCp] = useState("all");
  const [cp2, setCp2] = useState("all");
  // A26
  const [name, setName] = useState("");
  const [email, setEmail] = useState("olena.kovalenko@mirotel-hotels-group.com.ua");
  const [phone, setPhone] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [branch, setBranch] = useState(BRANCH_OPTIONS[2].value);
  const [deliverySel, setDeliverySel] = useState("");
  const [city, setCity] = useState("");
  const [comment, setComment] = useState("");
  const [invoice, setInvoice] = useState(false);

  const products = useListingProducts().slice(0, 4);
  const items = Array.from({ length: 28 }, (_, i) => `№482910${String(64 - i).padStart(2, "0")}`);

  return (
    <main className="flex flex-col pb-12">
      <section className="px-6 pb-6 pt-12">
        <h1 className="text-h2 text-neutral-900">Галерея атомів F2</h1>
      </section>

      <Section id="crumbs" title="A19 PhoneBackCrumb / ShopCrumbs">
        <PhoneBackCrumb href="/" label="Головна" />
        <PhoneBackCrumb href="/catalog/cleaning" label="Засоби та інвентар для прибирання" />
        <ShopCrumbs back={{ href: "/catalog", label: "Каталог" }}>
          <BackCrumb href="/" label="Головна" />
          <Slash />
          <span className="text-[18px] font-semibold leading-[22px] text-brand">Каталог</span>
        </ShopCrumbs>
      </Section>

      <Section id="chiptabs" title="A10 ChipTabs">
        <ChipTabs
          items={[
            { key: "orders", label: "Замовлення" },
            { key: "returns", label: "Повернення" },
          ]}
          value={ordersTab}
          onChange={setOrdersTab}
          label="Розділи замовлень"
          idPrefix="g-orders"
        />
        <div {...chipTabPanelProps("g-orders", ordersTab)} className="text-[14px] leading-5 text-neutral-500">
          {ordersTab === "orders" ? "Замовлення" : "Повернення"}
        </div>
        <ChipTabs
          items={[
            { key: "account", label: "Дані" },
            { key: "counterparties", label: "Контрагенти" },
            { key: "employees", label: "Співробітники" },
          ]}
          value={profileTab}
          onChange={setProfileTab}
          label="Розділи профілю"
          idPrefix="g-profile"
        />
        <div {...chipTabPanelProps("g-profile", profileTab)} className="text-[14px] leading-5 text-neutral-500">
          {profileTab}
        </div>
      </Section>

      <Section id="search" title="A11 SearchField + FilterButton + AppliedChips" slab>
        <div className="flex flex-col">
          <div className="flex items-center gap-2" data-gallery-part="search-row">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Пошук замовлень"
              placeholder="№ або контрагент"
              className="min-w-0 flex-1"
            />
            <FilterButton count={filters.length} expanded={sheetOpen} onClick={() => setSheetOpen((o) => !o)} />
          </div>
          <AppliedChips
            className="mt-4"
            chips={filters.map((f) => ({ key: f, label: f, onRemove: () => setFilters((all) => all.filter((x) => x !== f)) }))}
            onReset={() => setFilters([])}
          />
        </div>
        <div className="flex items-center gap-2">
          <SearchField value="шамп" onChange={() => {}} label="Пошук по каталогу" className="min-w-0 flex-1" />
          <FilterButton count={0} expanded={false} onClick={() => {}} />
        </div>
        <Button size="small" variant="outlinedDark" onClick={() => setFilters(["Останні 90 днів", "ТОВ \"Мережа готелів \"Зоряний шлях\"", "Скасовано"])}>
          Скинути
        </Button>
      </Section>

      <Section id="sort" title="A12 SortMenu (meta line)" slab>
        <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2" data-gallery-part="meta">
          <span className="whitespace-nowrap text-[14px] leading-5 text-neutral-600">24.04.2026 - 24.05.2026</span>
          <SortMenu value={sort} options={SORTS} onChange={setSort} className="ml-auto" />
        </div>
      </Section>

      <Section id="list" title="A7 ListPanel / RecordRow / RowDisc / KeyValueLine" slab>
        <ListPanel label="Список замовлень">
          <RecordRow
            id="№48291064"
            linkLabel="Деталі замовлення №48291064"
            href="/orders/48291064"
            date="24.05.2026"
            amount="12 836,10 ₴"
            sub={COUNTERPARTY_OPTIONS[1].label}
            action={
              <RowDisc label="Документи замовлення №48291064" haspopup="dialog" onClick={() => {}}>
                <OrderDocumentsIcon className="size-5" />
              </RowDisc>
            }
            badges={
              <>
                <OrderStatusBadge status="new" />
                <PaymentBadge kind="awaiting" />
              </>
            }
            caption={<PaymentCaptionLine tone="attention" text="Прострочено на 3 дні" />}
          />
          <RecordRow
            id="№48291061"
            eyebrow="Повернення №9104"
            linkLabel="Деталі повернення №9104 за замовленням №48291061"
            href="/orders/returns/9104"
            date="20.05.2026"
            amount="2 532,00 ₴"
            sub="Mirotel LTD"
            action={
              <RowDisc label="Документи повернення за замовленням №48291061" haspopup="dialog" onClick={() => {}}>
                <OrderDocumentsIcon className="size-5" />
              </RowDisc>
            }
            badges={<ReturnStatusBadge status="accepted" />}
          />
          <RecordRow
            id="ФОП Коваленко Олена Петрівна"
            linkLabel="Контрагент ФОП Коваленко Олена Петрівна"
            onOpen={() => {}}
            date="ЄДРПОУ 3216549870"
            badges={<StatusPill tone="green">Активний</StatusPill>}
          />
          <RecordRow id="№48291037" linkLabel="Замовлення №48291037" date="12.04.2025" amount="980,00 ₴" />
          <ListRow>
            <div className="flex flex-col gap-3">
              <p className="text-[16px] font-bold leading-[22px] tracking-[0.16px] text-neutral-900">Олена Коваленко</p>
              <KeyValueLine label="Роль" value="Адміністратор" />
              <KeyValueLine label="Телефон" value="+380 50 000 00 01" nowrap />
              <KeyValueLine label="Email" value="olena.kovalenko@mirotel-hotels-group.com.ua" />
            </div>
          </ListRow>
        </ListPanel>
      </Section>

      <Section id="empty" title="A14 EmptyState (panel / ring / none)" slab>
        <EmptyState
          surface="panel"
          icon={<PreorderIcon className="size-6" />}
          title="Замовлень ще немає"
          text="Оформіть перше замовлення, щоб воно з’явилося у цьому списку."
        />
        <EmptyState
          surface="panel"
          title="Замовлень не знайдено"
          text="Змініть пошук або умови фільтрів."
          action={
            <Button size="small" variant="outlinedDark">
              Скинути фільтри
            </Button>
          }
        />
      </Section>
      <Section id="empty-public" title="A14 EmptyState ring / none">
        <EmptyState
          surface="ring"
          role="status"
          icon={<CartIcon className="size-6" />}
          title="Кошик порожній"
          text="Додайте товари з каталогу, щоб оформити замовлення."
          action={
            <Button href="/catalog" size="small" arrow>
              Перейти в каталог
            </Button>
          }
        />
        <EmptyState
          title="За запитом нічого не знайдено"
          text="Спробуйте змінити пошук або фільтри."
          action={<Button size="small">Скинути пошук і фільтри</Button>}
        />
      </Section>

      <Section id="loadmore" title="A9 LoadMore" slab>
        <ListPanel label="Список">
          {items.slice(0, shown).map((n, i) => (
            <RecordRow key={n} id={n} linkLabel={`Деталі замовлення ${n}`} href={`#row-${i}`} date="24.05.2026" />
          ))}
        </ListPanel>
        <LoadMore
          className="mt-6"
          shown={shown}
          total={items.length}
          onMore={() => setShown((s) => s + 10)}
          focusAfterLast={() => document.querySelector<HTMLElement>(`[data-gallery="loadmore"] a[href="#row-${shown}"]`)}
        />
        <LoadMore
          shown={payShown}
          total={15}
          onMore={() => setPayShown((s) => Math.min(15, s + 4))}
          onLess={payShown > 3 ? () => setPayShown(3) : undefined}
        />
      </Section>

      <Section id="lines" title="A8 ProductLine">
        <ul role="list" aria-label="Товари" className={`${PRODUCT_LINE_LIST} border-y border-stroke-subtle`}>
          <ProductLine
            image={products[0].image}
            title={products[0].title}
            href="/catalog/hotels/hotelna-kosmetyka/shampoo-1"
            meta={`${products[0].volume}, ${products[0].brand}`}
            price={`${formatPrice(products[0].price)} за од.`}
            trailing={<ProductLineRemove label={`Видалити «${products[0].title}» з кошика`} onClick={() => {}} />}
            bottom={
              <>
                <QtyStepper qty={qtyA} onQty={setQtyA} size="sm" slot="fixed" />
                <span className={PRODUCT_LINE_TOTAL}>{formatPrice(products[0].price * qtyA)}</span>
              </>
            }
          />
          <ProductLine
            image={products[1].image}
            title={products[1].title}
            status={{ label: "Немає в наявності", tone: "negative" }}
            grey
            meta={`${products[1].volume}, ${products[1].brand}`}
            price={
              <>
                <span className="text-brand">{formatPrice(products[1].price)}</span>{" "}
                <s>{formatPrice(products[1].price * 1.25)}</s>
              </>
            }
            note="Ціна залежить від курсу"
            trailing={<ProductLineRemove label={`Видалити «${products[1].title}» з кошика`} onClick={() => {}} />}
          />
          <ProductLine
            image={products[2].image}
            title={products[2].title}
            meta="Артикул: BT-SP-040"
            bottom={
              <>
                <span className="text-[14px] leading-5 text-neutral-500">80 шт · 31,65 ₴</span>
                <span className={PRODUCT_LINE_TOTAL}>2 532,00 ₴</span>
              </>
            }
          />
          <ProductLine
            image={products[3].image}
            title={`${products[3].title} для готельних номерів, ${products[3].volume}, ${products[3].brand}`}
            titleLines={3}
            href="/catalog/hotels/hotelna-kosmetyka/shampoo-1"
            meta="Артикул: BT-SP-041"
            leading={
              <span className="-ml-2.5 -mt-2.5 mr-1.5 flex size-11 shrink-0 items-center justify-center">
                <CheckboxOnIcon className="size-6 text-brand" />
              </span>
            }
            bottom={
              <>
                <QtyStepper qty={qtyC} onQty={setQtyC} editable />
                <span className={PRODUCT_LINE_TOTAL}>{formatPrice(products[3].price * qtyC)}</span>
              </>
            }
          />
        </ul>
      </Section>

      <Section id="kv" title="A15 KeyValueList / KeyValueCard" slab>
        <KeyValueCard
          title="Деталі замовлення"
          rows={[
            { id: "created", label: "Створив замовлення", value: "Олена Коваленко" },
            { id: "cp", label: "Контрагент", value: "ТОВ \"Мережа готелів \"Зоряний шлях\"" },
            { id: "mail", label: "Email", value: "sales@binar2000.com", href: "mailto:sales@binar2000.com" },
            { id: "sum", label: "Сума замовлення", value: "12 836,10 ₴", emphasis: true },
          ]}
        />
        <KeyValueCard
          surface="subtle"
          rows={[
            { id: "login", label: "Логін", value: "0500000001" },
            { id: "company", label: "Компанія", value: "Демо Партнер" },
          ]}
        />
        <div className="rounded-[32px] bg-white p-6">
          <KeyValueList
            rows={[
              { id: "city", label: "Місто", value: "Київ" },
              { id: "way", label: "Варіант доставки", value: "Нова Пошта (Самовивіз)" },
            ]}
          />
        </div>
      </Section>

      <Section id="docs" title="A16 DocumentRow" slab>
        <div className="rounded-[32px] bg-white p-6">
          <DocumentRowList label="Документи замовлення">
            <DocumentRow name="Рахунок-фактура №5848" meta={DOC_META} href="/placeholder.pdf" onPreview={() => {}} />
            <DocumentRow name="Видаткова накладна №5848 від 27.04.2026 до замовлення №48291064" meta={DOC_META} href="/placeholder.pdf" onPreview={() => {}} />
            <DocumentRow name="Акт звірки" meta={DOC_META} href="/placeholder.pdf" />
            <DocumentRow name="Надходження на рахунок" pending />
          </DocumentRowList>
        </div>
      </Section>

      <Section id="stepper" title="A18 QtyStepper + ChipsRow">
        <div className="flex flex-wrap items-center gap-8" data-gallery-part="steppers">
          <QtyStepper qty={qtyA} onQty={setQtyA} />
          <QtyStepper qty={qtyB} onQty={setQtyB} size="sm" slot="fixed" />
          <QtyStepper qty={qtyC} onQty={setQtyC} editable />
          <QtyStepper qty={1} onQty={() => {}} disabled />
        </div>
        <div className="flex items-center justify-between gap-4" data-gallery-part="qty-labelled">
          <span id="g-qty-label" className="text-[14px] font-medium leading-5 text-neutral-500">
            Кількість
          </span>
          <QtyStepper qty={qtyA} onQty={setQtyA} labelledBy="g-qty-label" />
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[32px] bg-neutral-800 p-6">
          <QtyStepper qty={qtyB} onQty={setQtyB} tone="light" />
          <ChipsRow product={products[0]} tone="light" className="min-w-0" />
        </div>
        <ChipsRow product={products[0]} />
        <ChipsRow product={{ ...products[1], chips: ["Бавовна 100 %, щільність 450 г/м² для готелів", "Botanica"] }} />
      </Section>

      <Section id="choices" title="A24 ChoiceRow / RadioGroup">
        <RadioGroup
          name="g-delivery"
          label="Варіанти доставки"
          options={DELIVERY_OPTIONS}
          value={delivery}
          onChange={(v) => {
            setDelivery(v);
            setShowError(false);
          }}
          error={showError && !delivery ? "Оберіть варіант доставки" : undefined}
        />
        <Button size="small" variant="outlinedDark" onClick={() => setShowError(true)}>
          Перевірити
        </Button>
        <div className="flex flex-col gap-10">
          <ChoiceRow type="checkbox" name="g-all" checked={all} onChange={setAll} label="Обрати всі товари" labelTone="control" />
          <ChoiceRow
            type="checkbox"
            name="g-line"
            checked={lineChecked}
            onChange={setLineChecked}
            label="Шампунь для волосся і тіла"
            hint="Артикул: BT-SP-040 · 80 шт · 2 532,00 ₴"
          />
        </div>
      </Section>

      <Section id="fittext" title="A25 FitText" slab>
        <div className="flex flex-col gap-4 rounded-[32px] bg-neutral-900 p-6 text-white">
          <span className="text-[14px] font-medium leading-5 text-neutral-400">Поточний баланс</span>
          <FitText min={20} className="block min-w-0 whitespace-nowrap text-[30px] font-semibold leading-9 tracking-[-0.6px]">
            123 456 789,90 ₴
          </FitText>
          <FitText min={20} className="block min-w-0 whitespace-nowrap text-[30px] font-semibold leading-9 tracking-[-0.6px]">
            12 836,10 ₴
          </FitText>
        </div>
      </Section>

      <Section id="select" title="A22 Select (platform)" slab>
        <Select label="Контрагент" value={cp} options={COUNTERPARTY_OPTIONS} onChange={setCp} bg="white" className="w-full" />
      </Section>

      <Section id="fields" title="A26 fields.tsx">
        <div className="flex flex-col gap-6 [--field-surface:#fff]">
          <TextField label="Ваше Ім'я" value={name} onChange={setName} autoCapitalize="words" enterKeyHint="next" />
          <TextField label="Email" value={email} onChange={setEmail} type="email" inputMode="email" enterKeyHint="next" />
          <TextField label="Номер телефону" value={phone} onChange={setPhone} error="Перевірте номер телефону" inputMode="tel" />
          <TextField label="Email для отримання рахунку" value={invoiceEmail} onChange={setInvoiceEmail} helper="Рахунок прийде на цю адресу" />
          <TextField label="Логін" value="0500000001" onChange={() => {}} disabled />
          <AutocompleteField label="Місто" value={city} onChange={setCity} options={CITIES} enterKeyHint="next" />
          <SelectField label="Варіанти доставки" value={deliverySel} onChange={setDeliverySel} options={DELIVERY_OPTIONS} error={deliverySel ? undefined : "Оберіть варіант доставки"} announceError={false} />
          <SelectField label="Відділення" value={branch} onChange={setBranch} options={BRANCH_OPTIONS} />
          <TextArea label="Коментар" value={comment} onChange={setComment} />
          <CheckboxField
            label={
              <>
                Потрібен <span className="whitespace-nowrap">рахунок-фактура</span>
              </>
            }
            checked={invoice}
            onChange={setInvoice}
          />
        </div>
      </Section>

      <Section id="caption" title="A28 PaymentCaptionLine">
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap items-start gap-2">
            <OrderStatusBadge status="shipped" />
            <PaymentBadge kind="partial" />
          </div>
          <PaymentCaptionLine tone="attention" text="Залишок 6 336,10 ₴ прострочено" />
          <PaymentCaptionLine tone="subtle" text="1 500 із 3 900 ₴" />
        </div>
      </Section>

      <Section id="select-low" title="A22 Select near the bottom (flip)" slab>
        <Select label="Контрагент" value={cp2} options={COUNTERPARTY_OPTIONS} onChange={setCp2} bg="white" className="w-full" />
        <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="text-[14px] leading-5 text-neutral-600">Знайдено 28 замовлень</span>
          <SortMenu value={sort} options={SORTS} onChange={setSort} className="ml-auto" />
        </div>
      </Section>
    </main>
  );
}
