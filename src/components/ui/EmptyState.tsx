import type { ReactNode, Ref } from "react";

// Empty / status panel (TR-24, system spec A14): replaces ListEmpty
// (orders), PanelEmptyState (dashboard, catalog, materials, profile),
// EmptyPanel (returns) and the checkout empty / success panels on phones.
// [52 icon tile] 24 [title Title Large 22/28] 16 [text Body Small 14/20
// #777779, max 294] 32 [action]. Surfaces: "none" = straight on the page
// (catalog, materials, cart sheet); "panel" = the white r32 cabinet panel
// that stands in for an empty ListPanel; "ring" = the public standalone
// panel with the 1-px #8e8e8f ring (py 47 / px 23 + the ring = 48 / 24).
// Action rule (A-10): a next-step link = `<Button href size="small"
// arrow>` solid; an in-place reset = `<Button size="small">` (solid) or
// `variant="outlinedDark"` when the page head already shows a solid
// primary; never accent. Phone atom: callers render it `lg:hidden` next
// to the desktop empty state.
const SURFACE = {
  none: "px-6 py-12",
  panel: "rounded-[32px] bg-white px-6 py-12",
  ring: "rounded-[32px] border border-stroke-default bg-white px-[23px] py-[47px]",
} as const;

export function EmptyState({
  icon,
  title,
  text,
  action,
  titleAs = "h2",
  titleRef,
  surface = "none",
  role,
  className = "",
}: {
  icon?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  titleAs?: "h2" | "h3" | "p";
  // Focus target after the last item disappears (tabIndex -1).
  titleRef?: Ref<HTMLElement>;
  surface?: "none" | "panel" | "ring";
  role?: "status";
  className?: string;
}) {
  // One element type for TS; the tag itself follows `titleAs`.
  const Title = titleAs as "h2";
  return (
    <div role={role} className={`flex flex-col items-center text-center ${SURFACE[surface]} ${className}`}>
      {icon && (
        <span
          aria-hidden
          className="mb-6 flex size-[52px] shrink-0 items-center justify-center rounded-[12px] border border-stroke-default bg-white text-neutral-900"
        >
          {icon}
        </span>
      )}
      <Title
        ref={titleRef as Ref<HTMLHeadingElement> | undefined}
        tabIndex={titleRef ? -1 : undefined}
        className="text-balance text-[22px] font-semibold leading-7 tracking-[-0.44px] text-neutral-900 outline-none"
      >
        {title}
      </Title>
      {text && <p className="mt-4 max-w-[294px] text-pretty text-[14px] leading-5 text-neutral-500">{text}</p>}
      {action && <div className="mt-8 flex flex-col items-center gap-2">{action}</div>}
    </div>
  );
}
