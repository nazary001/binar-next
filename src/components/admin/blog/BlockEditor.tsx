"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  Bars3BottomLeftIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  H2Icon,
  H3Icon,
  InformationCircleIcon,
  ListBulletIcon,
  MinusIcon,
  NumberedListIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { KeyboardEvent, ReactNode } from "react";
import { flushSync } from "react-dom";
import { cx } from "../lib/format";
import { Button, IconButton } from "../ui/Button";
import { DropdownMenu, type MenuItem } from "../ui/DropdownMenu";
import { Input } from "../ui/Input";
import { ImageField } from "../ui/media/ImageField";
import { toast } from "../ui/Toast";
import { COLOR_TRANSITION, FOCUS_RING, TEXT } from "../ui/tokens";
import { AutoTextarea } from "./AutoTextarea";
import { blankBlock, blockError, blockLabel, copyBlock, newBlockKey, type BlockKind, type EditorBlock, type FieldErrors } from "./model";
import { BLOG_LIMITS, type BlogBlockDto } from "./types";

// The body of an article as a column of blocks. Each block is a quiet card:
// a small type label, its fields in the article's own typography, and on
// hover or keyboard focus a toolbar (вище, нижче, дублювати, видалити).
// Between blocks and at the end an "add block" menu.
//
//   <BlockEditor blocks={form.blocks} onChange={(update) => setForm((f) => ({ ...f, blocks: update(f.blocks) }))}
//     errors={errors} disabled={!canEdit} />
//
// Keyboard: Enter in a lede, a paragraph or a heading starts a new
// paragraph below (the text after the caret moves into it); Backspace in
// an empty paragraph removes it. In a list, Enter adds an item and
// Backspace on an empty item removes it. A removed block can be brought
// back from the toast.
//
// The state is the parent's one array of blocks; the keys of new blocks
// are made in the handlers here (newBlockKey), never during render.

type Update = (update: (blocks: EditorBlock[]) => EditorBlock[]) => void;

export type BlockEditorProps = {
  blocks: EditorBlock[];
  onChange: Update;
  errors: FieldErrors;
  disabled?: boolean;
};

const KINDS: { kind: BlockKind; label: string; icon: typeof PlusIcon }[] = [
  { kind: "lede", label: "Вступний абзац", icon: DocumentTextIcon },
  { kind: "paragraph", label: "Абзац", icon: Bars3BottomLeftIcon },
  { kind: "heading2", label: "Заголовок 2 рівня", icon: H2Icon },
  { kind: "heading3", label: "Заголовок 3 рівня", icon: H3Icon },
  { kind: "bullets", label: "Маркований список", icon: ListBulletIcon },
  { kind: "numbers", label: "Нумерований список", icon: NumberedListIcon },
  { kind: "image", label: "Зображення", icon: PhotoIcon },
  { kind: "quote", label: "Цитата", icon: ChatBubbleBottomCenterTextIcon },
  { kind: "callout", label: "Виноска", icon: InformationCircleIcon },
  { kind: "divider", label: "Розділювач", icon: MinusIcon },
];

// --- focus ------------------------------------------------------------------------

function cardOf(key: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-block-key="${CSS.escape(key)}"]`);
}

// Moves focus into a block: a named field, else its first field, else the
// card itself. `caret` puts the caret at the start or the end of a text.
function focusBlock(key: string, field?: string, caret?: "start" | "end") {
  const card = cardOf(key);
  if (!card) return;
  const target =
    (field ? card.querySelector<HTMLElement>(`[data-field="${field}"]`) : null) ??
    card.querySelector<HTMLElement>("textarea:not(:disabled), input:not([type='file']):not(:disabled), [data-autofocus] button:not(:disabled)") ??
    card;
  target.focus();
  if (caret && target instanceof HTMLTextAreaElement) {
    const at = caret === "start" ? 0 : target.value.length;
    target.setSelectionRange(at, at);
  }
}

// --- small parts --------------------------------------------------------------------

function cardLabel(block: BlogBlockDto): string {
  if (block.type === "list") return "Список";
  return blockLabel(block);
}

function Toggle({ pressed, label, icon: Icon, onClick, disabled }: { pressed: boolean; label: string; icon: typeof PlusIcon; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex size-7 cursor-pointer items-center justify-center rounded-full disabled:cursor-default motion-reduce:transition-none",
        COLOR_TRANSITION,
        FOCUS_RING,
        pressed ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-bg-cabinet hover:text-neutral-900",
      )}
    >
      <Icon aria-hidden strokeWidth={1.7} className="size-4" />
    </button>
  );
}

function AddMenu({ label, onAdd, trigger }: { label: string; onAdd: (kind: BlockKind) => void; trigger: "inline" | "button" }) {
  const items: MenuItem[] = KINDS.map((entry) => ({ key: entry.kind, label: entry.label, icon: entry.icon, onSelect: () => onAdd(entry.kind) }));
  return (
    <DropdownMenu
      label={label}
      items={items}
      placement="bottom-start"
      minWidth={240}
      trigger={
        trigger === "button" ? (
          <Button variant="secondary" size="sm" iconLeft={PlusIcon}>
            Додати блок
          </Button>
        ) : (
          (props, { open }) => (
              <button
                {...props}
                type="button"
                aria-label={label}
                title={label}
                className={cx(
                  "relative z-10 inline-flex size-6 cursor-pointer items-center justify-center rounded-full border border-stroke-subtle bg-white text-neutral-500",
                  "hover:border-neutral-900 hover:bg-neutral-900 hover:text-white motion-reduce:transition-none",
                  COLOR_TRANSITION,
                  FOCUS_RING,
                  open ? "opacity-100" : "pointer-fine:opacity-0 pointer-fine:group-hover/insert:opacity-100 focus-visible:opacity-100",
                )}
              >
                <PlusIcon aria-hidden strokeWidth={2} className="size-3.5" />
              </button>
            )
        )
      }
    />
  );
}

// The gap between two blocks, with an "add block here" button that shows
// on hover or keyboard focus (on touch screens the button at the end does
// the job).
function Inserter({ onAdd, position }: { onAdd: (kind: BlockKind) => void; position: number }) {
  return (
    <div className="group/insert relative flex h-4 items-center justify-center pointer-coarse:hidden">
      <span
        aria-hidden
        className="absolute inset-x-3 top-1/2 h-px bg-stroke-subtle opacity-0 transition-opacity duration-200 group-focus-within/insert:opacity-100 group-hover/insert:opacity-100"
      />
      <AddMenu trigger="inline" label={`Додати блок після ${position}-го`} onAdd={onAdd} />
    </div>
  );
}

// --- the fields of one block ----------------------------------------------------------

type FieldsProps = {
  block: BlogBlockDto;
  blockKey: string;
  onBlock: (block: BlogBlockDto) => void;
  onEnterSplit: (before: string, after: string) => void;
  onRemoveEmpty: () => void;
  invalid: boolean;
  disabled: boolean;
};

const TEXT_STYLE = {
  lede: "text-[16px] leading-6 min-[640px]:text-[20px] min-[640px]:leading-7",
  paragraph: "text-[15px] leading-6 min-[640px]:text-[16px]",
  heading2: "text-[20px] font-semibold leading-[26px] tracking-[-0.02em] min-[640px]:text-[24px] min-[640px]:leading-7",
  heading3: "text-[18px] font-semibold leading-6 tracking-[-0.02em] min-[640px]:text-[20px] min-[640px]:leading-[26px]",
} as const;

// Enter (without Shift) splits the text at the caret into a new paragraph.
function splitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>, onSplit: (before: string, after: string) => void) {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
  event.preventDefault();
  const area = event.currentTarget;
  const at = area.selectionStart ?? area.value.length;
  onSplit(area.value.slice(0, at).trimEnd(), area.value.slice(area.selectionEnd ?? at).trimStart());
}

function ListItems({ block, blockKey, onBlock, disabled }: { block: Extract<BlogBlockDto, { type: "list" }>; blockKey: string; onBlock: (block: BlogBlockDto) => void; disabled: boolean }) {
  const setItem = (index: number, text: string) => onBlock({ ...block, items: block.items.map((item, i) => (i === index ? text : item)) });

  const focusItem = (index: number, caret: "start" | "end") => focusBlock(blockKey, `item-${index}`, caret);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (block.items.length >= BLOG_LIMITS.listItems) {
        toast.info(`У списку може бути до ${BLOG_LIMITS.listItems} пунктів.`);
        return;
      }
      const area = event.currentTarget;
      const at = area.selectionStart ?? area.value.length;
      const before = area.value.slice(0, at).trimEnd();
      const after = area.value.slice(area.selectionEnd ?? at).trimStart();
      const items = [...block.items];
      items.splice(index, 1, before, after);
      flushSync(() => onBlock({ ...block, items }));
      focusItem(index + 1, "start");
      return;
    }
    if (event.key === "Backspace" && event.currentTarget.value === "" && block.items.length > 1) {
      event.preventDefault();
      flushSync(() => onBlock({ ...block, items: block.items.filter((_, i) => i !== index) }));
      focusItem(Math.max(0, index - 1), "end");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {block.items.map((item, index) => (
        <div key={index} className="flex items-start gap-3">
          <span aria-hidden className="flex h-8 w-5 shrink-0 items-center justify-end text-[15px] font-medium tabular-nums text-neutral-900 min-[640px]:text-[16px]">
            {block.ordered ? `${index + 1}.` : <span className="size-1.5 rounded-full bg-neutral-900" />}
          </span>
          <AutoTextarea
            value={item}
            onChange={(text) => setItem(index, text)}
            onKeyDown={(event) => onKeyDown(event, index)}
            aria-label={`Пункт ${index + 1}`}
            placeholder={index === 0 ? "Пункт списку" : "Ще пункт"}
            maxLength={BLOG_LIMITS.listItem}
            disabled={disabled}
            data-field={`item-${index}`}
            className={TEXT_STYLE.paragraph}
          />
        </div>
      ))}
    </div>
  );
}

function BlockFields({ block, blockKey, onBlock, onEnterSplit, onRemoveEmpty, invalid, disabled }: FieldsProps) {
  const removeIfEmpty = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Backspace" && event.currentTarget.value === "") {
      event.preventDefault();
      onRemoveEmpty();
    }
  };

  switch (block.type) {
    case "lede":
    case "paragraph":
      return (
        <AutoTextarea
          value={block.text}
          onChange={(text) => onBlock({ ...block, text })}
          onKeyDown={(event) => {
            splitOnEnter(event, onEnterSplit);
            if (block.type === "paragraph") removeIfEmpty(event);
          }}
          aria-label={block.type === "lede" ? "Вступний абзац" : "Текст абзацу"}
          placeholder={block.type === "lede" ? "Кілька речень, що вводять у тему статті" : "Текст абзацу"}
          maxLength={BLOG_LIMITS.blockText}
          invalid={invalid}
          disabled={disabled}
          data-field="text"
          className={block.type === "lede" ? TEXT_STYLE.lede : TEXT_STYLE.paragraph}
        />
      );
    case "heading":
      return (
        <AutoTextarea
          value={block.text}
          onChange={(text) => onBlock({ ...block, text: text.replace(/\n/g, " ") })}
          onKeyDown={(event) => splitOnEnter(event, onEnterSplit)}
          aria-label={`Заголовок ${block.level} рівня`}
          placeholder="Заголовок розділу"
          maxLength={BLOG_LIMITS.blockText}
          invalid={invalid}
          disabled={disabled}
          data-field="text"
          className={block.level === 3 ? TEXT_STYLE.heading3 : TEXT_STYLE.heading2}
        />
      );
    case "list":
      return <ListItems block={block} blockKey={blockKey} onBlock={onBlock} disabled={disabled} />;
    case "image":
      return (
        <div className="flex flex-col gap-4" data-autofocus="">
          <ImageField
            value={block.src}
            onChange={(src) => onBlock({ ...block, src })}
            alt={block.alt}
            onAltChange={(alt) => onBlock({ ...block, alt })}
            folder="blog"
            aspect="wide"
            disabled={disabled}
            error={invalid}
          />
          <Input
            label="Підпис під зображенням"
            optional
            value={block.caption}
            onChange={(caption) => onBlock({ ...block, caption })}
            maxLength={BLOG_LIMITS.imageCaption}
            disabled={disabled}
            className="max-w-[480px]"
          />
        </div>
      );
    case "quote":
      return (
        <div className="flex flex-col gap-1 border-l-2 border-neutral-900 pl-4">
          <AutoTextarea
            value={block.text}
            onChange={(text) => onBlock({ ...block, text })}
            aria-label="Текст цитати"
            placeholder="Текст цитати"
            maxLength={BLOG_LIMITS.blockText}
            invalid={invalid}
            disabled={disabled}
            data-field="text"
            className="text-[16px] font-medium leading-6 min-[640px]:text-[20px] min-[640px]:leading-7"
          />
          <AutoTextarea
            value={block.author}
            onChange={(author) => onBlock({ ...block, author: author.replace(/\n/g, " ") })}
            aria-label="Автор цитати"
            placeholder="Автор цитати (необов'язково)"
            maxLength={BLOG_LIMITS.quoteAuthor}
            disabled={disabled}
            data-field="author"
            className="text-[14px] leading-5 text-neutral-500"
          />
        </div>
      );
    case "callout":
      return (
        <div className="rounded-2xl bg-bg-subtle px-4 py-3">
          <AutoTextarea
            value={block.text}
            onChange={(text) => onBlock({ ...block, text })}
            aria-label="Текст виноски"
            placeholder="Порада, застереження або важливий факт"
            maxLength={BLOG_LIMITS.blockText}
            invalid={invalid}
            disabled={disabled}
            data-field="text"
            surface="tint"
            className={TEXT_STYLE.paragraph}
          />
        </div>
      );
    case "divider":
      return (
        <div className="flex h-8 items-center" data-autofocus="">
          <hr className="w-full border-0 border-t border-stroke-subtle" />
        </div>
      );
  }
}

// --- one block ----------------------------------------------------------------------------

type CardProps = {
  entry: EditorBlock;
  index: number;
  count: number;
  error?: string;
  disabled: boolean;
  onBlock: (block: BlogBlockDto) => void;
  onMove: (delta: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onEnterSplit: (before: string, after: string) => void;
  onRemoveEmpty: () => void;
};

function ToolButton({ action, children }: { action: string; children: ReactNode }) {
  return <span data-action={action}>{children}</span>;
}

function BlockCard({ entry, index, count, error, disabled, onBlock, onMove, onDuplicate, onRemove, onEnterSplit, onRemoveEmpty }: CardProps) {
  const { block, key } = entry;
  const errorId = `block-error-${key}`;
  return (
    <div
      data-block-key={key}
      tabIndex={-1}
      role="group"
      aria-label={`${blockLabel(block)}, блок ${index + 1} з ${count}`}
      aria-describedby={error ? errorId : undefined}
      className={cx(
        "group/block relative rounded-2xl border px-3 pb-2.5 pt-1 outline-none min-[640px]:px-4 motion-reduce:transition-none",
        COLOR_TRANSITION,
        error ? "border-negative" : "border-transparent hover:border-stroke-subtle focus-within:border-stroke-subtle focus:border-stroke-subtle",
      )}
    >
      {/* The label row is low; the toolbar floats over its right end, so a
          block takes no more height than its label and its text. */}
      <div className="flex h-7 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cx(TEXT.caption, "truncate text-neutral-400")}>{cardLabel(block)}</span>
          {block.type === "heading" && !disabled && (
            <span className="flex items-center gap-0.5" role="group" aria-label="Рівень заголовка">
              <Toggle pressed={block.level === 2} label="Заголовок 2 рівня" icon={H2Icon} onClick={() => onBlock({ ...block, level: 2 })} />
              <Toggle pressed={block.level === 3} label="Заголовок 3 рівня" icon={H3Icon} onClick={() => onBlock({ ...block, level: 3 })} />
            </span>
          )}
          {block.type === "list" && !disabled && (
            <span className="flex items-center gap-0.5" role="group" aria-label="Вигляд списку">
              <Toggle pressed={!block.ordered} label="Маркований список" icon={ListBulletIcon} onClick={() => onBlock({ ...block, ordered: false })} />
              <Toggle pressed={block.ordered} label="Нумерований список" icon={NumberedListIcon} onClick={() => onBlock({ ...block, ordered: true })} />
            </span>
          )}
        </div>
        {!disabled && (
          <div
            className={cx(
              "absolute right-1.5 top-0.5 flex items-center rounded-full bg-white transition-opacity duration-200 motion-reduce:transition-none min-[640px]:right-2.5",
              "pointer-fine:opacity-0 pointer-fine:group-hover/block:opacity-100 pointer-fine:group-focus-within/block:opacity-100",
            )}
          >
            <ToolButton action="up">
              <IconButton size="sm" icon={ArrowUpIcon} label="Перемістити вище" disabled={index === 0} onClick={() => onMove(-1)} />
            </ToolButton>
            <ToolButton action="down">
              <IconButton size="sm" icon={ArrowDownIcon} label="Перемістити нижче" disabled={index === count - 1} onClick={() => onMove(1)} />
            </ToolButton>
            <ToolButton action="duplicate">
              <IconButton size="sm" icon={DocumentDuplicateIcon} label="Дублювати блок" onClick={onDuplicate} />
            </ToolButton>
            <ToolButton action="remove">
              <IconButton size="sm" icon={TrashIcon} variant="danger" label="Видалити блок" onClick={onRemove} />
            </ToolButton>
          </div>
        )}
      </div>
      <div className="mt-0.5">
        <BlockFields
          block={block}
          blockKey={key}
          onBlock={onBlock}
          onEnterSplit={onEnterSplit}
          onRemoveEmpty={onRemoveEmpty}
          invalid={Boolean(error)}
          disabled={disabled}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-[12px] font-medium leading-4 text-negative">
          {error}
        </p>
      )}
    </div>
  );
}

// --- the editor ---------------------------------------------------------------------------

export function BlockEditor({ blocks, onChange, errors, disabled = false }: BlockEditorProps) {
  const full = blocks.length >= BLOG_LIMITS.blocks;

  const insert = (at: number, block: BlogBlockDto, field?: string, caret?: "start" | "end") => {
    if (full) {
      toast.info(`У статті може бути до ${BLOG_LIMITS.blocks} блоків.`);
      return;
    }
    const key = newBlockKey();
    flushSync(() => onChange((list) => [...list.slice(0, at), { key, block }, ...list.slice(at)]));
    focusBlock(key, field, caret);
  };

  const add = (at: number, kind: BlockKind) => insert(at, blankBlock(kind));

  const setBlock = (key: string, block: BlogBlockDto) => onChange((list) => list.map((entry) => (entry.key === key ? { key, block } : entry)));

  const move = (index: number, delta: -1 | 1, action: "up" | "down") => {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const key = blocks[index].key;
    flushSync(() =>
      onChange((list) => {
        const next = [...list];
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved);
        return next;
      }),
    );
    // Keep the keyboard on the same button, unless it just became disabled.
    const card = cardOf(key);
    const same = card?.querySelector<HTMLButtonElement>(`[data-action="${action}"] button:not(:disabled)`);
    const other = card?.querySelector<HTMLButtonElement>(`[data-action="${action === "up" ? "down" : "up"}"] button`);
    (same ?? other ?? card)?.focus();
  };

  const duplicate = (index: number) => insert(index + 1, copyBlock(blocks[index].block));

  const remove = (index: number, focusNeighbour: "card" | "text-end") => {
    const entry = blocks[index];
    const neighbour = blocks[index - 1] ?? blocks[index + 1] ?? null;
    flushSync(() => onChange((list) => list.filter((item) => item.key !== entry.key)));
    if (neighbour) {
      if (focusNeighbour === "text-end") focusBlock(neighbour.key, "text", "end");
      else cardOf(neighbour.key)?.focus();
    }
    // The toast brings the block back where it was.
    toast.show({
      tone: "info",
      text: `Блок «${blockLabel(entry.block)}» видалено.`,
      action: {
        label: "Повернути",
        onClick: () => onChange((list) => (list.some((item) => item.key === entry.key) ? list : [...list.slice(0, index), entry, ...list.slice(index)])),
      },
    });
  };

  // Enter in a text block: the text after the caret goes to a new paragraph.
  const split = (index: number, before: string, after: string) => {
    const entry = blocks[index];
    if (full) {
      toast.info(`У статті може бути до ${BLOG_LIMITS.blocks} блоків.`);
      return;
    }
    if ("text" in entry.block) setBlock(entry.key, { ...entry.block, text: before } as BlogBlockDto);
    insert(index + 1, { type: "paragraph", text: after }, "text", "start");
  };

  // Backspace in an empty paragraph: gone, without a toast (nothing is lost).
  const removeEmpty = (index: number) => {
    if (blocks.length <= 1) return;
    const entry = blocks[index];
    const neighbour = blocks[index - 1] ?? blocks[index + 1];
    flushSync(() => onChange((list) => list.filter((item) => item.key !== entry.key)));
    focusBlock(neighbour.key, "text", "end");
  };

  return (
    <div className="flex flex-col">
      {blocks.length === 0 && (
        <p className={cx(TEXT.muted, "rounded-2xl border border-dashed border-stroke-subtle px-4 py-6 text-center")}>
          У статті ще немає тексту. Додайте перший блок.
        </p>
      )}
      {blocks.map((entry, index) => (
        <div key={entry.key}>
          {index > 0 && !disabled && <Inserter position={index} onAdd={(kind) => add(index, kind)} />}
          {index > 0 && disabled && <div className="h-2" />}
          <BlockCard
            entry={entry}
            index={index}
            count={blocks.length}
            error={blockError(errors, index)}
            disabled={disabled}
            onBlock={(block) => setBlock(entry.key, block)}
            onMove={(delta) => move(index, delta, delta < 0 ? "up" : "down")}
            onDuplicate={() => duplicate(index)}
            onRemove={() => remove(index, "card")}
            onEnterSplit={(before, after) => split(index, before, after)}
            onRemoveEmpty={() => removeEmpty(index)}
          />
        </div>
      ))}
      {!disabled && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 min-[640px]:px-4">
          <AddMenu trigger="button" label="Додати блок у кінець статті" onAdd={(kind) => add(blocks.length, kind)} />
          {full && <span className={TEXT.caption}>Досягнуто найбільшої кількості блоків: {BLOG_LIMITS.blocks}.</span>}
        </div>
      )}
    </div>
  );
}
