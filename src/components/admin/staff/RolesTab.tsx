"use client";

import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { countOf, cx } from "../lib/format";
import { OWNER_ROLE_ID } from "../lib/permissions";
import type { AdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Badge } from "../ui/Badge";
import { SkeletonText } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/States";
import { COLOR_TRANSITION, FOCUS_RING, SURFACE, TEXT } from "../ui/tokens";
import { accessLines, joinWords, TOTAL_PERMISSIONS } from "./permissionWords";
import { RoleEditor } from "./RoleEditor";
import type { RoleRow, RolesAnswer } from "./types";
import type { useDrawerAddress } from "./useDrawerAddress";

// The "Ролі" tab: a card per role (what it changes, what it only views,
// who has it). A card opens the role in a drawer with the permission
// matrix (?tab=roles&id=<role id>, ?id=new for a new one).

const MEMBER_FORMS = ["співробітник", "співробітники", "співробітників"] as const;

function RoleCard({ role, own, onOpen }: { role: RoleRow; own: boolean; onOpen: () => void }) {
  const lines = accessLines(role.id, role.permissions);
  const owner = role.id === OWNER_ROLE_ID;
  return (
    <article
      className={cx(SURFACE.card, "group relative flex min-w-0 flex-col gap-4 p-5 hover:bg-[#fcfcfc] min-[1024px]:p-6", COLOR_TRANSITION)}
      data-role={role.id}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className={cx(TEXT.cardTitle, "min-w-0 [overflow-wrap:anywhere]")}>
          <button
            type="button"
            onClick={onOpen}
            className={cx("cursor-pointer rounded-md text-left after:absolute after:inset-0 after:rounded-3xl after:content-['']", FOCUS_RING)}
          >
            {role.name}
          </button>
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {own && <Badge tone="blue">Ваша роль</Badge>}
          {role.system && <Badge tone="neutral">системна</Badge>}
          <ChevronRightIcon
            aria-hidden
            className={cx("size-5 text-neutral-400 group-hover:text-neutral-900 motion-reduce:transition-none", COLOR_TRANSITION)}
          />
        </div>
      </div>
      <p className={cx(TEXT.muted, "line-clamp-2 min-h-10")}>{role.description || "Без опису"}</p>

      <div className="flex flex-col gap-2 border-t border-stroke-subtle pt-4">
        {owner ? (
          <p className={TEXT.body}>
            <span className="font-semibold">Усі права, завжди.</span>{" "}
            <span className="text-neutral-600">Зокрема ті, що з{"'"}являться в панелі пізніше. Цю роль не можна змінити чи видалити.</span>
          </p>
        ) : lines.edits.length === 0 && lines.views.length === 0 ? (
          <p className={TEXT.muted}>Поки не має жодного права.</p>
        ) : (
          <>
            {lines.edits.length > 0 && (
              <p className={TEXT.body}>
                <span className="font-semibold">Змінює:</span> <span className="text-neutral-700">{joinWords(lines.edits)}</span>
              </p>
            )}
            {lines.views.length > 0 && (
              <p className={TEXT.body}>
                <span className="font-semibold">Лише переглядає:</span> <span className="text-neutral-700">{joinWords(lines.views)}</span>
              </p>
            )}
          </>
        )}
      </div>

      <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t border-stroke-subtle pt-4">
        <div className="min-w-0">
          <dt className={TEXT.caption}>Співробітники</dt>
          <dd className="mt-0.5 text-[14px] font-semibold leading-5 text-neutral-900">
            {role.members > 0 ? (
              <Link
                href={`/admin/staff?role=${encodeURIComponent(role.id)}`}
                className={cx("relative z-10 rounded-md tabular-nums underline underline-offset-4 hover:text-brand", FOCUS_RING)}
              >
                {countOf(role.members, MEMBER_FORMS)}
              </Link>
            ) : (
              <span className="font-medium text-neutral-500">Нікого</span>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={TEXT.caption}>Права</dt>
          <dd className="mt-0.5 text-[14px] font-semibold leading-5 text-neutral-900 tabular-nums">
            {role.permissions.length} з {TOTAL_PERMISSIONS}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function RolesTab({ roles, drawer }: { roles: AdminQuery<RolesAnswer>; drawer: ReturnType<typeof useDrawerAddress> }) {
  const { me } = useStaff();
  const items = roles.data?.items;

  // The drawer keeps showing the last role while it slides out.
  const openId = drawer.openId;
  const [shown, setShown] = useState<string | null>(openId);
  if (openId !== null && openId !== shown) setShown(openId);
  // A fresh editor for every opening from the cards; a role that was just
  // created stays in the same editor (its address changes from "new" to
  // the role's id without the drawer sliding in again).
  const [opening, setOpening] = useState(0);
  const openRole = (id: string) => {
    setOpening((count) => count + 1);
    drawer.open(id);
  };

  return (
    <>
      {roles.error && !items ? (
        <div className={SURFACE.card}>
          <ErrorState failure={roles.error} onRetry={roles.reload} />
        </div>
      ) : !items ? (
        <div className="grid gap-4 min-[640px]:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className={cx(SURFACE.card, "p-6")}>
              <SkeletonText lines={6} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className={SURFACE.card}>
          <EmptyState
            size="lg"
            icon={<ShieldCheckIcon aria-hidden className="size-6" strokeWidth={1.7} />}
            title="Ролей ще немає"
            text="Роль визначає, що співробітник бачить і що може змінювати. Створіть першу."
          />
        </div>
      ) : (
        <div className="grid gap-4 min-[640px]:grid-cols-2 2xl:grid-cols-3">
          {items.map((role) => (
            <RoleCard key={role.id} role={role} own={role.id === me.roleId} onOpen={() => openRole(role.id)} />
          ))}
        </div>
      )}
      {shown !== null && (
        <RoleEditor
          key={opening}
          roleId={shown}
          open={openId !== null}
          onClose={drawer.close}
          onCreated={(id) => drawer.replace(id)}
          answer={roles.data}
          loadError={roles.error}
          onRetry={roles.reload}
        />
      )}
    </>
  );
}
