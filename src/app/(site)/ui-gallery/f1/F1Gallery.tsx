"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { ConfirmModal } from "@/components/platform/ui/ConfirmModal";
import { DocumentTile } from "@/components/platform/ui/DocumentTile";
import { Modal718, ModalActions, ModalMeta } from "@/components/platform/ui/Modal718";
import { StatusPill } from "@/components/platform/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import {
  OptionRow,
  RadioOffIcon,
  RadioOnIcon,
  Sheet,
  SheetBar,
  SheetDivider,
  SheetGroup,
} from "@/components/ui/Sheet";
import { STICKY_BAR_DARK, StickyBar, SUMMARY_AMOUNT, SUMMARY_LABEL } from "@/components/ui/StickyBar";
import { showToast } from "@/components/ui/Toast";
import { usePhone } from "@/components/ui/useMediaQuery";

// Dev gallery of the F1 phone atoms (system spec 3.4: A1 Button, A5 Sheet,
// A6 Modal718 phone card / sheet + ConfirmModal, A13 StickyBar, A23 Toast)
// for screenshots and geometry checks at 320 / 360 / 390 / 430 / 600.
// ?open=<key> opens one overlay on load (keys below).

type OpenKey =
  | "sheet"
  | "sheet-long"
  | "sheet-plain"
  | "sheet-keep"
  | "card-confirm"
  | "card-docs"
  | "card-long"
  | "card-contract"
  | "card-top"
  | "modal-sheet"
  | "modal-sheet-cancel";

const KEYS: OpenKey[] = [
  "sheet",
  "sheet-long",
  "sheet-plain",
  "sheet-keep",
  "card-confirm",
  "card-docs",
  "card-long",
  "card-contract",
  "card-top",
  "modal-sheet",
  "modal-sheet-cancel",
];

const noop = () => () => {};
function useQueryOpen(): OpenKey | null {
  const q = useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get("open"),
    () => null,
  );
  return KEYS.includes(q as OpenKey) ? (q as OpenKey) : null;
}

const DOC_META = ["19.09.2025", "0.9 МБ", "PDF"];
const PDF = "/figma-export/materials/placeholder.pdf";

const VOLUMES = ["30 мл", "50 мл", "100 мл", "250 мл", "500 мл"];
const AVAILABILITY = ["В наявності", "Під замовлення"];
const SORTS = ["Спочатку нові", "Спочатку старі", "Сума: від більшої", "Сума: від меншої"];
const REASONS = ["Помилка в замовленні", "Змінилася потреба"];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section data-f1={id} className="flex flex-col gap-6 border-t border-stroke-subtle pt-12">
      <h2 className="text-title-lg text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return <p className="text-[12px] font-medium uppercase leading-5 text-neutral-500">{children}</p>;
}

function Docs({ count }: { count: number }) {
  const names = ["Рахунок на оплату", "Видаткова накладна №5612", "Акт виконаних робіт", "Податкова накладна", "Договір поставки №432-01", "Специфікація до договору"];
  return (
    <>
      {names.slice(0, count).map((name) => (
        <DocumentTile key={name} name={name} meta={DOC_META} href={PDF} onPreview={() => {}} />
      ))}
    </>
  );
}

export function F1Gallery() {
  const queryOpen = useQueryOpen();
  const [override, setOverride] = useState<OpenKey | "none" | null>(null);
  const openKey = override === "none" ? null : (override ?? queryOpen);
  const open = (k: OpenKey) => setOverride(k);
  const close = () => setOverride("none");
  const phone = usePhone();
  const { openCart } = useCart();

  // Filter-sheet draft (T5a): taps edit the draft, "Показати" closes.
  const [volumes, setVolumes] = useState<string[]>(["50 мл"]);
  const [avail, setAvail] = useState<string>(AVAILABILITY[0]);
  const [sort, setSort] = useState<string>(SORTS[0]);
  const [reason, setReason] = useState<string>("");
  const found = 12 + volumes.length * 7;
  const active = volumes.length > 0 || avail !== AVAILABILITY[0];
  const [buyBar, setBuyBar] = useState(true);
  // A confirm card stacked over the open filter sheet (lock refcount).
  const [stacked, setStacked] = useState(false);

  const filtersFooter = (
    <>
      <p role="status" aria-live="polite" className="text-body-sm text-neutral-500">
        Знайдено {found} товарів
      </p>
      <div className="flex gap-2">
        <Button
          size="small"
          variant="outlinedDark"
          fullWidth
          disabled={!active}
          onClick={() => {
            setVolumes([]);
            setAvail(AVAILABILITY[0]);
          }}
        >
          Скинути
        </Button>
        <Button size="small" fullWidth onClick={close}>
          Показати
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-12 px-6 pt-12 pb-[160px] lg:px-20">
      <header className="flex flex-col gap-4">
        <h1 className="text-h2 text-neutral-900">F1 атоми</h1>
        <p className="text-body-sm text-neutral-500">{phone ? "Телефон (< 640)" : "Десктоп (>= 640)"}</p>
      </header>

      <Section id="buttons" title="A1 Button">
        <Caption>size large (за замовчуванням) = 42 на телефоні</Caption>
        <div data-f1="btn-large" className="flex flex-wrap items-center gap-2">
          <Button>Зробити замовлення</Button>
          <Button variant="outlinedDark">Скасувати</Button>
          <Button variant="accent" arrow>
            Оформити замовлення
          </Button>
        </div>
        <Caption>large, responsive, small, xsmall</Caption>
        <div data-f1="btn-sizes" className="flex flex-wrap items-center gap-2">
          <Button variant="outlinedDark">
            Показати більше
          </Button>
          <Button size="responsive" arrow>
            Детальніше
          </Button>
          <Button size="small">Показати</Button>
          <Button size="xsmall">Написати менеджеру</Button>
        </div>
        <Caption>fullWidth: дві в рядку (flex-1, 8) та стовпчиком (8)</Caption>
        <div data-f1="btn-row" className="flex gap-2">
          <Button size="small" variant="outlinedDark" fullWidth>
            Скинути
          </Button>
          <Button size="small" fullWidth>
            Показати
          </Button>
        </div>
        <div data-f1="btn-stack" className="flex flex-col gap-2">
          <Button variant="outlinedDark" fullWidth>
            Повернутись до каталогу
          </Button>
          <Button variant="accent" fullWidth>
            Оформити замовлення
          </Button>
        </div>
      </Section>

      <Section id="sheets" title="A5 Sheet">
        <div className="flex flex-col gap-2">
          <Button size="small" fullWidth onClick={() => open("sheet")}>
            Фільтри
          </Button>
          <Button size="small" variant="outlinedDark" fullWidth onClick={() => open("sheet-long")}>
            Деякі товари закінчилися
          </Button>
          <Button size="small" variant="outlinedDark" fullWidth onClick={() => open("sheet-plain")}>
            Перегляд
          </Button>
        </div>
        <Caption>SheetBar (статичний) + радіо</Caption>
        <div data-f1="sheetbar-static" className="-mx-6 border-y border-stroke-subtle">
          <SheetBar title="Кошик" onClose={() => {}} closeLabel="Закрити кошик" titleAs="p" />
        </div>
        <div data-f1="radio-icons" className="flex items-center gap-4">
          <RadioOffIcon className="size-6" />
          <RadioOnIcon className="size-6" />
        </div>
      </Section>

      <Section id="modals" title="A6 Modal718 + ConfirmModal">
        <div className="flex flex-col gap-2">
          <Button size="small" fullWidth onClick={() => open("card-confirm")}>
            Видалити [назва/об’єкт]?
          </Button>
          <Button size="small" variant="outlinedDark" fullWidth onClick={() => open("card-docs")}>
            Документи замовлення
          </Button>
          <Button size="small" variant="outlinedDark" fullWidth onClick={() => open("card-long")}>
            Документи замовлення (6)
          </Button>
          <Button size="small" variant="outlinedDark" fullWidth onClick={() => open("card-contract")}>
            Договір №432-01
          </Button>
          <Button size="small" variant="outlinedDark" fullWidth onClick={() => open("card-top")}>
            Змінити пароль
          </Button>
          <Button size="small" variant="outlinedDark" fullWidth onClick={() => open("modal-sheet")}>
            Договори
          </Button>
          <Button size="small" variant="outlinedDark" fullWidth onClick={() => open("modal-sheet-cancel")}>
            Скасувати замовлення
          </Button>
        </div>
      </Section>

      <Section id="toasts" title="A23 Toast">
        <div className="flex flex-col gap-2">
          <Button size="small" fullWidth onClick={() => showToast("Договір додано")}>
            Договір додано
          </Button>
          <Button
            size="small"
            variant="outlinedDark"
            fullWidth
            onClick={() =>
              showToast({ message: "Додано у кошик", action: { label: "Кошик", onClick: openCart } })
            }
          >
            Додано у кошик
          </Button>
          <Button
            size="small"
            variant="outlinedDark"
            fullWidth
            onClick={() => showToast({ message: "Запит надіслано", keepOnNavigate: true, phoneOnly: false })}
          >
            Запит надіслано
          </Button>
        </div>
      </Section>

      <Section id="sticky" title="A13 StickyBar">
        <Caption>dark (статичний зразок)</Caption>
        <div data-f1="sticky-dark-static" className={`-mx-6 ${STICKY_BAR_DARK}`}>
          <div className="flex flex-col gap-2">
            <span className={SUMMARY_LABEL}>Сума замовлення</span>
            <span className={SUMMARY_AMOUNT}>1 234,50 ₴</span>
          </div>
          <div className="mt-6 flex flex-col">
            <Button variant="accent" fullWidth>
              Оформити замовлення
            </Button>
          </div>
        </div>
        <Button size="small" variant="outlinedDark" fullWidth onClick={() => setBuyBar((v) => !v)}>
          {buyBar ? "Приховати" : "У кошик"}
        </Button>
        <div data-f1="sticky-host" className="-mx-6 flex flex-col">
          <div className="flex h-[480px] items-center justify-center bg-bg-subtle text-body-sm text-neutral-500">
            Обрано: 3 товари
          </div>
          <StickyBar tone="light" position="sticky" label="Дії з вибраними">
            <div className="flex gap-2">
              <Button size="small" variant="outlinedDark" fullWidth>
                Видалити
              </Button>
              <Button size="small" fullWidth>
                У кошик
              </Button>
            </div>
          </StickyBar>
        </div>
      </Section>

      <StickyBar tone="dark" position="fixed" show={buyBar} label="Купити">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className={SUMMARY_LABEL}>Сума замовлення</span>
            <span className={SUMMARY_AMOUNT}>189,90 ₴</span>
          </div>
          <Button size="small" variant="accent">
            У кошик
          </Button>
        </div>
      </StickyBar>

      {/* ---- overlays ---- */}
      <Sheet
        open={openKey === "sheet"}
        onClose={close}
        title="Фільтри"
        closeLabel="Закрити фільтри"
        footer={filtersFooter}
      >
        <SheetGroup id="f1-avail" title="Наявність">
          <div role="radiogroup" aria-labelledby="f1-avail-title">
            {AVAILABILITY.map((a) => (
              <OptionRow key={a} type="radio" name="f1-avail" value={a} checked={avail === a} onSelect={() => setAvail(a)}>
                {a}
              </OptionRow>
            ))}
          </div>
        </SheetGroup>
        <SheetDivider />
        <SheetGroup id="f1-volume" title="Об’єм" caption="Можна обрати кілька" collapsible>
          <ul role="list" aria-labelledby="f1-volume-title">
            {VOLUMES.map((v) => (
              <li key={v}>
                <OptionRow
                  type="checkbox"
                  checked={volumes.includes(v)}
                  onSelect={() =>
                    setVolumes((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]))
                  }
                >
                  {v}
                </OptionRow>
              </li>
            ))}
          </ul>
        </SheetGroup>
        <SheetDivider />
        <SheetGroup id="f1-sort" title="Сортування" collapsible defaultOpen={false}>
          <div role="radiogroup" aria-labelledby="f1-sort-title">
            {SORTS.map((s) => (
              <OptionRow key={s} type="radio" name="f1-sort" value={s} checked={sort === s} onSelect={() => setSort(s)}>
                {s}
              </OptionRow>
            ))}
          </div>
        </SheetGroup>
        <SheetDivider />
        <div className="flex flex-col gap-2">
          <Button size="small" variant="outlinedDark" fullWidth onClick={() => showToast("Договір додано")}>
            Договір додано
          </Button>
          <Button size="small" variant="outlinedDark" fullWidth onClick={() => setStacked(true)}>
            Видалити [назва/об’єкт]?
          </Button>
        </div>
      </Sheet>

      <ConfirmModal
        open={stacked}
        onClose={() => setStacked(false)}
        onConfirm={() => setStacked(false)}
        title="Видалити [назва/об’єкт]?"
        body="Ви впевнені, що хочете видалити [назва/об’єкт]? Цю дію неможливо скасувати."
      />

      <Sheet
        open={openKey === "sheet-long"}
        onClose={close}
        title="Деякі товари закінчилися"
        shortTitle="Наявність товарів"
        closeLabel="Закрити перевірку наявності"
        footer={
          <>
            <p className="text-body-sm text-neutral-500">Залишилось вирішити: 2 з 3</p>
            <div className="flex flex-col gap-2">
              <Button variant="outlinedDark" fullWidth onClick={close}>
                Повернутись до каталогу
              </Button>
              <Button variant="accent" fullWidth disabled disabledStyle="solid">
                Оформити замовлення
              </Button>
            </div>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="flex h-24 items-center rounded-[32px] bg-bg-subtle px-6 text-body-md text-neutral-800">
              Шампунь для волосся {i + 1}
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet open={openKey === "sheet-plain"} onClose={close} title="Перегляд" closeLabel="Закрити перегляд">
        <p className="text-[16px] leading-6 text-neutral-800">Каталог продукції 2025.pdf</p>
      </Sheet>

      {/* ?open=sheet-keep only: closeOnDesktop={false} (the return wizard
          case) - from 640 the layer is hidden and must not lock the page. */}
      <Sheet
        open={openKey === "sheet-keep"}
        onClose={close}
        title="Перегляд"
        closeLabel="Закрити перегляд"
        closeOnDesktop={false}
      >
        <p className="text-[16px] leading-6 text-neutral-800">Каталог продукції 2025.pdf</p>
      </Sheet>

      <ConfirmModal
        open={openKey === "card-confirm"}
        onClose={close}
        onConfirm={close}
        title="Видалити [назва/об’єкт]?"
        body="Ви впевнені, що хочете видалити [назва/об’єкт]? Цю дію неможливо скасувати."
      />

      <Modal718
        open={openKey === "card-docs"}
        onClose={close}
        title="Документи замовлення"
        description={<ModalMeta parts={["№48291037", "12.04.2025"]} />}
        actions={
          <ModalActions>
            <Button variant="accent" fullWidth onClick={close}>
              <span className="lg:hidden">Завантажити все</span>
              <span className="max-lg:hidden">Завантажити усі документи</span>
            </Button>
          </ModalActions>
        }
      >
        <Docs count={3} />
      </Modal718>

      <Modal718
        open={openKey === "card-long"}
        onClose={close}
        title="Документи замовлення"
        description={<ModalMeta parts={["№48291037", "12.04.2025"]} />}
        actions={
          <ModalActions>
            <Button variant="outlinedDark" fullWidth onClick={close}>
              Скасувати
            </Button>
            <Button variant="accent" fullWidth onClick={close}>
              <span className="lg:hidden">Завантажити все</span>
              <span className="max-lg:hidden">Завантажити усі документи</span>
            </Button>
          </ModalActions>
        }
      >
        <Docs count={6} />
      </Modal718>

      <Modal718
        open={openKey === "card-contract"}
        onClose={close}
        title={
          <>
            Договір <span className="whitespace-nowrap">№432-01</span>
          </>
        }
        titleAdornment={<StatusPill tone="green">Діє</StatusPill>}
        description="ТОВ “Міротель”"
        actions={
          <ModalActions>
            <Button variant="outlinedDark" fullWidth onClick={close}>
              Назад
            </Button>
            <Button variant="accent" fullWidth disabled disabledStyle="solid">
              Додати договір
            </Button>
          </ModalActions>
        }
      >
        <Docs count={1} />
      </Modal718>

      <Modal718
        open={openKey === "card-top"}
        onClose={close}
        align="top"
        title="Змінити пароль"
        actions={
          <ModalActions>
            <Button variant="outlinedDark" fullWidth onClick={close}>
              Скасувати
            </Button>
            <Button fullWidth onClick={close}>
              Зберегти
            </Button>
          </ModalActions>
        }
      >
        {["Поточний пароль", "Новий пароль", "Повторіть пароль"].map((label) => (
          <label key={label} className="flex flex-col gap-2">
            <span className="text-[14px] font-medium leading-5 text-neutral-500">{label}</span>
            <input
              type="password"
              autoComplete="off"
              className="h-[46px] rounded-3xl border border-stroke-subtle px-[23px] text-[16px] outline-none focus-visible:border-neutral-900"
            />
          </label>
        ))}
      </Modal718>

      <Modal718
        open={openKey === "modal-sheet"}
        onClose={close}
        phone="sheet"
        closeLabel="Закрити договори"
        title="Договори"
        description="ТОВ “Міротель”"
        actions={
          <ModalActions>
            <Button variant="accent" fullWidth onClick={close}>
              Додати договір
            </Button>
          </ModalActions>
        }
      >
        <Docs count={6} />
      </Modal718>

      <Modal718
        open={openKey === "modal-sheet-cancel"}
        onClose={close}
        phone="sheet"
        title="Скасувати замовлення"
        shortTitle="Скасування"
        closeLabel="Закрити скасування замовлення"
        description={<ModalMeta parts={["№48291037", "12.04.2025"]} />}
        actions={
          <ModalActions>
            <Button variant="outlinedDark" fullWidth onClick={close}>
              Повернутись
            </Button>
            <Button variant="accent" fullWidth disabled={!reason} disabledStyle="solid" onClick={close}>
              Скасувати замовлення
            </Button>
          </ModalActions>
        }
      >
        <div role="radiogroup" aria-label="Оберіть причину" className="flex flex-col">
          <p className="pb-2 text-[14px] font-medium leading-5 text-neutral-500">Оберіть причину</p>
          {REASONS.map((r) => (
            <OptionRow key={r} type="radio" name="f1-reason" value={r} checked={reason === r} onSelect={() => setReason(r)}>
              {r}
            </OptionRow>
          ))}
        </div>
      </Modal718>
    </div>
  );
}
