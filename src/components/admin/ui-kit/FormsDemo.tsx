"use client";

import { AtSymbolIcon, LinkIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { useState, type FormEvent } from "react";
import { Button } from "../ui/Button";
import { Checkbox, CheckboxGroup, RadioGroup, Switch } from "../ui/Checkbox";
import { Combobox, MultiCombobox } from "../ui/Combobox";
import { DateInput, DateRange, DateTimeInput } from "../ui/DateInput";
import { Field } from "../ui/Field";
import { FormActions, FormGrid, FormSection, useDirty } from "../ui/Form";
import { Input, MoneyInput, NumberInput, PasswordInput, SearchInput, Textarea } from "../ui/Input";
import { NativeSelect, Select } from "../ui/Select";
import { TagInput } from "../ui/TagInput";
import { toast } from "../ui/Toast";
import type { ControlSize } from "../ui/tokens";
import { NP_CITIES, searchCities, type DemoCity } from "./demoData";
import { FieldGrid, Note, Row, Sample, Section } from "./parts";

const STATUS_OPTIONS = [
  { value: "new", label: "Нове", tone: "blue" as const },
  { value: "inProgress", label: "В роботі", tone: "orange" as const },
  { value: "shipped", label: "Відвантажено", tone: "indigo" as const },
  { value: "completed", label: "Завершено", tone: "mint" as const },
  { value: "cancelled", label: "Скасовано", tone: "red" as const, disabled: true },
];

const MANAGER_OPTIONS = [
  { value: "koval", label: "Олена Коваль", hint: "o.koval@binar2000.com.ua" },
  { value: "melnyk", label: "Андрій Мельник", hint: "a.melnyk@binar2000.com.ua" },
  { value: "bondar", label: "Ірина Бондар", hint: "i.bondar@binar2000.com.ua" },
];

const REGIONS = ["Вінницька", "Волинська", "Дніпропетровська", "Житомирська", "Закарпатська", "Київська", "Львівська", "Одеська", "Харківська"].map(
  (name) => ({ value: name, label: `${name} обл.` }),
);

const UNITS = [
  { value: "pcs", label: "шт." },
  { value: "pack", label: "уп." },
  { value: "box", label: "ящ." },
];

const SIZES: ControlSize[] = ["sm", "md", "lg"];

const cityKey = (city: DemoCity) => city.ref;
const cityLabel = (city: DemoCity) => city.name;

// One row per size with every one-line control of the kit: they must be
// exactly as tall as the button next to them.
function HeightsRow({ size }: { size: ControlSize }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [native, setNative] = useState("");
  const [city, setCity] = useState<DemoCity | null>(null);
  const [day, setDay] = useState("");
  const [q, setQ] = useState("");
  return (
    <Row label={`${size} ${size === "sm" ? 32 : size === "md" ? 40 : 48}`} className="[&>*]:w-[180px] [&>*]:max-w-full">
      <Button size={size}>Кнопка</Button>
      <Input size={size} value={text} onChange={setText} placeholder="Input" aria-label={`Поле ${size}`} />
      <Select size={size} value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="Select" aria-label={`Статус ${size}`} />
      <NativeSelect size={size} value={native} onChange={setNative} options={UNITS} placeholder="NativeSelect" aria-label={`Одиниця ${size}`} />
      <Combobox
        size={size}
        value={city}
        onChange={setCity}
        search={searchCities}
        getKey={cityKey}
        getLabel={cityLabel}
        placeholder="Combobox"
        aria-label={`Місто ${size}`}
      />
      <DateInput size={size} value={day} onChange={setDay} aria-label={`Дата ${size}`} />
      <SearchInput size={size} value={q} onChange={setQ} label={`Пошук ${size}`} />
    </Row>
  );
}

export function HeightsDemo() {
  return (
    <Section id="heights" title="Висоти керувань" file="ui/tokens.ts CONTROL" description="Кнопка, поля, списки, дата й пошук одного розміру стоять в одному рядку однаково високими.">
      <Sample>
        {SIZES.map((size) => (
          <HeightsRow key={size} size={size} />
        ))}
      </Sample>
    </Section>
  );
}

export function FieldDemo() {
  const [color, setColor] = useState("#f85a0b");
  return (
    <Section id="field" title="Field" file="ui/Field.tsx" description="Рамка будь-якого поля: підпис, підказка або помилка. Керування кіту обгортаються самі.">
      <Sample>
        <FieldGrid>
          <Field label="Колір акценту" hint="Для власного керування, якого немає в кіті">
            {(ids) => (
              <input
                id={ids.id}
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                aria-describedby={ids.describedBy}
                className="h-10 w-20 cursor-pointer rounded-full border border-stroke-subtle bg-white px-1"
              />
            )}
          </Field>
          <Field label="З дією в підписі" labelAction={<Button size="sm" variant="ghost">Згенерувати</Button>} optional hint="labelAction і optional">
            {(ids) => <Input id={ids.id} value="" onChange={() => {}} placeholder="Слаг сторінки" aria-describedby={ids.describedBy} />}
          </Field>
          <Field label="Обов'язкове" required error="Заповніть це поле.">
            {(ids) => <Input id={ids.id} value="" onChange={() => {}} aria-describedby={ids.describedBy} error />}
          </Field>
        </FieldGrid>
      </Sample>
    </Section>
  );
}

export function InputsDemo() {
  const [name, setName] = useState("Шампунь для волосся 30 мл");
  const [empty, setEmpty] = useState("");
  const [phone, setPhone] = useState("67 123 45 67");
  const [url, setUrl] = useState("https://binar2000.com.ua/catalog");
  const [email, setEmail] = useState("hotel@");
  const [note, setNote] = useState("Доставка до 12:00, на ресепшн. Попередити за годину.");
  const [grow, setGrow] = useState("");
  const [qty, setQty] = useState<number | null>(120);
  const [discount, setDiscount] = useState<number | null>(7.5);
  const [price, setPrice] = useState<number | null>(18400);
  const [password, setPassword] = useState("");
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  return (
    <Section id="input" title="Input, Textarea, NumberInput, MoneyInput, PasswordInput, SearchInput" file="ui/Input.tsx" description="Текстові поля: value + onChange(value).">
      <Sample title="Input">
        <FieldGrid>
          <Input label="Назва товару" value={name} onChange={setName} required clearable />
          <Input label="Порожнє" value={empty} onChange={setEmpty} placeholder="Наприклад, мило 15 г" hint="Підказка під полем" />
          <Input label="Телефон" prefix="+380" inputMode="tel" value={phone} onChange={setPhone} />
          <Input label="Посилання" leftIcon={LinkIcon} value={url} onChange={setUrl} clearable />
          <Input label="E-mail" leftIcon={AtSymbolIcon} type="email" value={email} onChange={setEmail} error="Перевірте адресу: немає домену." />
          <Input label="Вимкнене" value="ТОВ «Бінар 2000»" onChange={() => {}} disabled />
          <Input label="Лише читання" value="10042381" onChange={() => {}} readOnly hint="Номер присвоює система" />
          <Input label="Вага" value="250" onChange={() => {}} suffix="г" align="right" />
          <Input label="Малий розмір" size="sm" value="" onChange={() => {}} placeholder="sm 32" />
        </FieldGrid>
      </Sample>

      <Sample title="Textarea">
        <FieldGrid className="xl:grid-cols-2">
          <Textarea label="Коментар до замовлення" value={note} onChange={setNote} maxLength={500} showCount />
          <Textarea label="Росте з текстом" value={grow} onChange={setGrow} autoGrow rows={2} maxRows={8} placeholder="Почніть писати..." hint="autoGrow, до 8 рядків" />
          <Textarea label="З помилкою" value="" onChange={() => {}} rows={3} error="Опишіть причину повернення." required />
          <Textarea label="Вимкнена" value="Текст, який не можна змінити" onChange={() => {}} rows={3} disabled />
        </FieldGrid>
      </Sample>

      <Sample title="NumberInput, MoneyInput">
        <FieldGrid>
          <NumberInput label="Кількість" value={qty} onChange={setQty} min={1} step={1} precision={0} stepper suffix="шт." />
          <NumberInput label="Знижка" value={discount} onChange={setDiscount} min={0} max={100} step={0.5} suffix="%" hint="Стрілки вгору і вниз, Shift - по 10" />
          <MoneyInput label="Ціна" value={price} onChange={setPrice} />
          <MoneyInput label="Без значення" value={null} onChange={() => {}} placeholder="0,00" />
          <NumberInput label="Вимкнене" value={3} onChange={() => {}} disabled stepper />
          <MoneyInput label="З помилкою" value={0} onChange={() => {}} error="Ціна має бути більше нуля." />
        </FieldGrid>
        <Note>
          Кількість: {qty ?? "порожньо"}; знижка: {discount ?? "порожньо"}; ціна: {price ?? "порожньо"}. Число фіксується на blur і Enter.
        </Note>
      </Sample>

      <Sample title="PasswordInput, SearchInput">
        <FieldGrid>
          <PasswordInput label="Новий пароль" value={password} onChange={setPassword} generate hint="Щонайменше 10 символів" />
          <PasswordInput label="Поточний пароль" value="binar2026" onChange={() => {}} />
          {/* SearchInput's label is its accessible name; a visible one comes from Field. */}
          <Field label="Пошук замовлень" hint={`onChange після паузи: «${q}»; Enter: «${submitted}»`}>
            {(ids) => (
              <SearchInput id={ids.id} value={q} onChange={setQ} placeholder="Номер, клієнт або телефон" onSubmit={setSubmitted} label="Пошук замовлень" />
            )}
          </Field>
        </FieldGrid>
      </Sample>
    </Section>
  );
}

export function SelectDemo() {
  const [status, setStatus] = useState<string>("inProgress");
  const [manager, setManager] = useState<string | null>(null);
  const [region, setRegion] = useState("");
  return (
    <Section id="select" title="Select, NativeSelect" file="ui/Select.tsx" description="Одне значення з короткого списку; клавіатура як у WAI-ARIA select.">
      <Sample>
        <FieldGrid>
          <Select label="Статус" value={status} onChange={setStatus} options={STATUS_OPTIONS} hint="З тонами статусів; «Скасовано» недоступне" />
          <Select label="Менеджер" value={manager} onChange={setManager} clearable placeholder="Усі менеджери" options={MANAGER_OPTIONS} />
          <Select label="З помилкою" value={null} onChange={() => {}} options={STATUS_OPTIONS} error="Оберіть статус." required />
          <Select label="Вимкнений" value="new" onChange={() => {}} options={STATUS_OPTIONS} disabled />
          <Select label="Порожній список" value={null} onChange={() => {}} options={[]} placeholder="Немає варіантів" />
          <NativeSelect label="Область (системний список)" value={region} onChange={setRegion} options={REGIONS} placeholder="Оберіть область" />
        </FieldGrid>
      </Sample>
    </Section>
  );
}

export function ComboboxDemo() {
  const [city, setCity] = useState<DemoCity | null>(NP_CITIES[1]);
  const [empty, setEmpty] = useState<DemoCity | null>(null);
  const [cities, setCities] = useState<DemoCity[]>([NP_CITIES[0], NP_CITIES[5]]);
  return (
    <Section id="combobox" title="Combobox, MultiCombobox" file="ui/Combobox.tsx" description="Запис із серверного пошуку. Тут пошук імітований (450 мс); «помилка» у запиті показує стан збою.">
      <Sample>
        <FieldGrid>
          <Combobox
            label="Місто"
            value={city}
            onChange={setCity}
            search={searchCities}
            getKey={cityKey}
            getLabel={cityLabel}
            leftIcon={MapPinIcon}
            clearable
            renderOption={(item) => (
              <>
                <span className="block">{item.name}</span>
                <span className="block text-[12px] font-medium leading-4 text-neutral-500">{item.region}</span>
              </>
            )}
          />
          <Combobox
            label="Від двох літер"
            value={empty}
            onChange={setEmpty}
            search={searchCities}
            getKey={cityKey}
            getLabel={cityLabel}
            minChars={2}
            placeholder="Почніть вводити назву"
            hint="Шукає від двох літер"
          />
          <Combobox
            label="Вимкнений"
            value={null}
            onChange={() => {}}
            search={searchCities}
            getKey={cityKey}
            getLabel={cityLabel}
            disabled
            placeholder="Спершу оберіть область"
          />
          <MultiCombobox
            label="Міста доставки"
            value={cities}
            onChange={setCities}
            search={searchCities}
            getKey={cityKey}
            getLabel={cityLabel}
            max={5}
            hint="До 5 міст"
            className="min-[640px]:col-span-2"
          />
          <Combobox
            label="З помилкою"
            value={null}
            onChange={() => {}}
            search={searchCities}
            getKey={cityKey}
            getLabel={cityLabel}
            error="Оберіть місто зі списку."
            required
          />
        </FieldGrid>
      </Sample>
    </Section>
  );
}

export function ChoiceDemo() {
  const [notify, setNotify] = useState(true);
  const [terms, setTerms] = useState(false);
  const [visible, setVisible] = useState(true);
  const [np, setNp] = useState(false);
  const [payment, setPayment] = useState<string | null>("invoice");
  const [delivery, setDelivery] = useState<string | null>("np");
  const [channels, setChannels] = useState<string[]>(["email"]);
  const all = channels.length === 3;
  const some = channels.length > 0 && !all;
  return (
    <Section id="checkbox" title="Checkbox, Switch, RadioGroup, CheckboxGroup" file="ui/Checkbox.tsx" description="Вибір: справжні input під намальованим полем; помаранчевий означає «увімкнено».">
      <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
        <Sample title="Checkbox">
          <Checkbox checked={notify} onChange={setNotify} label="Надіслати клієнту лист" hint="Лист піде на адресу з профілю" />
          <Checkbox
            checked={all}
            indeterminate={some}
            onChange={(on) => setChannels(on ? ["email", "sms", "viber"] : [])}
            label="Усі канали (частково вибрано)"
          />
          <Checkbox checked={terms} onChange={setTerms} label="Погоджуюся з умовами" error={terms ? undefined : "Без згоди не можна продовжити."} />
          <Checkbox checked onChange={() => {}} label="Вимкнений, увімкнений" disabled />
          <Checkbox checked={false} onChange={() => {}} label="Вимкнений" disabled />
          <Row label="Без підпису">
            <Checkbox checked={notify} onChange={setNotify} aria-label="Вибрати рядок" />
          </Row>
        </Sample>
        <Sample title="Switch">
          <Switch checked={visible} onChange={setVisible} label="Показувати на сайті" hint="Товар бачать усі відвідувачі" />
          <Switch checked={np} onChange={setNp} label="Нова Пошта" labelPosition="start" hint="labelPosition start: для рядків налаштувань" />
          <Switch checked={visible} onChange={setVisible} label="Малий" size="sm" />
          <Switch checked onChange={() => {}} label="Вимкнений" disabled />
        </Sample>
        <Sample title="RadioGroup">
          <RadioGroup
            label="Оплата"
            value={payment}
            onChange={setPayment}
            options={[
              { value: "invoice", label: "Рахунок для юросіб" },
              { value: "card", label: "Карткою онлайн" },
              { value: "cod", label: "Накладений платіж", disabled: true },
            ]}
          />
          <RadioGroup
            label="Доставка"
            value={delivery}
            onChange={setDelivery}
            variant="tiles"
            direction="horizontal"
            options={[
              { value: "np", label: "Нова Пошта", hint: "1-2 дні, за тарифом перевізника" },
              { value: "own", label: "Наш транспорт", hint: "Київ і область, безкоштовно від 5 000 ₴" },
              { value: "pickup", label: "Самовивіз", hint: "Склад у Броварах, 9:00-18:00" },
            ]}
          />
        </Sample>
        <Sample title="CheckboxGroup">
          <CheckboxGroup
            label="Канали сповіщень"
            value={channels}
            onChange={setChannels}
            options={[
              { value: "email", label: "E-mail" },
              { value: "sms", label: "SMS", hint: "Лише про відвантаження" },
              { value: "viber", label: "Viber" },
            ]}
          />
          <CheckboxGroup
            label="З помилкою"
            value={[]}
            onChange={() => {}}
            direction="horizontal"
            error="Оберіть хоча б один день."
            options={[
              { value: "mon", label: "Пн" },
              { value: "wed", label: "Ср" },
              { value: "fri", label: "Пт" },
            ]}
          />
        </Sample>
      </div>
    </Section>
  );
}

export function TagDateDemo() {
  const [tags, setTags] = useState(["готель", "SPA", "еко"]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [due, setDue] = useState("2026-11-20");
  const [publishAt, setPublishAt] = useState("2026-11-14T09:30");
  const [range, setRange] = useState({ from: "", to: "" });
  return (
    <>
      <Section id="taginput" title="TagInput, Chip" file="ui/TagInput.tsx" description="Короткі значення як чипи: Enter або кома додає, Backspace прибирає останній.">
        <Sample>
          <FieldGrid className="xl:grid-cols-2">
            <TagInput label="Теги" value={tags} onChange={setTags} />
            <TagInput
              label="Ключові слова"
              value={keywords}
              onChange={setKeywords}
              max={5}
              maxLength={40}
              suggestions={["готель", "хостел", "SPA", "апартаменти", "ресторан"]}
              normalize={(tag) => tag.toLocaleLowerCase("uk")}
              hint="До 5 слів; підказки зі списку"
            />
            <TagInput label="Вимкнене" value={["опт"]} onChange={() => {}} disabled />
            <TagInput label="Малий розмір" size="sm" value={["sm"]} onChange={() => {}} />
          </FieldGrid>
        </Sample>
      </Section>

      <Section id="dateinput" title="DateInput, DateTimeInput, DateRange" file="ui/DateInput.tsx" description="Системні поля дати в пігулці кіту; дні - рядки YYYY-MM-DD за Києвом.">
        <Sample>
          <FieldGrid>
            <DateInput label="Дата оплати" value={due} onChange={setDue} clearable />
            <DateTimeInput label="Опублікувати" value={publishAt} onChange={setPublishAt} clearable hint="Місцевий час" />
            <DateInput label="З помилкою" value="" onChange={() => {}} error="Вкажіть дату." required />
            <DateInput label="Вимкнене" value="2026-11-01" onChange={() => {}} disabled />
          </FieldGrid>
          <DateRange label="Період" from={range.from} to={range.to} onChange={setRange} presets clearable />
          <Note>
            Обрано: {range.from || "..."} - {range.to || "..."}
          </Note>
        </Sample>
      </Section>
    </>
  );
}

type ProductForm = { name: string; sku: string; price: number | null; unit: string; visible: boolean; description: string };

const LOADED: ProductForm = {
  name: "Мило туалетне 15 г, флоупак",
  sku: "BN-SOAP-15",
  price: 2.85,
  unit: "pcs",
  visible: true,
  description: "Для готелів 2-3 зірки. Упаковка 500 шт.",
};

export function FormDemo() {
  const [form, setForm] = useState<ProductForm>(LOADED);
  const [saved, setSaved] = useState<ProductForm>(LOADED);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});
  const dirty = useDirty(saved, form);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Вкажіть назву.";
    if (form.price === null || form.price <= 0) next.price = "Ціна має бути більше нуля.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setSaved(form);
      toast.success("Зміни збережено");
    }, 900);
  };

  return (
    <Section id="form" title="FormSection, FormGrid, FormActions, useDirty" file="ui/Form.tsx" description="Розкладка екрана редагування: секції-картки, сітка полів, кнопки в кінці.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormSection title="Основне" description="Що бачить покупець у картці товару.">
          <FormGrid>
            <Input label="Назва" value={form.name} onChange={(name) => setForm({ ...form, name })} error={errors.name} required className="col-span-full" />
            <Input label="Артикул" value={form.sku} onChange={(sku) => setForm({ ...form, sku })} hint="Як у BAS" />
            <MoneyInput label="Ціна" value={form.price} onChange={(price) => setForm({ ...form, price })} error={errors.price} required />
            <Select label="Одиниця" value={form.unit} onChange={(unit) => setForm({ ...form, unit })} options={UNITS} />
            <Switch checked={form.visible} onChange={(visible) => setForm({ ...form, visible })} label="Показувати на сайті" />
            <Textarea
              label="Опис"
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
              rows={3}
              className="col-span-full"
            />
          </FormGrid>
        </FormSection>
        <FormActions status={dirty ? "Є незбережені зміни" : "Усі зміни збережено"}>
          <Button variant="secondary" onClick={() => setForm(saved)} disabled={!dirty || saving}>
            Скасувати
          </Button>
          <Button type="submit" loading={saving} disabled={!dirty}>
            Зберегти зміни
          </Button>
        </FormActions>
      </form>
    </Section>
  );
}
