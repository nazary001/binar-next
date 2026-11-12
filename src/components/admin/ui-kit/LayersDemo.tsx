"use client";

import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  FunnelIcon,
  PencilSquareIcon,
  PrinterIcon,
  TableCellsIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { PaletteTrigger, openPalette } from "../ui/CommandPalette";
import { confirmDialog, promptDialog } from "../ui/ConfirmDialog";
import { DateRange } from "../ui/DateInput";
import { Drawer } from "../ui/Drawer";
import { DropdownMenu, KebabMenu } from "../ui/DropdownMenu";
import { Input, Textarea } from "../ui/Input";
import { KeyValueList } from "../ui/KeyValue";
import { Modal, ModalFooter, type ModalSize } from "../ui/Modal";
import { Popover } from "../ui/Popover";
import { Select } from "../ui/Select";
import { toast, toastError } from "../ui/Toast";
import { Note, Row, Sample, Section } from "./parts";

const STATUS = [
  { value: "new", label: "Нове", tone: "blue" as const },
  { value: "inProgress", label: "В роботі", tone: "orange" as const },
  { value: "shipped", label: "Відвантажено", tone: "indigo" as const },
];

export function ModalDemo() {
  const [size, setSize] = useState<ModalSize | null>(null);
  const [status, setStatus] = useState("new");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [long, setLong] = useState(false);
  const close = () => setSize(null);
  const save = () => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setSize(null);
      toast.success("Статус змінено");
    }, 1200);
  };
  return (
    <Section id="modal" title="Modal, ModalFooter" file="ui/Modal.tsx" description="Діалог: картка по центру від 640 px, шторка знизу на телефоні. Escape і хрестик закривають, фокус повертається.">
      <Sample>
        <Row label="Розміри">
          {(["sm", "md", "lg", "xl"] as ModalSize[]).map((value) => (
            <Button key={value} variant="secondary" onClick={() => setSize(value)}>
              Відкрити {value}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setLong(true)}>
            Довгий вміст
          </Button>
        </Row>
      </Sample>
      <Modal
        open={size !== null}
        onClose={close}
        size={size ?? "md"}
        title="Змінити статус"
        description="Клієнт побачить новий статус у кабінеті."
        busy={busy}
        footer={<ModalFooter onCancel={close} confirmLabel="Зберегти зміни" form="demo-status-form" busy={busy} />}
      >
        <form
          id="demo-status-form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="flex flex-col gap-4"
        >
          <Select label="Новий статус" value={status} onChange={setStatus} options={STATUS} />
          <Textarea label="Коментар для клієнта" value={comment} onChange={setComment} rows={3} optional />
        </form>
      </Modal>
      <Modal
        open={long}
        onClose={() => setLong(false)}
        title="Умови співпраці"
        footer={<ModalFooter onCancel={() => setLong(false)} confirmLabel="Зрозуміло" onConfirm={() => setLong(false)} />}
      >
        <div className="flex flex-col gap-3 text-[14px] leading-6 text-neutral-700">
          {Array.from({ length: 14 }, (_, index) => (
            <p key={index}>
              {index + 1}. Партнер отримує ціни своєї групи після підтвердження реквізитів. Замовлення від 5 000 ₴ доставляємо безкоштовно в межах Києва та
              області; решту - Новою Поштою за тарифами перевізника.
            </p>
          ))}
        </div>
      </Modal>
    </Section>
  );
}

export function DrawerDemo() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Олена Коваль");
  return (
    <Section id="drawer" title="Drawer" file="ui/Drawer.tsx" description="Панель справа поверх затемнення: подробиці запису, довга форма. На телефоні на весь екран.">
      <Sample>
        <Row>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Відкрити заявку
          </Button>
        </Row>
      </Sample>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Заявка №318"
        description="Надійшла з форми «Співпраця»"
        width={560}
        headerActions={
          <KebabMenu
            label="Дії із заявкою"
            items={[
              { key: "spam", label: "Позначити як спам", onSelect: () => toast.info("Позначено як спам") },
              { key: "delete", label: "Видалити", icon: TrashIcon, tone: "danger", onSelect: () => toast.info("Це лише зразок") },
            ]}
          />
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Закрити
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                toast.success("Заявку взято в роботу");
              }}
            >
              Взяти в роботу
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <KeyValueList
            items={[
              { label: "Компанія", value: "Апарт-готель «Львівська брама»" },
              { label: "Телефон", value: "+380 67 123 45 67", copy: "+380671234567" },
              { label: "Повідомлення", value: "Цікавить косметика для 40 номерів, поставка щомісяця." },
            ]}
          />
          <Input label="Відповідальний" value={name} onChange={setName} />
        </div>
      </Drawer>
    </Section>
  );
}

export function ConfirmDemo() {
  const [answer, setAnswer] = useState("");
  return (
    <Section id="confirm" title="confirmDialog, promptDialog, ConfirmHost" file="ui/ConfirmDialog.tsx" description="Питання з будь-якого обробника, відповідь - Promise. Небезпечна дія ставить фокус на «Скасувати».">
      <Sample>
        <Row>
          <Button
            variant="secondary"
            onClick={async () => {
              const yes = await confirmDialog({ title: "Відвантажити замовлення?", text: "Клієнт отримає лист із номером ТТН.", confirmLabel: "Відвантажити" });
              setAnswer(yes ? "Підтверджено" : "Скасовано");
            }}
          >
            Підтвердження
          </Button>
          <Button
            variant="dangerGhost"
            iconLeft={TrashIcon}
            onClick={async () => {
              const yes = await confirmDialog({ title: "Видалити товар?", text: "Його не буде видно на сайті.", confirmLabel: "Видалити", tone: "danger" });
              setAnswer(yes ? "Видалено" : "Скасовано");
            }}
          >
            Небезпечне
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const reason = await promptDialog({
                title: "Відхилити повернення",
                label: "Причина відхилення",
                multiline: true,
                required: true,
                confirmLabel: "Відхилити",
                tone: "danger",
              });
              setAnswer(reason === null ? "Скасовано" : `Причина: ${reason}`);
            }}
          >
            Запит тексту
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              const first = confirmDialog({ title: "Перше питання", text: "Питання стають у чергу." });
              const second = confirmDialog({ title: "Друге питання", text: "Відкривається після першого." });
              const [a, b] = await Promise.all([first, second]);
              setAnswer(`Черга: ${a ? "так" : "ні"}, ${b ? "так" : "ні"}`);
            }}
          >
            Два підряд
          </Button>
        </Row>
        <Note>Відповідь: {answer || "ще не було"}</Note>
      </Sample>
    </Section>
  );
}

export function MenuPopoverDemo() {
  const [lastAction, setLastAction] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [range, setRange] = useState({ from: "", to: "" });
  return (
    <>
      <Section id="dropdown" title="DropdownMenu, KebabMenu" file="ui/DropdownMenu.tsx" description="Меню дій: стрілки, Home і End, пошук літерою, Escape повертає фокус.">
        <Sample>
          <Row>
            <DropdownMenu
              label="Експорт"
              trigger={
                <Button variant="secondary" iconLeft={ArrowDownTrayIcon} iconRight={ChevronDownIcon}>
                  Експорт
                </Button>
              }
              items={[
                { key: "h1", heading: "Формат" },
                { key: "csv", label: "CSV для Excel", icon: TableCellsIcon, onSelect: () => setLastAction("CSV"), hint: "UTF-8" },
                { key: "pdf", label: "PDF для друку", icon: DocumentTextIcon, onSelect: () => setLastAction("PDF") },
                { key: "print", label: "Надрукувати накладні", icon: PrinterIcon, disabled: true, hint: "Немає вибраних" },
                { key: "sep", divider: true },
                { key: "h2", heading: "Небезпечні дії" },
                { key: "delete", label: "Видалити вибрані", icon: TrashIcon, tone: "danger", onSelect: () => setLastAction("Видалити") },
              ]}
            />
            <KebabMenu
              label="Дії із замовленням №10042381"
              items={[
                { key: "open", label: "Відкрити", href: "/admin/ui-kit#dropdown" },
                { key: "edit", label: "Редагувати", icon: PencilSquareIcon, onSelect: () => setLastAction("Редагувати") },
                { key: "site", label: "Відкрити на сайті", href: "/" },
              ]}
            />
            <KebabMenu size="sm" label="Малий kebab" items={[{ key: "a", label: "Дія", onSelect: () => setLastAction("Дія") }]} />
            <KebabMenu label="Недоступно" items={[]} disabled />
          </Row>
          <Note>Остання дія: {lastAction || "ще не було"}</Note>
        </Sample>
      </Section>

      <Section id="popover" title="Popover" file="ui/Popover.tsx" description="Невелика картка від кнопки: набір фільтрів, коротка форма. Не модальна.">
        <Sample>
          <Row>
            <Popover label="Фільтри замовлень" width={360} trigger={<Button variant="secondary" iconLeft={FunnelIcon}>Фільтри</Button>}>
              {({ close }) => (
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    close();
                    toast.success("Фільтри застосовано");
                  }}
                >
                  <DateRange label="Період" from={range.from} to={range.to} onChange={setRange} />
                  <Checkbox checked={onlyMine} onChange={setOnlyMine} label="Лише мої замовлення" />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={close}>
                      Скасувати
                    </Button>
                    <Button size="sm" type="submit">
                      Застосувати
                    </Button>
                  </div>
                </form>
              )}
            </Popover>
            <Popover
              label="Про накладну"
              placement="bottom-end"
              trigger={(props) => (
                <Button {...props} variant="ghost" iconRight={ChevronDownIcon}>
                  Подробиці
                </Button>
              )}
            >
              <p className="text-[14px] leading-5">Накладна створена автоматично після оплати. Номер прийде в лист клієнту.</p>
            </Popover>
          </Row>
        </Sample>
      </Section>
    </>
  );
}

export function ToastPaletteDemo() {
  return (
    <>
      <Section id="toast" title="toast, toastError, ToastHost" file="ui/Toast.tsx" description="Короткі повідомлення: до 4 одночасно, повтор замінює себе, відлік зупиняється під курсором.">
        <Sample>
          <Row>
            <Button variant="secondary" onClick={() => toast.success("Зміни збережено")}>
              Успіх
            </Button>
            <Button variant="secondary" onClick={() => toast.error("Не вдалося зберегти товар")}>
              Помилка
            </Button>
            <Button variant="secondary" onClick={() => toast.info("Експорт готується, файл завантажиться сам")}>
              Інформація
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.show({
                  tone: "success",
                  title: "Замовлення скасовано",
                  text: "Клієнт отримає лист.",
                  action: { label: "Повернути", onClick: () => toast.info("Скасування відмінено") },
                })
              }
            >
              З дією
            </Button>
            <Button variant="secondary" onClick={() => toastError({ ok: false, status: 409, error: "state", data: {} })}>
              toastError
            </Button>
            <Button variant="ghost" onClick={() => toast.dismiss()}>
              Прибрати всі
            </Button>
          </Row>
        </Sample>
      </Section>

      <Section id="palette" title="CommandPalette, PaletteTrigger" file="ui/CommandPalette.tsx" description="Пошук по панелі: Ctrl+K, Cmd+K або «/». Розділи меню за роллю і записи з /api/admin/search.">
        <Sample>
          <Row>
            <div className="w-full max-w-[360px]">
              <PaletteTrigger />
            </div>
            <Button variant="secondary" onClick={openPalette}>
              openPalette()
            </Button>
          </Row>
        </Sample>
      </Section>
    </>
  );
}
