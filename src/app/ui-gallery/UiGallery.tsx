"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  CabinetPage,
  CabinetPageHead,
  ConfirmModal,
  DocumentTile,
  Dropzone,
  KebabMenu,
  Modal718,
  Modal718Card,
  ModalActions,
  ModalMeta,
  ORDER_STATUS_KEYS,
  OrderStatusBadge,
  PaymentBadge,
  RETURN_STATUS_KEYS,
  ReturnStatusBadge,
  StatusPill,
  TableEmptyRow,
  TitleLight,
  UploadedFileTile,
} from "@/components/platform/ui";

type ModalKey = "confirm" | "documents";

const subscribe = () => () => {};
function useQueryModal(): ModalKey | null {
  const q = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get("modal"),
    () => null,
  );
  return q === "confirm" || q === "documents" ? q : null;
}

const KEBAB_ITEMS = [
  { key: "edit", label: "Редагувати", onSelect: () => {} },
  { key: "delete", label: "Видалити", onSelect: () => {} },
];

const DOC_META = ["19.09.2025", "0.9 МБ", "PDF"];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section data-gallery={id} className="flex flex-col gap-4 px-6 pb-8 lg:pl-10 lg:pr-8">
      <h2 className="text-[22px] font-bold leading-7 tracking-[-0.44px] text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  // Phones: the fixed 536 / 598 / 1014-px demo columns scroll inside the
  // card instead of widening the page.
  return (
    <div className={`flex max-w-full flex-wrap items-start gap-6 overflow-x-auto rounded-[24px] bg-white p-8 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="w-full text-[12px] font-medium uppercase leading-[22px] text-neutral-500">{children}</p>;
}

function DocumentsModalBody() {
  return (
    <>
      <DocumentTile name="Рахунок на оплату" meta={DOC_META} href="/figma-export/materials/placeholder.pdf" onPreview={() => {}} />
      <DocumentTile name="Видаткова накладна №5612" meta={DOC_META} href="/figma-export/materials/placeholder.pdf" onPreview={() => {}} />
      <DocumentTile name="Надходження на рахунок" pending />
    </>
  );
}

export function UiGallery() {
  const queryModal = useQueryModal();
  const [override, setOverride] = useState<ModalKey | "none" | null>(null);
  const modal = override === "none" ? null : (override ?? queryModal);
  const close = () => setOverride("none");
  const [files, setFiles] = useState<string[]>([]);

  return (
    <CabinetPage>
      <div data-gallery="head-list">
        <CabinetPageHead
          title="Мої замовлення"
          subtitle="Переглядайте статуси та деталі ваших замовлень"
          actions={<Button href="/catalog">Зробити замовлення</Button>}
        />
      </div>
      <div data-gallery="head-dashboard">
        <CabinetPageHead
          title={
            <>
              <TitleLight>Вітаю,</TitleLight> Mirotel LTD
            </>
          }
          subtitle="Огляд фінансів та останньої активності компанії"
          actions={
            <>
              <Button variant="outlinedDark">Замовити акт звірки</Button>
              <Button>Зробити замовлення</Button>
            </>
          }
        />
      </div>
      <div data-gallery="head-details">
        <CabinetPageHead
          back={{ label: "До замовлень", href: "/orders" }}
          title={
            <>
              Замовлення <TitleLight>№48291037</TitleLight>
            </>
          }
          meta={
            <>
              <OrderStatusBadge status="new" />
              <PaymentBadge kind="awaiting" />
            </>
          }
          actions={<Button variant="outlinedDark">Скасувати повернення</Button>}
        />
      </div>

      <Section id="badges" title="Badge / Order Status, Статус повернення, Badge / Payment Status">
        <Card>
          <Label>Order status (7, spec 5192:85082)</Label>
          <div data-gallery="order-badges" className="flex flex-wrap gap-4">
            {ORDER_STATUS_KEYS.map((s) => (
              <OrderStatusBadge key={s} status={s} />
            ))}
          </div>
          <Label>Return status (8, set 5070:75404)</Label>
          <div data-gallery="return-badges" className="flex flex-wrap gap-4">
            {RETURN_STATUS_KEYS.map((s) => (
              <ReturnStatusBadge key={s} status={s} />
            ))}
          </div>
          <Label>Payment status (+ with caption)</Label>
          <div data-gallery="payment-badges" className="flex flex-wrap items-start gap-6">
            <PaymentBadge kind="awaiting" />
            <PaymentBadge kind="partial" />
            <PaymentBadge kind="paid" />
            <PaymentBadge kind="awaiting" caption="до 24.07.2026" />
            <PaymentBadge kind="awaiting" caption="Прострочено на 3 дні" captionTone="attention" />
            <PaymentBadge kind="partial" caption="1 500 із 3 900 ₴" />
            <PaymentBadge kind="paid" caption="Оплачено із простроченням" captionTone="attention" />
          </div>
          <Label>Status pill tones (md with dot / sm without)</Label>
          <div data-gallery="pills" className="flex flex-wrap items-center gap-4">
            <StatusPill tone="green">Активний</StatusPill>
            <StatusPill tone="orange">Не активний</StatusPill>
            <StatusPill tone="green" size="sm">
              Активний
            </StatusPill>
            <StatusPill tone="blue" size="sm">
              Запрошено
            </StatusPill>
            <StatusPill tone="brand" size="sm">
              Адміністратор
            </StatusPill>
          </div>
        </Card>
      </Section>

      <Section id="kebab" title="KebabMenu (more + <Menu> 220 x 92)">
        <Card className="items-start">
          <div data-gallery="kebab-closed" className="flex w-[536px] items-start justify-between rounded-[24px] bg-bg-subtle p-6">
            <span className="text-[18px] font-extrabold leading-6 tracking-[-0.36px]">Наталія Мельник</span>
            <span className="flex items-center gap-3">
              <StatusPill tone="green" size="sm">
                Активний
              </StatusPill>
              <KebabMenu items={KEBAB_ITEMS} label="Дії: Наталія Мельник" />
            </span>
          </div>
          <div data-gallery="kebab-open" className="flex h-[200px] w-[536px] items-start justify-between rounded-[24px] bg-bg-subtle p-6">
            <span className="text-[18px] font-extrabold leading-6 tracking-[-0.36px]">Марина Левченко</span>
            <span className="flex items-center gap-3">
              <StatusPill tone="green" size="sm">
                Активний
              </StatusPill>
              <KebabMenu items={KEBAB_ITEMS} label="Дії: Марина Левченко" open onOpenChange={() => {}} />
            </span>
          </div>
        </Card>
      </Section>

      <Section id="files" title="Dropzone, UploadedFileTile, DocumentTile">
        <Card>
          <div className="flex w-[598px] flex-col gap-8">
            <Label>Dropzone (default)</Label>
            <div data-gallery="dropzone">
              <Dropzone
                accept=".pdf,.png,.jpg,.jpeg"
                maxSizeMb={5}
                onFiles={(picked) => setFiles((prev) => [...prev, ...picked.map((f) => f.name)])}
              />
            </div>
            {files.map((name, i) => (
              <UploadedFileTile key={`${name}-${i}`} name={name} onRemove={() => setFiles((prev) => prev.filter((_, j) => j !== i))} />
            ))}
            <Label>Dropzone (drag-over)</Label>
            <Dropzone onFiles={() => {}} active />
            <Label>UploadedFileTile</Label>
            <div data-gallery="uploaded">
              <UploadedFileTile name="Договір_432-01.pdf" onRemove={() => {}} />
            </div>
          </div>
          <div className="flex w-[598px] flex-col gap-6">
            <Label>DocumentTile 598 (default, pending)</Label>
            <div data-gallery="doc-598" className="flex flex-col gap-6">
              <DocumentTile name="Рахунок на оплату" meta={DOC_META} href="/figma-export/materials/placeholder.pdf" onPreview={() => {}} />
              <DocumentTile name="Надходження на рахунок" pending />
            </div>
          </div>
          <div className="flex w-[1014px] flex-col gap-6 rounded-[24px] bg-white">
            <Label>DocumentTile 463 (documents card 5052:56950: two flex-1 + one fixed 463 pending)</Label>
            <div data-gallery="doc-463" className="flex flex-col gap-6 px-8">
              <div className="flex gap-6">
                <DocumentTile name="Рахунок на оплату" meta={DOC_META} href="/figma-export/materials/placeholder.pdf" onPreview={() => {}} className="flex-1" />
                <DocumentTile name="Видаткова накладна №5612" meta={DOC_META} href="/figma-export/materials/placeholder.pdf" onPreview={() => {}} className="flex-1" />
              </div>
              <DocumentTile name="Надходження на рахунок" pending className="w-[463px]" />
            </div>
          </div>
        </Card>
      </Section>

      <Section id="empty" title="TableEmptyRow (200 / 250)">
        <div className="flex flex-col gap-6">
          {(["md", "lg"] as const).map((size) => (
            <div key={size} data-gallery={`empty-${size}`} className="overflow-hidden rounded-[24px] bg-white">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-neutral-800">
                    <th className="h-16 pt-2 text-left text-[14px] font-semibold leading-6 text-white">
                      <span className="block px-10">Замовлення №</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {size === "md" ? (
                    <TableEmptyRow
                      colSpan={1}
                      title="Замовлень ще немає"
                      text="Оформіть перше замовлення, щоб воно з’явилося у цьому списку."
                      actions={
                        <Button size="small" variant="accent" href="/catalog">
                          Зробити замовлення
                        </Button>
                      }
                    />
                  ) : (
                    <TableEmptyRow
                      colSpan={1}
                      size="lg"
                      title="Ваш асортимент ще не сформовано"
                      text="Зробіть перше замовлення, щоб автоматично додати ваші найзатребуваніші товари, або завантажте власний список."
                      actions={
                        <>
                          <Button size="small" variant="outlinedDark">
                            Завантажити з Excel
                          </Button>
                          <Button size="small" variant="accent" href="/catalog">
                            Переглянути каталог
                          </Button>
                        </>
                      }
                    />
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Section>

      <Section id="buttons" title="Button sizes (52 / 42 / 38)">
        <Card className="items-center">
          <Button>Button/Large</Button>
          <Button variant="outlinedDark">Outlined</Button>
          <Button variant="accent">Accent</Button>
          <Button size="small">Button/Small</Button>
          <Button size="small" variant="outlinedDark">
            Outlined
          </Button>
          <Button size="small" variant="accent">
            Accent
          </Button>
          <span data-gallery="btn-xsmall">
            <Button size="xsmall">Написати менеджеру</Button>
          </span>
          <span data-gallery="btn-disabled">
            <Button disabled disabledStyle="solid">
              Додати контрагента
            </Button>
          </span>
          <Button disabled>Disabled (fade)</Button>
        </Card>
      </Section>

      <Section id="modals" title="Modal718 (static cards) + live overlays">
        <div className="flex flex-wrap gap-4">
          <Button size="small" onClick={() => setOverride("confirm")}>
            Відкрити ConfirmModal
          </Button>
          <Button size="small" variant="outlinedDark" onClick={() => setOverride("documents")}>
            Відкрити «Документи замовлення»
          </Button>
        </div>
        <div className="flex max-w-full flex-wrap items-start gap-8 overflow-x-auto">
          <div data-gallery="card-confirm" className="w-[718px]">
            <Modal718Card
              title="Видалити [назва/об’єкт]?"
              description="Ви впевнені, що хочете видалити [назва/об’єкт]? Цю дію неможливо скасувати."
              onClose={() => {}}
              actions={
                <ModalActions>
                  <Button variant="outlinedDark" fullWidth>
                    Скасувати
                  </Button>
                  <Button fullWidth>Підтвердити</Button>
                </ModalActions>
              }
            />
          </div>
          <div data-gallery="card-documents" className="w-[718px]">
            <Modal718Card
              title="Документи замовлення"
              description={<ModalMeta parts={["№48291037", "12.04.2025"]} />}
              onClose={() => {}}
              actions={
                <ModalActions>
                  <Button variant="accent" fullWidth>
                    Завантажити усі документи
                  </Button>
                </ModalActions>
              }
            >
              <DocumentsModalBody />
            </Modal718Card>
          </div>
          <div data-gallery="card-contract" className="w-[718px]">
            <Modal718Card
              title="Договір №432-01"
              titleAdornment={<StatusPill tone="green">Діє</StatusPill>}
              description="ТОВ “Міротель”"
              onClose={() => {}}
              actions={
                <ModalActions>
                  <Button variant="outlinedDark" fullWidth>
                    Назад
                  </Button>
                  <Button variant="accent" fullWidth disabled disabledStyle="solid">
                    Додати договір
                  </Button>
                </ModalActions>
              }
            >
              <Dropzone onFiles={() => {}} />
            </Modal718Card>
          </div>
        </div>
      </Section>

      <ConfirmModal
        open={modal === "confirm"}
        onClose={close}
        onConfirm={close}
        title="Видалити [назва/об’єкт]?"
        body="Ви впевнені, що хочете видалити [назва/об’єкт]? Цю дію неможливо скасувати."
      />
      <Modal718
        open={modal === "documents"}
        onClose={close}
        title="Документи замовлення"
        description={<ModalMeta parts={["№48291037", "12.04.2025"]} />}
        actions={
          <ModalActions>
            <Button variant="accent" fullWidth onClick={close}>
              Завантажити усі документи
            </Button>
          </ModalActions>
        }
      >
        <DocumentsModalBody />
      </Modal718>
    </CabinetPage>
  );
}
