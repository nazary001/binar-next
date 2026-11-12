"use client";

/* eslint-disable @next/next/no-img-element */

import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { MEDIA_IMAGE_TYPES, MEDIA_MAX_BYTES, type MediaAccess, type MediaDto, type MediaFolder } from "../../media/types";
import { invalidate } from "../../lib/query";
import { cx, formatBytes } from "../../lib/format";
import { Badge } from "../Badge";
import { Button, IconButton } from "../Button";
import { Field, type FieldError } from "../Field";
import { Spinner } from "../Spinner";
import { COLOR_TRANSITION, LIFT_SHADOW, TEXT } from "../tokens";
import { DropZone } from "./DropZone";
import { MediaPicker } from "./MediaPicker";
import { checkImageFile, mediaErrorMessage, mediaHref, uploadMedia } from "./upload";

// Several pictures of a record in order (a product's gallery): a grid of
// square tiles, the first one marked "Головне". Reorder by dragging a tile
// (mouse, pen or finger) or with the arrow buttons under each tile; add by
// dropping files on the grid, with the "Додати" tile, or from the library;
// remove with the bin.
//
//   <GalleryField label="Галерея" folder="products" max={12}
//     value={product.images} onChange={(images) => setProduct({ ...product, images })} />
//
// Props
// - value: the addresses in order; onChange(urls) gets a new array.
// - folder, access ("public"): where uploads go.
// - max: the most pictures (the add tile goes away at it; extra files are
//   refused with a message).
// - label, hint, error, required, optional, disabled, className.
// Several files upload at once, each shown as a pending tile until its
// answer comes; they are added in the order they finish. An address that
// is already in the gallery is not added twice.

export type GalleryFieldProps = {
  value: string[];
  onChange: (value: string[]) => void;
  folder: MediaFolder;
  access?: MediaAccess;
  max?: number;
  label?: ReactNode;
  hint?: ReactNode;
  error?: FieldError;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
};

const ACCEPT = MEDIA_IMAGE_TYPES.join(",");
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3";
// A press must travel this far before it counts as a drag (a tap stays a tap).
const DRAG_THRESHOLD = 6;

type PendingTile = { id: number; preview: string; name: string };
// Where a tile sat when the press began (page coordinates of its centre).
type Slot = { index: number; x: number; y: number };
type Drag = { from: number; over: number };

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, item);
  return next;
}

export function GalleryField({
  value,
  onChange,
  folder,
  access = "public",
  max,
  label,
  hint,
  error,
  required,
  optional,
  disabled = false,
  className,
}: GalleryFieldProps) {
  const [pending, setPending] = useState<PendingTile[]>([]);
  const [failures, setFailures] = useState<string[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  // The value as last handed out, read by upload answers that arrive after
  // other changes (written after each render, read only in callbacks).
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  });
  const pressRef = useRef<{
    index: number;
    x: number;
    y: number;
    pointer: number;
    dragging: boolean;
    element: HTMLElement;
    slots: Slot[];
  } | null>(null);
  const nextId = useRef(1);

  const room = max === undefined ? Number.POSITIVE_INFINITY : Math.max(0, max - value.length - pending.length);
  const canAdd = !disabled && room > 0;

  const append = (url: string) => {
    if (latest.current.includes(url)) return;
    const next = [...latest.current, url];
    latest.current = next;
    onChange(next);
  };

  const addFiles = (files: File[]) => {
    const problems: string[] = [];
    const images = files.filter((file) => {
      const refused = checkImageFile(file);
      if (refused) problems.push(`${file.name}: ${mediaErrorMessage(refused)}`);
      return !refused;
    });
    const taken = images.slice(0, room === Number.POSITIVE_INFINITY ? images.length : room);
    if (taken.length < images.length) problems.push(`Можна додати не більше ${max} зображень.`);
    setFailures(problems);
    for (const file of taken) {
      const id = nextId.current++;
      const tile = { id, preview: URL.createObjectURL(file), name: file.name };
      setPending((list) => [...list, tile]);
      void uploadMedia(file, { folder, access }).then((result) => {
        URL.revokeObjectURL(tile.preview);
        setPending((list) => list.filter((entry) => entry.id !== id));
        if (!result.ok) {
          setFailures((list) => [...list, `${file.name}: ${mediaErrorMessage(result)}`]);
          return;
        }
        invalidate("/media");
        append(mediaHref(result.data.media));
      });
    }
  };

  const pick = (media: MediaDto) => {
    if (room <= 0) return;
    append(mediaHref(media));
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    setAnnouncement(`Зображення ${index + 1} прибрано`);
  };

  // Moves a tile and keeps the keyboard focus on the same button of it at
  // its new place (found after the new order has rendered).
  const shift = (index: number, by: -1 | 1, from: HTMLElement) => {
    const target = index + by;
    if (target < 0 || target >= value.length) return;
    const which = from.closest<HTMLElement>("[data-move]")?.dataset.move ?? "left";
    onChange(moveItem(value, index, target));
    setAnnouncement(`Зображення ${index + 1} тепер на місці ${target + 1}`);
    // At an end the same arrow is disabled: the other one takes the focus.
    window.requestAnimationFrame(() => {
      const tile = gridRef.current?.querySelector<HTMLElement>(`[data-tile-index="${target}"]`);
      const same = tile?.querySelector<HTMLButtonElement>(`[data-move="${which}"] button`);
      if (same && !same.disabled) same.focus();
      else tile?.querySelector<HTMLButtonElement>("[data-move] button:not(:disabled)")?.focus();
    });
  };

  // --- Pointer drag ------------------------------------------------------------

  // The places of the tiles, measured once when the press begins: the
  // dragged tile itself moves under the pointer and must not count as the
  // place it is dropped on.
  const measureSlots = (): Slot[] => {
    const tiles = gridRef.current ? [...gridRef.current.querySelectorAll<HTMLElement>("[data-tile-index]")] : [];
    return tiles.map((tile) => {
      const rect = tile.getBoundingClientRect();
      return { index: Number(tile.dataset.tileIndex), x: rect.left + rect.width / 2 + window.scrollX, y: rect.top + rect.height / 2 + window.scrollY };
    });
  };

  // The slot nearest to the pointer (client coordinates).
  const slotAt = (slots: Slot[], clientX: number, clientY: number): number => {
    const x = clientX + window.scrollX;
    const y = clientY + window.scrollY;
    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const slot of slots) {
      const distance = Math.hypot(x - slot.x, y - slot.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = slot.index;
      }
    }
    return best;
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>, index: number) => {
    if (disabled || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    pressRef.current = {
      index,
      x: event.clientX,
      y: event.clientY,
      pointer: event.pointerId,
      dragging: false,
      element: event.currentTarget,
      slots: measureSlots(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const press = pressRef.current;
    if (!press || press.pointer !== event.pointerId) return;
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    if (!press.dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      press.dragging = true;
    }
    // The tile follows the pointer; written to the element, not to state.
    press.element.style.translate = `${dx}px ${dy}px`;
    const over = slotAt(press.slots, event.clientX, event.clientY);
    setDrag((current) =>
      current && current.from === press.index && current.over === over ? current : { from: press.index, over: over < 0 ? press.index : over },
    );
  };

  const endPress = (event: PointerEvent<HTMLElement>, commit: boolean) => {
    const press = pressRef.current;
    if (!press || press.pointer !== event.pointerId) return;
    pressRef.current = null;
    press.element.style.translate = "";
    if (press.element.hasPointerCapture(event.pointerId)) press.element.releasePointerCapture(event.pointerId);
    const over = press.dragging ? slotAt(press.slots, event.clientX, event.clientY) : -1;
    setDrag(null);
    if (commit && press.dragging && over >= 0 && over !== press.index) {
      onChange(moveItem(value, press.index, over));
      setAnnouncement(`Зображення ${press.index + 1} тепер на місці ${over + 1}`);
    }
  };

  const count = value.length;
  const capacity = max === undefined ? "" : ` із ${max}`;

  return (
    <Field
      label={label}
      hint={hint}
      error={failures.length > 0 ? failures.join(" ") : error}
      required={required}
      optional={optional}
      labelAs="span"
      disabled={disabled}
      className={className}
      meta={<span className={cx(TEXT.caption, "tabular-nums")}>{`${count}${capacity}`}</span>}
    >
      <DropZone
        variant="bare"
        accept={ACCEPT}
        multiple
        onFiles={addFiles}
        disabled={!canAdd}
        label={typeof label === "string" ? label : "Галерея"}
      >
        {({ choose }) => (
          <div className="flex flex-col gap-3">
            <div ref={gridRef} role="list" className={GRID}>
              {value.map((url, index) => {
                const dragged = drag?.from === index;
                const target = drag !== null && drag.over === index && drag.from !== index;
                return (
                  <div
                    key={url}
                    role="listitem"
                    data-tile-index={index}
                    aria-label={`Зображення ${index + 1} з ${count}`}
                    onPointerDown={(event) => onPointerDown(event, index)}
                    onPointerMove={onPointerMove}
                    onPointerUp={(event) => endPress(event, true)}
                    onPointerCancel={(event) => endPress(event, false)}
                    className={cx(
                      // A finger may still scroll the page up and down over a tile;
                      // sideways it drags (the arrows below work everywhere).
                      "relative flex min-w-0 touch-none select-none flex-col gap-1.5 rounded-2xl pointer-coarse:touch-pan-y",
                      disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
                      dragged && "z-10 opacity-80",
                    )}
                  >
                    <span
                      className={cx(
                        "relative block aspect-square overflow-hidden rounded-2xl bg-bg-subtle motion-reduce:transition-none",
                        COLOR_TRANSITION,
                        // The drop place rings outside its picture, so it stays
                        // visible around the (slightly smaller) dragged tile.
                        target ? "ring-2 ring-brand ring-offset-4 ring-offset-white" : "ring-1 ring-transparent",
                        dragged && "scale-[0.92]",
                        dragged && LIFT_SHADOW,
                      )}
                    >
                      <img src={url} alt="" draggable={false} className="pointer-events-none size-full object-cover" />
                      {index === 0 && (
                        <Badge tone="neutral" className="absolute left-2 top-2">
                          Головне
                        </Badge>
                      )}
                    </span>
                    <span className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-0.5">
                        <IconButtonMove
                          label={`Посунути зображення ${index + 1} ліворуч`}
                          direction="left"
                          disabled={disabled || index === 0}
                          onMove={(from) => shift(index, -1, from)}
                        />
                        <IconButtonMove
                          label={`Посунути зображення ${index + 1} праворуч`}
                          direction="right"
                          disabled={disabled || index === count - 1}
                          onMove={(from) => shift(index, 1, from)}
                        />
                      </span>
                      <IconButton
                        size="sm"
                        variant="danger"
                        icon={TrashIcon}
                        label={`Прибрати зображення ${index + 1}`}
                        disabled={disabled}
                        onClick={() => remove(index)}
                      />
                    </span>
                  </div>
                );
              })}

              {pending.map((tile) => (
                <div key={`pending-${tile.id}`} role="listitem" aria-label={`Завантажуємо ${tile.name}`} className="flex flex-col gap-1.5">
                  <span className="relative block aspect-square overflow-hidden rounded-2xl bg-bg-subtle">
                    <img src={tile.preview} alt="" className="size-full object-cover opacity-50" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Spinner size="lg" className="text-neutral-900" />
                    </span>
                  </span>
                  <span className={cx(TEXT.caption, "flex h-8 items-center truncate")}>Завантажуємо...</span>
                </div>
              ))}

              {canAdd && (
                <div role="listitem" className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={choose}
                    className={cx(
                      "flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-400 bg-white px-3 text-center",
                      "hover:border-neutral-800 motion-reduce:transition-none",
                      "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                      COLOR_TRANSITION,
                    )}
                  >
                    <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
                      <PlusIcon className="size-5" strokeWidth={1.7} />
                    </span>
                    <span className={TEXT.bodyStrong}>Додати</span>
                    <span className="text-[11px] font-medium leading-4 text-neutral-500">до {formatBytes(MEDIA_MAX_BYTES)}</span>
                  </button>
                  <span className="h-8" aria-hidden />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Button size="sm" variant="ghost" onClick={() => setPickerOpen(true)} disabled={!canAdd}>
                Обрати з медіатеки
              </Button>
              <span className={TEXT.caption}>Перетягніть, щоб змінити порядок. Перше зображення головне.</span>
            </div>
          </div>
        )}
      </DropZone>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={pick} folder={folder} kind="image" access={access} />
    </Field>
  );
}

// The move button of a tile: a ghost sm IconButton that hands itself to the
// handler, so focus can follow the tile to its new place.
function IconButtonMove({
  label,
  direction,
  disabled,
  onMove,
}: {
  label: string;
  direction: "left" | "right";
  disabled: boolean;
  onMove: (from: HTMLElement) => void;
}) {
  return (
    <span data-move={direction} className="contents">
      <IconButton
        size="sm"
        icon={direction === "left" ? ChevronLeftIcon : ChevronRightIcon}
        label={label}
        disabled={disabled}
        onClick={(event) => onMove(event.currentTarget)}
      />
    </span>
  );
}
