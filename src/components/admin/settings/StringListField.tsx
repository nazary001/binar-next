"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { useRef, useState, type ReactNode } from "react";
import { cx } from "../lib/format";
import { Button, IconButton } from "../ui/Button";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { moveItem } from "../ui/media/GalleryField";
import { TEXT } from "../ui/tokens";

// An ordered list of short strings: each value a row with arrows to move
// it and a cross to remove it, and an input to add one at the end. The
// kit's TagInput keeps the order of typing only; the blog's rubrics are
// shown on the site in this order, so the order itself is the setting.
// (Composed here because the kit has no reorderable tag list; reported.)
//
//   <StringListField label="Рубрики" value={list} onChange={setList} max={20} maxLength={60}
//     hint="..." error={error} disabled={!canEdit} addLabel="Додати рубрику" />
//
// The same value twice (case does not matter) is refused with a message
// under the input; so is a value past `max`.

type StringListFieldProps = {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  hint?: ReactNode;
  error?: ReactNode;
  max?: number;
  maxLength?: number;
  disabled?: boolean;
  placeholder?: string;
  addLabel?: string;
  // What one value is called in the messages ("рубрика").
  noun?: { one: string; accusative: string };
};

export function StringListField({
  label,
  value,
  onChange,
  hint,
  error,
  max,
  maxLength,
  disabled = false,
  placeholder = "Нова назва",
  addLabel = "Додати",
  noun = { one: "значення", accusative: "значення" },
}: StringListFieldProps) {
  const [text, setText] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLOListElement | null>(null);
  const full = max !== undefined && value.length >= max;

  const add = () => {
    const item = text.trim();
    if (!item) return;
    if (value.some((existing) => existing.toLocaleLowerCase("uk") === item.toLocaleLowerCase("uk"))) {
      setRefusal(`Така ${noun.one} вже є в списку.`);
      return;
    }
    if (full) {
      setRefusal(`Не більше ${max}.`);
      return;
    }
    onChange([...value, item]);
    setText("");
    setRefusal(null);
    setAnnouncement(`Додано «${item}»`);
  };

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= value.length) return;
    onChange(moveItem(value, index, target));
    setAnnouncement(`«${value[index]}» тепер на місці ${target + 1}`);
    // At an end the same arrow becomes disabled: keep the focus on the row.
    window.requestAnimationFrame(() => {
      const row = listRef.current?.querySelector<HTMLElement>(`[data-row="${target}"]`);
      const same = row?.querySelector<HTMLButtonElement>(`[data-move="${by < 0 ? "up" : "down"}"]:not(:disabled)`);
      (same ?? row?.querySelector<HTMLButtonElement>("button:not(:disabled)"))?.focus();
    });
  };

  const remove = (index: number) => {
    const removed = value[index];
    onChange(value.filter((_, at) => at !== index));
    setAnnouncement(`Прибрано «${removed}»`);
  };

  return (
    <Field label={label} labelAs="span" hint={hint} error={error} disabled={disabled}>
      <div className="flex min-w-0 flex-col gap-3">
        {value.length > 0 ? (
          <ol ref={listRef} className="flex min-w-0 flex-col gap-1.5" aria-label={label}>
            {value.map((item, index) => (
              <li
                key={`${index}:${item}`}
                data-row={index}
                className="flex min-h-11 min-w-0 items-center gap-3 rounded-2xl bg-bg-subtle py-1.5 pl-4 pr-1.5"
              >
                <span className={cx(TEXT.caption, "w-5 shrink-0 tabular-nums")}>{index + 1}</span>
                <span className={cx(TEXT.body, "min-w-0 flex-1 [overflow-wrap:anywhere]")}>{item}</span>
                {!disabled && (
                  <span className="flex shrink-0 items-center gap-0.5">
                    <IconButton
                      size="sm"
                      icon={ArrowUpIcon}
                      label={`Перемістити «${item}» вище`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      data-move="up"
                    />
                    <IconButton
                      size="sm"
                      icon={ArrowDownIcon}
                      label={`Перемістити «${item}» нижче`}
                      disabled={index === value.length - 1}
                      onClick={() => move(index, 1)}
                      data-move="down"
                    />
                    <IconButton size="sm" icon={XMarkIcon} label={`Прибрати «${item}»`} onClick={() => remove(index)} />
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className={cx(TEXT.muted, "rounded-2xl bg-bg-subtle px-4 py-3")}>Список порожній.</p>
        )}

        {!disabled && (
          <div className="flex min-w-0 flex-col gap-2 min-[640px]:flex-row min-[640px]:items-start">
            <Input
              aria-label={`Нова ${noun.one}`}
              value={text}
              onChange={(next) => {
                setText(next);
                if (refusal) setRefusal(null);
              }}
              onEnter={add}
              placeholder={full ? `Не більше ${max}` : placeholder}
              maxLength={maxLength}
              disabled={full}
              error={refusal ?? undefined}
              className="min-w-0 min-[640px]:flex-1"
            />
            <Button variant="secondary" iconLeft={PlusIcon} onClick={add} disabled={full || text.trim() === ""}>
              {addLabel}
            </Button>
          </div>
        )}
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      </div>
    </Field>
  );
}
