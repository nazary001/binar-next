"use client";

import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  DocumentDuplicateIcon,
  FunnelIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Avatar } from "../ui/Avatar";
import { Badge, CountBadge } from "../ui/Badge";
import { Button, ButtonGroup, IconButton } from "../ui/Button";
import { Skeleton, SkeletonRows, SkeletonText } from "../ui/Skeleton";
import { Spinner } from "../ui/Spinner";
import { Tooltip } from "../ui/Tooltip";
import { TONES, type Tone } from "../ui/tokens";
import { SAMPLE_IMAGES } from "./demoData";
import { Note, Row, Sample, Section } from "./parts";

const TONE_NAMES: { tone: Tone; label: string }[] = [
  { tone: "blue", label: "Нове" },
  { tone: "orange", label: "В роботі" },
  { tone: "indigo", label: "Відвантажено" },
  { tone: "green", label: "Оплачено" },
  { tone: "amber", label: "На розгляді" },
  { tone: "mint", label: "Завершено" },
  { tone: "red", label: "Відхилено" },
  { tone: "neutral", label: "Чернетка" },
  { tone: "brand", label: "Потребує уваги" },
];

export function ButtonsDemo() {
  const [saving, setSaving] = useState(false);
  const [pinned, setPinned] = useState(false);
  const save = () => {
    setSaving(true);
    window.setTimeout(() => setSaving(false), 1600);
  };
  return (
    <Section id="button" title="Button, IconButton, ButtonGroup" file="ui/Button.tsx" description="Пігулки дій: чорна основна, що інвертується при наведенні, як на сайті.">
      <Sample title="Варіанти">
        <Row label="primary">
          <Button onClick={save} loading={saving}>
            Зберегти зміни
          </Button>
          <Button iconLeft={PlusIcon}>Додати товар</Button>
          <Button disabled>Недоступно</Button>
        </Row>
        <Row label="accent">
          <Button variant="accent" iconLeft={TruckIcon}>
            Створити накладну
          </Button>
          <Button variant="accent" disabled>
            Створити накладну
          </Button>
        </Row>
        <Row label="secondary">
          <Button variant="secondary" iconLeft={ArrowDownTrayIcon}>
            Експорт CSV
          </Button>
          <Button variant="secondary" iconRight={ArrowTopRightOnSquareIcon} href="/" external>
            Відкрити на сайті
          </Button>
          <Button variant="secondary" disabled>
            Скасувати
          </Button>
        </Row>
        <Row label="ghost">
          <Button variant="ghost">Скасувати</Button>
          <Button variant="ghost" iconLeft={FunnelIcon}>
            Фільтри
          </Button>
          <Button variant="ghost" disabled>
            Скасувати
          </Button>
        </Row>
        <Row label="danger">
          <Button variant="danger" iconLeft={TrashIcon}>
            Видалити назавжди
          </Button>
          <Button variant="dangerGhost">Видалити</Button>
          <Button variant="danger" disabled>
            Видалити
          </Button>
        </Row>
        <Row label="loading">
          <Button loading>Зберегти зміни</Button>
          <Button variant="secondary" loading iconLeft={ArrowDownTrayIcon}>
            Експорт CSV
          </Button>
          <Button variant="accent" loading size="sm">
            Надіслати
          </Button>
        </Row>
      </Sample>

      <Sample title="Розміри: sm 32, md 40, lg 48">
        <Row label="Кнопки">
          <Button size="sm">Зберегти</Button>
          <Button size="md">Зберегти</Button>
          <Button size="lg">Зберегти</Button>
          <Button size="sm" variant="secondary" iconLeft={PlusIcon}>
            Додати
          </Button>
          <Button size="lg" variant="secondary" iconLeft={PlusIcon}>
            Додати
          </Button>
        </Row>
        <Row label="IconButton">
          <IconButton size="sm" label="Редагувати" icon={PencilSquareIcon} />
          <IconButton size="md" label="Редагувати" icon={PencilSquareIcon} />
          <IconButton size="lg" label="Редагувати" icon={PencilSquareIcon} />
          <IconButton variant="secondary" label="Скопіювати" icon={DocumentDuplicateIcon} />
          <IconButton variant="primary" label="Додати" icon={PlusIcon} />
          <IconButton variant="danger" label="Видалити рядок" icon={TrashIcon} />
          <IconButton label="Закріпити фільтр" icon={CheckIcon} pressed={pinned} onClick={() => setPinned((value) => !value)} />
          <IconButton label="Завантажується" icon={PlusIcon} loading />
          <IconButton label="Недоступно" icon={TrashIcon} variant="danger" disabled />
        </Row>
        <Row label="fullWidth">
          <div className="w-full max-w-[360px]">
            <Button fullWidth>Увійти</Button>
          </div>
        </Row>
      </Sample>

      <Sample title="ButtonGroup">
        <ButtonGroup align="between" label="Дії форми">
          <Button variant="dangerGhost">Видалити товар</Button>
          <ButtonGroup>
            <Button variant="secondary">Скасувати</Button>
            <Button>Зберегти зміни</Button>
          </ButtonGroup>
        </ButtonGroup>
      </Sample>
    </Section>
  );
}

export function BadgesDemo() {
  return (
    <Section id="badge" title="Badge, CountBadge" file="ui/Badge.tsx" description="Статусні пігулки дев'яти тонів і лічильники.">
      <Sample>
        <Row label="sm 24">
          {TONE_NAMES.map(({ tone, label }) => (
            <Badge key={tone} tone={tone}>
              {label}
            </Badge>
          ))}
        </Row>
        <Row label="sm з крапкою">
          {TONE_NAMES.slice(0, 8).map(({ tone, label }) => (
            <Badge key={tone} tone={tone} dot>
              {label}
            </Badge>
          ))}
        </Row>
        <Row label="md 28">
          <Badge tone="indigo" size="md" dot>
            Відвантажено
          </Badge>
          <Badge tone="amber" size="md">
            Очікує ключа
          </Badge>
          <Badge tone="neutral" size="md" title="Партнер B2B з 2021 року">
            Партнер B2B
          </Badge>
        </Row>
        <Row label="CountBadge">
          <span className="inline-flex items-center gap-2 text-[14px] font-medium">
            Нові заявки <CountBadge value={3} label="Нових заявок: 3" />
          </span>
          <span className="inline-flex items-center gap-2 text-[14px] font-medium">
            Повернення <CountBadge value={128} label="Повернень: 128" />
          </span>
          <span className="inline-flex items-center gap-2 text-[14px] font-medium">
            Усього товарів <CountBadge value={1248} tone="neutral" max={9999} label="Усього товарів: 1248" />
          </span>
          <span className="inline-flex items-center gap-2 text-[14px] font-medium">
            Нуль <CountBadge value={0} tone="neutral" showZero />
          </span>
        </Row>
      </Sample>
    </Section>
  );
}

export function SpinnerSkeletonDemo() {
  return (
    <>
      <Section id="spinner" title="Spinner" file="ui/Spinner.tsx" description="Кільце зайнятого стану; з label його чує екранний читач.">
        <Sample>
          <Row label="Розміри">
            <Spinner size="sm" />
            <Spinner />
            <Spinner size="lg" />
            <Spinner size="lg" label="Завантажуємо замовлення" className="text-brand" />
            <span className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-1.5 text-[13px] text-white">
              <Spinner size="sm" /> На темному
            </span>
          </Row>
        </Sample>
      </Section>

      <Section id="skeleton" title="Skeleton, SkeletonText, SkeletonRows" file="ui/Skeleton.tsx" description="Стан завантаження карток і таблиць.">
        <div className="grid min-w-0 gap-4 min-[1024px]:grid-cols-2">
          <Sample title="Форми">
            <Row label="bar / pill">
              <Skeleton className="h-5 w-40" />
              <Skeleton shape="pill" className="h-8 w-24" />
            </Row>
            <Row label="circle / tile">
              <Skeleton shape="circle" className="size-10" />
              <Skeleton shape="tile" className="size-16" />
              <Skeleton shape="card" className="h-16 w-32" />
            </Row>
            <SkeletonText lines={3} />
          </Sample>
          <SkeletonRows rows={4} columns={4} />
        </div>
      </Section>
    </>
  );
}

export function AvatarTooltipDemo() {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Section id="avatar" title="Avatar" file="ui/Avatar.tsx" description="Ініціали на темному диску або фото; зламане фото повертає ініціали.">
        <Sample>
          <Row label="Розміри">
            <Avatar name="Олена Коваль" size="sm" />
            <Avatar name="Олена Коваль" />
            <Avatar name="ТОВ Готель Дністер" size="lg" />
            <Avatar name="Андрій Мельник" size="xl" />
          </Row>
          <Row label="Фото">
            <Avatar name="Готель Едельвейс" src={SAMPLE_IMAGES[0]} size="lg" />
            {/* A picture that cannot be decoded (no request, no console noise): the initials come back. */}
            <Avatar name="Зламане посилання" src="data:image/png;base64,iVBORw0KGgo=" size="lg" />
            <span className="inline-flex items-center gap-2 text-[14px] font-medium">
              <Avatar name="Ірина Бондар" size="sm" decorative /> Ірина Бондар
            </span>
          </Row>
        </Sample>
      </Section>

      <Section id="tooltip" title="Tooltip" file="ui/Tooltip.tsx" description="Коротка темна підказка після 300 мс наведення або на фокусі клавіатури.">
        <Sample>
          <Row label="Зразки">
            <Tooltip content={copied ? "Скопійовано" : "Скопіювати номер"} describe={false}>
              <IconButton
                label="Скопіювати номер замовлення"
                icon={copied ? CheckIcon : DocumentDuplicateIcon}
                variant="secondary"
                onClick={() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
              />
            </Tooltip>
            <Tooltip content="12.11.2026, 14:32" placement="bottom">
              <span tabIndex={0} className="rounded-md text-[14px] font-medium text-neutral-800 underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-brand">
                2 години тому
              </span>
            </Tooltip>
            <Tooltip content="Спершу оберіть хоча б одне замовлення">
              <span tabIndex={0} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
                <Button variant="secondary" disabled>
                  Друкувати накладні
                </Button>
              </span>
            </Tooltip>
          </Row>
          <Note>{"Наведіть мишу або пройдіть Tab: підказка з'являється біля елемента і зникає на Escape."}</Note>
        </Sample>
      </Section>
    </>
  );
}

// The nine tones as swatches, for the people who pick a tone for a status.
export function TonesDemo() {
  return (
    <div className="grid grid-cols-3 gap-2 min-[640px]:grid-cols-5 xl:grid-cols-9">
      {TONE_NAMES.map(({ tone }) => (
        <div key={tone} className="flex flex-col gap-1.5 rounded-2xl p-3" style={{ backgroundColor: TONES[tone].bg }}>
          <span className="size-3 rounded-full" style={{ backgroundColor: TONES[tone].dot }} />
          <span className="text-[13px] font-semibold" style={{ color: TONES[tone].text }}>
            {tone}
          </span>
        </div>
      ))}
    </div>
  );
}
