"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useId, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/format";
import { IconButton } from "./Button";
import { adminRoot, useClientReady, useModalLayer, usePresence } from "./overlay";
import { EASE_OUT, SCRIM, TEXT, Z } from "./tokens";

// A panel that slides in from the right edge over the scrim: a record's
// details next to its list, a long form, a filter set on phones. Full
// height; from 640 px it is `width` wide with the cabinet's large rounded
// left corners, on phones it covers the screen.
//
//   <Drawer
//     open={selected !== null}
//     onClose={() => setSelected(null)}
//     title={`Заявка №${lead.number}`}
//     description="Надійшла з форми «Співпраця»"
//     width={640}
//     footer={<><Button variant="secondary" onClick={close}>Закрити</Button><Button onClick={save}>Зберегти зміни</Button></>}
//   >
//     ...
//   </Drawer>
//
// Props
// - open, onClose: controlled; onClose runs on Escape, the cross and a press
//   on the scrim (unless closeOnScrim is false).
// - title, description: the head of the panel (title names the dialog).
// - width: px from 640 (default 560); never wider than the window minus 48.
// - footer: actions in a bar stuck to the bottom with a hairline above;
//   right-aligned from 640, stacked full width on phones (the last child on
//   top). A child with `min-[640px]:mr-auto` moves to the left edge.
// - headerActions: small controls next to the cross (a kebab menu).
// - busy: a request is running; Escape, the scrim and the cross do nothing.
// - initialFocusRef: what gets focus on open (default: the first field or
//   button that is not the cross). A drawer that opens before its content
//   (a record fetched by ?id, only skeletons yet) gives the focus to the
//   panel itself, with no ring on the cross; when the content arrives the
//   focus moves to its first field (when the content starts with one, or
//   to an element marked data-autofocus), unless the person has already
//   moved it. Content that starts with facts and buttons leaves the focus
//   on the panel: Tab goes on from there.
// The panel keeps its last content while it slides out.

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  width?: number;
  footer?: ReactNode;
  headerActions?: ReactNode;
  children?: ReactNode;
  closeOnScrim?: boolean;
  busy?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeLabel?: string;
};

const EXIT_MS = 400;

const PANEL =
  "absolute inset-y-0 right-0 flex w-full flex-col bg-white " +
  "transition-[translate] duration-[400ms] motion-reduce:transition-none starting:translate-x-full " +
  "min-[640px]:w-[var(--drawer-w)] min-[640px]:max-w-[calc(100vw-48px)] min-[640px]:rounded-l-[32px]";

const FOOTER =
  "flex shrink-0 flex-col-reverse gap-2 border-t border-stroke-subtle bg-white px-5 pt-4 [&>*]:w-full " +
  "pb-[max(16px,env(safe-area-inset-bottom))] " +
  "min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-end min-[640px]:gap-3 min-[640px]:px-6 " +
  "min-[640px]:pb-5 min-[640px]:[&>*]:w-auto";

type Content = { title: ReactNode; description: ReactNode; footer: ReactNode; headerActions: ReactNode; children: ReactNode };

export function Drawer({
  open,
  onClose,
  title,
  description,
  width = 560,
  footer,
  headerActions,
  children,
  closeOnScrim = true,
  busy = false,
  initialFocusRef,
  closeLabel = "Закрити",
}: DrawerProps) {
  const box = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const ready = useClientReady();
  const mounted = usePresence(open, EXIT_MS);
  useModalLayer(open, { onClose, containerRef: box, initialFocusRef, locked: busy, waitForContent: true });

  const [kept, setKept] = useState<Content>(() => ({ title, description, footer, headerActions, children }));
  if (
    open &&
    (kept.title !== title ||
      kept.description !== description ||
      kept.footer !== footer ||
      kept.headerActions !== headerActions ||
      kept.children !== children)
  ) {
    setKept({ title, description, footer, headerActions, children });
  }
  const shown: Content = open ? { title, description, footer, headerActions, children } : kept;

  if (!ready || !mounted) return null;

  return createPortal(
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={shown.description ? descriptionId : undefined}
      tabIndex={-1}
      data-admin-layer=""
      inert={!open}
      className={cx("fixed inset-0 outline-none", Z.drawer, !open && "pointer-events-none")}
    >
      <div
        aria-hidden
        className={cx(
          "absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none starting:opacity-0",
          SCRIM,
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={closeOnScrim && !busy ? onClose : undefined}
      />
      <div
        aria-busy={busy || undefined}
        style={{ "--drawer-w": `${width}px` } as CSSProperties}
        className={cx(PANEL, EASE_OUT, open ? "translate-x-0" : "translate-x-full")}
      >
        <div className="flex shrink-0 items-start gap-3 px-5 pb-4 pt-4 min-[640px]:px-6 min-[640px]:pt-6">
          <div className="min-w-0 flex-1 pt-1.5">
            <h2 id={titleId} className={TEXT.sectionTitle}>
              {shown.title}
            </h2>
            {shown.description && (
              <p id={descriptionId} className={cx(TEXT.muted, "mt-1")}>
                {shown.description}
              </p>
            )}
          </div>
          {shown.headerActions && (
            <div data-no-autofocus="" className="flex shrink-0 items-center gap-1">
              {shown.headerActions}
            </div>
          )}
          <span data-no-autofocus="" className="-mr-2 flex shrink-0">
            <IconButton label={closeLabel} icon={XMarkIcon} disabled={busy} onClick={onClose} />
          </span>
        </div>

        <div className="admin-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-1 min-[640px]:px-6">{shown.children}</div>

        {shown.footer && <div className={FOOTER}>{shown.footer}</div>}
      </div>
    </div>,
    adminRoot(),
  );
}
