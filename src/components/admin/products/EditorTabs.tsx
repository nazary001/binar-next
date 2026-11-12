"use client";

import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { cx, formatDate, formatDateTime, formatMoney } from "../lib/format";
import {
  Badge,
  Button,
  Checkbox,
  CopyButton,
  FormGrid,
  FormSection,
  GalleryField,
  ImageField,
  Input,
  KeyValueList,
  MoneyInput,
  NumberInput,
  Select,
  Stack,
  Switch,
  TagInput,
  TEXT,
  Textarea,
  TONES,
  type SelectOption,
} from "../ui";
import { errorOf, suggestedId, type Draft, type Errors } from "./draft";
import {
  FilesEditor,
  FreeTextCombo,
  PackagesEditor,
  RelatedListEditor,
  SpecRowsEditor,
  TextListEditor,
  TogetherEditor,
  type KnownProduct,
} from "./fields";
import { Note, STOCK_TONE, stockLabel } from "./shared";
import { PRODUCT_LIMITS, type CurrencyLink, type ProductDetail, type ProductOptionsAnswer } from "./types";

// The panels of the product editor, one per tab. Each gets the form state
// and its setter, the field errors, the saved product (null while creating)
// and the editor's vocabulary; `readOnly` is a role that may only look.

export type TabProps = {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
  errors: Errors;
  product: ProductDetail | null;
  options: ProductOptionsAnswer;
  readOnly: boolean;
};

// A group of settings rows with hairlines between them (switches with
// their explanation on the left, the switch on the right).
function SwitchRows({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col divide-y divide-stroke-subtle [&>*]:py-3 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">{children}</div>;
}

// Three short fields in a row once the field column is wide enough (the
// kit's FormGrid waits for 1536 px).
const GRID_3 = "grid items-start gap-x-4 gap-y-5 min-[640px]:grid-cols-2 xl:grid-cols-3";

const CURRENCIES: SelectOption<CurrencyLink>[] = [
  { value: "USD", label: "Долар США (USD)" },
  { value: "EUR", label: "Євро (EUR)" },
];

const list = (values: readonly string[], current: string | null): SelectOption<string>[] => {
  const options: SelectOption<string>[] = values.map((value) => ({ value, label: value }));
  if (current && !values.includes(current)) options.unshift({ value: current, label: current, hint: "Не з цього напряму: оберіть інше значення" });
  return options;
};

// --- Основне ----------------------------------------------------------------------------------------

export type MainTabProps = TabProps & {
  creating: boolean;
  initialSubcategory: string;
  // Moves in the listing order (absent while creating or for a viewer).
  reorder?: { busy: "start" | "end" | null; toStart: () => void; toEnd: () => void };
};

export function MainTab({ draft, set, errors, product, options, readOnly, creating, initialSubcategory, reorder }: MainTabProps) {
  const directions = options.directions;
  const direction = directions.find((item) => item.slug === draft.direction) ?? null;
  const card = direction?.categories.find((item) => item.label === draft.subcategory) ?? null;
  const knownLabel = directions.some((item) => item.categories.some((category) => category.label === draft.subcategory));
  const orphan = !creating && Boolean(draft.subcategory) && !knownLabel;
  const moved = !creating && card !== null && draft.subcategory !== initialSubcategory;
  const newHref = direction && card ? `/catalog/${direction.slug}/${card.slug}/${draft.id}` : "";
  const defaultChips = [draft.volume.trim(), draft.brand.trim()].filter(Boolean);
  const archived = product?.archived ?? false;

  const pickDirection = (slug: string) => {
    const next = directions.find((item) => item.slug === slug) ?? null;
    set({
      direction: slug,
      subcategory: next?.categories.some((item) => item.label === draft.subcategory) ? draft.subcategory : "",
      zone: draft.zone && next?.zones.includes(draft.zone) ? draft.zone : null,
      productType: draft.productType && next?.productTypes.includes(draft.productType) ? draft.productType : null,
    });
  };

  return (
    <Stack gap={4}>
      <FormSection title="Картка товару" description="Назву, бренд і об'єм покупці бачать у каталозі, у кошику та в замовленнях.">
        <FormGrid>
          <Input
            label="Назва"
            required
            value={draft.title}
            onChange={(title) => set(creating && !draft.idTouched ? { title, id: suggestedId(title) } : { title })}
            maxLength={PRODUCT_LIMITS.title}
            error={errors.title}
            disabled={readOnly}
            className="col-span-full"
          />
          {creating ? (
            <Input
              label="Код товару"
              value={draft.id}
              onChange={(id) => set({ id, idTouched: true })}
              placeholder="Заповниться з назви"
              maxLength={PRODUCT_LIMITS.id}
              hint="Стане адресою сторінки товару і потім не зміниться. Латиниця, цифри й дефіс; якщо такий код уже є, додамо до нього число."
              error={errors.id}
            />
          ) : (
            <Input
              label="Код товару"
              value={draft.id}
              onChange={() => {}}
              readOnly
              trailing={<CopyButton text={draft.id} label="код товару" />}
              hint="Частина адреси сторінки. Не змінюється: на нього посилаються кошики й замовлення."
            />
          )}
          <Input
            label="Артикул"
            value={draft.sku}
            onChange={(sku) => set({ sku })}
            maxLength={PRODUCT_LIMITS.sku}
            hint="Показується під назвою на сторінці товару і потрапляє в замовлення"
            error={errors["details.sku"]}
            disabled={readOnly}
          />
          <FreeTextCombo
            label="Бренд"
            required
            value={draft.brand}
            onChange={(brand) => set({ brand })}
            options={options.brands}
            newLabel="Новий бренд"
            placeholder="Оберіть або введіть"
            error={errors.brand}
            disabled={readOnly}
          />
          <Input
            label="Об'єм / розмір"
            required
            value={draft.volume}
            onChange={(volume) => set({ volume })}
            maxLength={PRODUCT_LIMITS.volume}
            placeholder="250 мл"
            hint="Так, як на картці товару: «250 мл», «L», «100 шт»"
            error={errors.volume}
            disabled={readOnly}
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Розділ каталогу"
        description="Від категорії залежать адреса сторінки товару і сторінки каталогу, де він з'являється. Зона і тип товару - це фільтри каталогу."
      >
        <div className="flex min-w-0 flex-col gap-4">
          {orphan && (
            <Note tone="red" title="Категорія не відповідає жодному розділу каталогу">
              Збережено «{draft.subcategory}». Такий товар видно лише в загальному списку каталогу. Оберіть напрям і категорію.
            </Note>
          )}
          <FormGrid>
            <Select
              label="Напрям"
              required
              value={draft.direction}
              onChange={pickDirection}
              options={directions.map((item) => ({ value: item.slug, label: item.title }))}
              placeholder="Оберіть напрям"
              disabled={readOnly}
            />
            <Select
              label="Категорія"
              required
              value={card ? card.label : null}
              onChange={(subcategory) => set({ subcategory })}
              options={(direction?.categories ?? []).map((item) => ({ value: item.label, label: item.label }))}
              placeholder={direction ? "Оберіть категорію" : "Спершу оберіть напрям"}
              disabled={readOnly || !direction}
              error={errors.subcategory}
            />
            <Select
              label="Зона"
              clearable
              value={draft.zone}
              onChange={(zone) => set({ zone })}
              options={list(direction?.zones ?? [], draft.zone)}
              placeholder={direction ? "Не вказано" : "Спершу оберіть напрям"}
              hint={direction ? `Фільтр «${direction.facetTitle}» у каталозі` : undefined}
              disabled={readOnly || !direction}
              error={errors.zone}
            />
            <Select
              label="Тип товару"
              clearable
              value={draft.productType}
              onChange={(productType) => set({ productType })}
              options={list(direction?.productTypes ?? [], draft.productType)}
              placeholder={direction ? "Не вказано" : "Спершу оберіть напрям"}
              hint={direction ? "Фільтр «Товари» у каталозі" : undefined}
              disabled={readOnly || !direction}
              error={errors.productType}
            />
          </FormGrid>
          {moved && (
            <Note tone="amber" title="Сторінка товару переїде на нову адресу">
              Після збереження вона відкриватиметься за адресою <span className="font-semibold [overflow-wrap:anywhere]">{newHref}</span>. Старі посилання
              на неї перестануть працювати.
            </Note>
          )}
        </div>
      </FormSection>

      {!creating && product && (
        <FormSection
          title="Показ у каталозі"
          description="Прихований товар не видно в списках каталогу, але його сторінка відкривається за прямим посиланням."
        >
          <div className="flex min-w-0 flex-col gap-4">
            <Switch
              label="Показувати в каталозі"
              labelPosition="start"
              checked={draft.listed}
              onChange={(listed) => set({ listed })}
              disabled={readOnly || archived}
              hint={archived ? "Товар в архіві: спершу поверніть його" : readOnly ? undefined : "Зміниться після збереження"}
            />
            {errors.listed && (
              <p role="alert" className="text-[12px] font-medium leading-4 text-negative">
                {errors.listed}
              </p>
            )}
            <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-bg-subtle p-4 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
              <div className="min-w-0">
                <p className={TEXT.caption}>Місце в каталозі</p>
                <p className="mt-0.5 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-neutral-900 tabular-nums">
                  {product.position ? `${product.position.place} з ${product.position.total}` : "Немає"}
                </p>
                <p className={cx(TEXT.caption, "mt-0.5")}>
                  {product.position
                    ? "Порядок «за популярністю»: так товари стоять у каталозі, поки покупець не змінив сортування"
                    : archived
                      ? "Товар в архіві"
                      : "Товар не показується в списках каталогу"}
                </p>
              </div>
              {reorder && !archived && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" variant="secondary" iconLeft={ArrowUpIcon} loading={reorder.busy === "start"} disabled={reorder.busy === "end"} onClick={reorder.toStart}>
                    На початок каталогу
                  </Button>
                  <Button size="sm" variant="secondary" iconLeft={ArrowDownIcon} loading={reorder.busy === "end"} disabled={reorder.busy === "start"} onClick={reorder.toEnd}>
                    У кінець каталогу
                  </Button>
                </div>
              )}
            </div>
          </div>
        </FormSection>
      )}

      {!creating && (
        <FormSection title="Мітки на картці" description="Короткі мітки під назвою товару в каталозі.">
          <div className="flex min-w-0 flex-col gap-3">
            <TagInput
              label="Мітки"
              value={draft.chips}
              onChange={(chips) => set({ chips })}
              max={PRODUCT_LIMITS.chips}
              maxLength={PRODUCT_LIMITS.chip}
              placeholder={readOnly ? "Міток немає" : "Додайте мітку і натисніть Enter"}
              hint={`До ${PRODUCT_LIMITS.chips} міток. Порожньо: картка показує об'єм і бренд.`}
              error={errorOf(errors, "chips")}
              disabled={readOnly}
            />
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className={TEXT.caption}>На картці:</span>
              {(draft.chips.length ? draft.chips : defaultChips).map((chip) => (
                <Badge key={chip} tone="neutral">
                  {chip}
                </Badge>
              ))}
              {draft.chips.length === 0 && defaultChips.length === 0 && <span className={TEXT.caption}>нічого</span>}
            </div>
          </div>
        </FormSection>
      )}
    </Stack>
  );
}

// --- Ціни та наявність ---------------------------------------------------------------------------

export function PricesTab({ draft, set, errors, product, options, readOnly }: TabProps) {
  const listPrice = draft.promo && draft.oldPrice !== null ? draft.oldPrice : draft.price;
  const autoPercent =
    draft.promo && draft.oldPrice && draft.price !== null && draft.oldPrice > draft.price
      ? Math.round((1 - draft.price / draft.oldPrice) * 100)
      : null;
  const defaultRetail = listPrice !== null ? Math.round(listPrice * 1.1374 * 100) / 100 : null;
  const priceRows = product
    ? Object.entries(product.prices).map(([id, price]) => {
        const type = options.priceTypes.find((item) => item.id === id);
        return {
          label: type?.name ?? `Тип ціни ${id}`,
          value: formatMoney(price),
          hint: type?.role === "base" ? "Ціна для гостей сайту" : type?.role === "individual" ? "Основа партнерських цін" : undefined,
        };
      })
    : [];
  const unit = draft.unit || "шт";

  return (
    <Stack gap={4}>
      <FormSection title="Роздрібна ціна" description="Ціна для покупців сайту, з ПДВ.">
        <div className="flex min-w-0 flex-col gap-5">
          <FormGrid>
            <MoneyInput label="Ціна" required value={draft.price} onChange={(price) => set({ price })} error={errors.price} disabled={readOnly} />
          </FormGrid>
          <Switch
            label="Акція"
            labelPosition="start"
            checked={draft.promo}
            onChange={(promo) => set({ promo })}
            hint="На сайті ціна стає помаранчевою, поруч закреслена стара ціна і мітка знижки"
            disabled={readOnly}
          />
          {draft.promo && (
            <>
              <FormGrid>
                <MoneyInput
                  label="Стара ціна"
                  required
                  value={draft.oldPrice}
                  onChange={(oldPrice) => set({ oldPrice })}
                  hint="Більша за ціну; її видно закресленою"
                  error={errors.oldPrice}
                  disabled={readOnly}
                />
                <NumberInput
                  label="Мітка знижки"
                  optional
                  value={draft.discount}
                  onChange={(discount) => set({ discount })}
                  min={1}
                  max={99}
                  step={1}
                  precision={0}
                  suffix="%"
                  placeholder={autoPercent !== null ? String(autoPercent) : undefined}
                  hint={autoPercent !== null ? `Порожньо: сайт покаже «-${autoPercent}%»` : "Порожньо: сайт порахує сам"}
                  error={errors.discount}
                  disabled={readOnly}
                />
              </FormGrid>
              <Note tone="amber" title="Поки діє акція, роздрібні покупці не можуть купити цей товар">
                Кошик сайту вважає товар з акцією розпроданим і пропонує замість нього інший. Партнерам акція не діє: їхня ціна рахується від старої ціни.
              </Note>
            </>
          )}
        </div>
      </FormSection>

      <FormSection title="Ціни для партнерів" description="Що бачать партнери в кабінеті B2B.">
        <div className="flex min-w-0 flex-col gap-5">
          <FormGrid>
            <MoneyInput
              label="Партнерська ціна"
              optional
              value={draft.partnerPrice}
              onChange={(partnerPrice) => set({ partnerPrice })}
              hint="Порожньо: кожен партнер отримує ціну за прайсом мінус знижку своєї компанії. Заповнена ціна однакова для всіх партнерів і переважає їхні знижки."
              error={errors.partnerPrice}
              disabled={readOnly}
            />
            <MoneyInput
              label="Рекомендована роздрібна"
              optional
              value={draft.retailPrice}
              onChange={(retailPrice) => set({ retailPrice })}
              hint={`Партнери бачать її поруч зі своєю ціною.${defaultRetail !== null ? ` Порожньо: сайт покаже ${formatMoney(defaultRetail)}.` : ""}`}
              error={errors.retailPrice}
              disabled={readOnly}
            />
          </FormGrid>
          {priceRows.length > 0 && (
            <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-bg-subtle p-4">
              <div>
                <p className={TEXT.bodyStrong}>Ціни за типами цін</p>
                <p className={TEXT.caption}>Надходять з облікової системи; тут їх можна лише переглянути.</p>
              </div>
              <KeyValueList columns={2} dense items={priceRows} />
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Наявність" description="Як товар позначено на сайті і чи можна його купити.">
        <SwitchRows>
          <Switch
            label="В наявності"
            labelPosition="start"
            checked={draft.available}
            onChange={(available) => set({ available })}
            hint="Вимкнено: роздрібні покупці бачать «Немає в наявності» і не можуть купити, партнери бачать «Під замовлення»."
            disabled={readOnly}
          />
          <Switch
            label="Під замовлення"
            labelPosition="start"
            checked={draft.preorder}
            onChange={(preorder) => set({ preorder })}
            hint="Для партнерів: позначка «Під замовлення», а замовити товар усе одно можна."
            disabled={readOnly}
          />
          <div className="flex min-w-0 flex-col gap-3">
            <Switch
              label="Ціна залежить від курсу"
              labelPosition="start"
              checked={draft.fxPrice}
              onChange={(fxPrice) => set({ fxPrice })}
              hint="Партнери бачать позначку «ціна залежить від курсу»."
              disabled={readOnly}
            />
            {draft.fxPrice && (
              <div className="w-full min-[640px]:max-w-[280px]">
                <Select
                  label="Валюта"
                  clearable
                  value={draft.currencyLink}
                  onChange={(currencyLink) => set({ currencyLink })}
                  options={CURRENCIES}
                  placeholder="Не вказано"
                  disabled={readOnly}
                />
              </div>
            )}
          </div>
        </SwitchRows>
      </FormSection>

      <FormSection title="Склад" description="Залишок і терміни постачання з облікової системи.">
        <div className="flex min-w-0 flex-col gap-5">
          <FormGrid>
            <NumberInput
              label="Залишок"
              optional
              value={draft.stockQty}
              onChange={(stockQty) => set({ stockQty })}
              min={0}
              suffix={unit}
              hint="Порожньо: залишок невідомий"
              error={errors.stockQty}
              disabled={readOnly}
            />
            <NumberInput
              label="Термін постачання"
              optional
              value={draft.leadTimeDays}
              onChange={(leadTimeDays) => set({ leadTimeDays })}
              min={0}
              max={365}
              step={1}
              precision={0}
              suffix="дн."
              hint="Скільки днів чекати товар, якого немає на складі"
              error={errors.leadTimeDays}
              disabled={readOnly}
            />
          </FormGrid>
          {product && (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <Badge tone={STOCK_TONE[product.stock]} size="md" dot>
                {stockLabel(product.stock)}
              </Badge>
              {product.expectedDate && (
                <span className="text-[13px] font-medium leading-[18px] text-neutral-800">Очікується {formatDate(product.expectedDate)}</span>
              )}
            </div>
          )}
          <Note>
            Коли обмін з BAS увімкнено, облікова система сама оновлює залишок і термін постачання, і зміни, зроблені тут, перезапишуться.{" "}
            {product?.erpSyncedAt ? `Останній обмін: ${formatDateTime(product.erpSyncedAt)}.` : "Обміну для цього товару ще не було."} Купити
            товар на сайті можна чи ні, вирішує перемикач «В наявності», а не залишок.
          </Note>
        </div>
      </FormSection>
    </Stack>
  );
}

// --- Фото ----------------------------------------------------------------------------------------

export function PhotosTab({ draft, set, errors, readOnly, creating }: TabProps & { creating?: boolean }) {
  return (
    <Stack gap={4}>
      <FormSection
        title="Фото картки"
        description="Квадратне фото товару на білому або прозорому тлі. Його бачать у каталозі, у кошику та в замовленнях."
      >
        <ImageField
          label="Фото"
          folder="products"
          aspect="square"
          required
          value={draft.image}
          onChange={(image) => set({ image })}
          error={errors.image}
          hint={creating ? "Це ж фото стане першим у галереї сторінки товару; галерею можна змінити після створення." : undefined}
          disabled={readOnly}
        />
      </FormSection>
      {!creating && (
        <>
          <FormSection
            title="Галерея сторінки товару"
            description="Перше фото - головне. Одне фото сайт показує великим, кілька - головним фото з мініатюрами під ним."
          >
            <GalleryField
              label="Фото"
              folder="products"
              max={PRODUCT_LIMITS.images}
              value={draft.images}
              onChange={(images) => set({ images })}
              error={errors["details.images"]}
              disabled={readOnly}
            />
          </FormSection>
          <FormSection title="Галерея для партнерів" description="Що бачать партнери на сторінці товару в кабінеті B2B.">
            <div className="flex min-w-0 flex-col gap-4">
              <Checkbox
                label="Така сама, як роздрібна"
                checked={draft.mirror}
                onChange={(mirror) => set(mirror ? { mirror } : { mirror, platformImages: draft.mirror ? [...draft.images] : draft.platformImages })}
                disabled={readOnly}
              />
              {!draft.mirror && (
                <GalleryField
                  label="Фото для партнерів"
                  folder="products"
                  max={PRODUCT_LIMITS.images}
                  value={draft.platformImages}
                  onChange={(platformImages) => set({ platformImages })}
                  error={errors["details.platformImages"]}
                  disabled={readOnly}
                />
              )}
            </div>
          </FormSection>
        </>
      )}
    </Stack>
  );
}

// --- Опис ----------------------------------------------------------------------------------------------

export function DescriptionTab({ draft, set, errors, readOnly }: TabProps) {
  const scentError = errorOf(errors, "details.scent");
  return (
    <Stack gap={4}>
      <FormSection title="Опис" description="Вкладка «Опис» на сторінці товару.">
        <Textarea
          label="Текст опису"
          value={draft.description}
          onChange={(description) => set({ description })}
          rows={6}
          autoGrow
          maxRows={24}
          maxLength={PRODUCT_LIMITS.description}
          showCount
          error={errors["details.description"]}
          disabled={readOnly}
        />
      </FormSection>
      <FormSection title="Переваги" description="Короткий список під описом: кожна перевага одним реченням.">
        <TextListEditor
          value={draft.benefits}
          onChange={(benefits) => set({ benefits })}
          itemLabel="Перевага"
          addLabel="Додати перевагу"
          emptyText="Переваг ще немає."
          error={errorOf(errors, "details.benefits")}
          disabled={readOnly}
        />
      </FormSection>
      <FormSection title="Характеристики" description="Таблиця на вкладці «Характеристики»: назва і значення.">
        <SpecRowsEditor
          value={draft.characteristics}
          onChange={(characteristics) => set({ characteristics })}
          labelPlaceholder="Об'єм"
          valuePlaceholder="250 мл"
          emptyText="Характеристик ще немає."
          error={errorOf(errors, "details.characteristics")}
          disabled={readOnly}
        />
      </FormSection>
      <FormSection title="Оплата" description="Рядки вкладки «Доставка та оплата» про оплату.">
        <SpecRowsEditor
          value={draft.payment}
          onChange={(payment) => set({ payment })}
          labelPlaceholder="Спосіб оплати"
          valuePlaceholder="Безготівковий розрахунок"
          emptyText="Умов оплати ще немає."
          error={errorOf(errors, "details.payment")}
          disabled={readOnly}
        />
      </FormSection>
      <FormSection title="Доставка" description="Рядки вкладки «Доставка та оплата» про доставку.">
        <SpecRowsEditor
          value={draft.delivery}
          onChange={(delivery) => set({ delivery })}
          labelPlaceholder="Нова Пошта"
          valuePlaceholder="1-3 дні"
          emptyText="Умов доставки ще немає."
          error={errorOf(errors, "details.delivery")}
          disabled={readOnly}
        />
      </FormSection>
      <FormSection
        title="Піраміда запаху"
        description="Для ароматизованих товарів. Зараз сайт показує вкладку «Піраміда запаху» на кожній сторінці товару, навіть порожньою."
      >
        <div className="flex min-w-0 flex-col gap-5">
          <Textarea
            label="Вступ"
            value={draft.scent.intro}
            onChange={(intro) => set({ scent: { ...draft.scent, intro } })}
            rows={3}
            autoGrow
            maxLength={PRODUCT_LIMITS.scent}
            disabled={readOnly}
          />
          <div className={GRID_3}>
            <Input
              label="Верхні ноти"
              value={draft.scent.top}
              onChange={(top) => set({ scent: { ...draft.scent, top } })}
              maxLength={PRODUCT_LIMITS.scent}
              placeholder="Бергамот, лимон"
              disabled={readOnly}
            />
            <Input
              label="Середні ноти"
              value={draft.scent.middle}
              onChange={(middle) => set({ scent: { ...draft.scent, middle } })}
              maxLength={PRODUCT_LIMITS.scent}
              placeholder="Жасмин, троянда"
              disabled={readOnly}
            />
            <Input
              label="Нижні ноти"
              value={draft.scent.base}
              onChange={(base) => set({ scent: { ...draft.scent, base } })}
              maxLength={PRODUCT_LIMITS.scent}
              placeholder="Мускус, кедр"
              disabled={readOnly}
            />
          </div>
          {scentError && (
            <p role="alert" className="text-[12px] font-medium leading-4 text-negative">
              {scentError}
            </p>
          )}
        </div>
      </FormSection>
    </Stack>
  );
}

// --- Пов'язані товари ------------------------------------------------------------------------------------

export function RelatedTab({
  draft,
  set,
  errors,
  readOnly,
  selfId,
  known,
  remember,
}: TabProps & { selfId: string; known: Record<string, KnownProduct>; remember: (product: KnownProduct) => void }) {
  return (
    <Stack gap={4}>
      <FormSection
        title="Купують разом"
        description="Великі картки з перевагами на сторінці товару. Роздрібні покупці бачать їх, коли товар у наявності."
      >
        <TogetherEditor
          value={draft.boughtTogether}
          onChange={(boughtTogether) => set({ boughtTogether })}
          known={known}
          remember={remember}
          exclude={[selfId]}
          error={errorOf(errors, "details.boughtTogether")}
          disabled={readOnly}
        />
      </FormSection>
      <FormSection title="З цієї серії" description="Ряд карток під описом. Показується разом із «Купують разом».">
        <RelatedListEditor
          value={draft.seriesIds}
          onChange={(seriesIds) => set({ seriesIds })}
          known={known}
          remember={remember}
          exclude={[selfId]}
          pickLabel="Додати товар серії"
          emptyText="Товарів серії ще немає."
          error={errorOf(errors, "details.seriesIds")}
          disabled={readOnly}
        />
      </FormSection>
      <FormSection
        title="Схожі товари"
        description="Сайт показує їх замість двох блоків вище, коли товару немає в наявності (партнерам - також коли він під замовлення)."
      >
        <RelatedListEditor
          value={draft.similarIds}
          onChange={(similarIds) => set({ similarIds })}
          known={known}
          remember={remember}
          exclude={[selfId]}
          pickLabel="Додати схожий товар"
          emptyText="Схожих товарів ще немає."
          error={errorOf(errors, "details.similarIds")}
          disabled={readOnly}
        />
      </FormSection>
    </Stack>
  );
}

// --- Облік ---------------------------------------------------------------------------------------------------

export function AccountingTab({ draft, set, errors, product, options, readOnly }: TabProps) {
  // A code the exchange wrote (it synced this product) is the exchange's to keep.
  const erpOwned = Boolean(product?.erpSyncedAt && product.externalId);
  return (
    <Stack gap={4}>
      <Note onSlab>Ці дані потрібні для обміну з обліковою системою (BAS). Покупці на сайті їх поки не бачать.</Note>
      <FormSection title="Одиниці та упаковки" description="У чому товар рахують і відвантажують.">
        <div className="flex min-w-0 flex-col gap-5">
          <div className={GRID_3}>
            <FreeTextCombo
              label="Одиниця виміру"
              value={draft.unit}
              onChange={(unit) => set({ unit })}
              options={options.units.length ? options.units : ["шт", "пара", "уп"]}
              newLabel="Нова одиниця"
              placeholder="Оберіть або введіть"
              error={errors.unit}
              disabled={readOnly}
            />
            <Input
              label="Код одиниці"
              value={draft.unitCode}
              onChange={(unitCode) => set({ unitCode })}
              maxLength={10}
              hint="Код у BAS, наприклад 796"
              error={errors.unitCode}
              disabled={readOnly}
            />
            <NumberInput
              label="Кратність замовлення"
              required
              value={draft.multiplicity}
              onChange={(multiplicity) => set({ multiplicity })}
              min={1}
              max={100_000}
              step={1}
              precision={0}
              hint="1 - будь-яка кількість"
              error={errors.multiplicity}
              disabled={readOnly}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <p className={TEXT.label}>Упаковки</p>
            <PackagesEditor
              value={draft.packages}
              onChange={(packages) => set({ packages })}
              unit={draft.unit}
              error={errorOf(errors, "packages")}
              disabled={readOnly}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Коди й походження">
        <FormGrid>
          <Input
            label="Штрихкод"
            value={draft.barcode}
            onChange={(barcode) => set({ barcode })}
            maxLength={64}
            inputMode="numeric"
            error={errors.barcode}
            disabled={readOnly}
          />
          {erpOwned ? (
            <Input
              label="Код у BAS"
              value={draft.externalId}
              onChange={() => {}}
              readOnly
              trailing={<CopyButton text={draft.externalId} label="код у BAS" />}
              hint="Записала облікова система: за ним вона знаходить товар"
            />
          ) : (
            <Input
              label="Код у BAS"
              optional
              value={draft.externalId}
              onChange={(externalId) => set({ externalId })}
              maxLength={64}
              hint="Заповнюйте, лише якщо знаєте код товару в обліковій системі"
              error={errors.externalId}
              disabled={readOnly}
            />
          )}
          <FreeTextCombo
            label="Країна"
            value={draft.country}
            onChange={(country) => set({ country })}
            options={options.countries}
            newLabel="Нова країна"
            placeholder="Оберіть або введіть"
            error={errors.country}
            disabled={readOnly}
          />
          <FreeTextCombo
            label="Виробник"
            value={draft.manufacturer}
            onChange={(manufacturer) => set({ manufacturer })}
            options={options.manufacturers}
            newLabel="Новий виробник"
            error={errors.manufacturer}
            disabled={readOnly}
          />
        </FormGrid>
        <p className={cx(TEXT.caption, "mt-4")}>
          {product?.erpSyncedAt ? `Останній обмін з BAS: ${formatDateTime(product.erpSyncedAt)}` : "Обміну з BAS для цього товару ще не було"}
        </p>
      </FormSection>

      <FormSection title="Позначки">
        <SwitchRows>
          <Switch label="Новинка" labelPosition="start" checked={draft.isNew} onChange={(isNew) => set({ isNew })} disabled={readOnly} />
          <Switch label="Популярний" labelPosition="start" checked={draft.isFeatured} onChange={(isFeatured) => set({ isFeatured })} disabled={readOnly} />
          <div className="flex min-w-0 flex-col gap-3">
            <Switch
              label="Кастомізація"
              labelPosition="start"
              checked={draft.isCustomizable}
              onChange={(isCustomizable) => set({ isCustomizable })}
              hint="Товар можна замовити з логотипом або в брендованій упаковці"
              disabled={readOnly}
            />
            {draft.isCustomizable && (
              <div className="w-full min-[640px]:max-w-[280px]">
                <NumberInput
                  label="Мінімальний тираж"
                  optional
                  value={draft.minCustomQty}
                  onChange={(minCustomQty) => set({ minCustomQty })}
                  min={1}
                  step={1}
                  precision={0}
                  suffix={draft.unit || "шт"}
                  error={errors.minCustomQty}
                  disabled={readOnly}
                />
              </div>
            )}
          </div>
        </SwitchRows>
      </FormSection>

      <FormSection title="Файли товару" description="Сертифікати, інструкції, паспорти безпеки.">
        <FilesEditor
          value={draft.files}
          onChange={(files) => set({ files })}
          errors={{ name: errors["files.name"], file: errors["files.file"], list: errors.files }}
          disabled={readOnly}
        />
      </FormSection>
    </Stack>
  );
}

// --- SEO --------------------------------------------------------------------------------------------------------

const EM_DASH = String.fromCharCode(0x2014);

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text;
}

export function SeoTab({ draft, set, errors, product, options, readOnly }: TabProps) {
  const card = options.directions.flatMap((item) => item.categories).find((item) => item.label === draft.subcategory);
  const label = card?.label ?? draft.subcategory;
  // What the product page puts in <title> and the description today
  // (app/catalog/[direction]/[category]/[product]/page.tsx).
  const defaultTitle = `${draft.title} ${EM_DASH} ${label}`;
  const defaultDescription = `${draft.title} (${draft.volume}, ${draft.brand}) у каталозі Binar 2000: ${label.toLowerCase()}. B2B-постачання з кастомізацією під бренд.`;
  const title = draft.seoTitle.trim() || defaultTitle;
  const description = draft.seoDescription.trim() || defaultDescription;
  const titleLength = draft.seoTitle.trim().length;

  return (
    <Stack gap={4}>
      <FormSection title="Сторінка в пошуку" description="Заголовок і опис, які пошуковики показують у результатах.">
        <div className="flex min-w-0 flex-col gap-5">
          <Note>
            Зараз сайт складає заголовок і опис сторінки товару сам, з назви й категорії. Поля нижче збережуться і почнуть діяти, коли сторінка
            товару їх читатиме.
          </Note>
          <Input
            label="Заголовок сторінки"
            optional
            value={draft.seoTitle}
            onChange={(seoTitle) => set({ seoTitle })}
            maxLength={PRODUCT_LIMITS.seoTitle}
            placeholder={defaultTitle}
            hint={titleLength ? `${titleLength} із 60 символів, які показують пошуковики` : "Порожньо: сайт складе заголовок сам. Пошуковики показують до 60 символів"}
            error={errors.seoTitle}
            disabled={readOnly}
          />
          <Textarea
            label="Опис сторінки"
            optional
            value={draft.seoDescription}
            onChange={(seoDescription) => set({ seoDescription })}
            rows={3}
            autoGrow
            maxLength={PRODUCT_LIMITS.seoDescription}
            showCount
            placeholder={defaultDescription}
            hint="Пошуковики показують до 160 символів"
            error={errors.seoDescription}
            disabled={readOnly}
          />
          <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-stroke-subtle p-4">
            <p className={TEXT.caption}>Так сторінку покаже пошук</p>
            <p className="mt-1 truncate text-[13px] leading-[18px] text-neutral-600">{product?.href ?? "/catalog/..."}</p>
            <p className="text-[18px] font-medium leading-6 [overflow-wrap:anywhere]" style={{ color: TONES.indigo.text }}>
              {clip(title, 60)}
            </p>
            <p className="text-[13px] leading-[18px] text-neutral-700 [overflow-wrap:anywhere]">{clip(description, 160)}</p>
          </div>
        </div>
      </FormSection>
    </Stack>
  );
}
