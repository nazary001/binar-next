"use client";

import { ArrowRightStartOnRectangleIcon, ChevronDownIcon, KeyIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { adminApi } from "../lib/api";
import { initials } from "../lib/format";
import { FOCUS_RING, FOCUS_RING_INSET, SURFACE, Z } from "../ui/tokens";
import { useStaff } from "./StaffProvider";

// The account chip of the top bar (the cabinet's company chip: a pill with
// a dark round avatar) and its menu: the own account and "sign out".

export function UserMenu() {
  const { me } = useStaff();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = async () => {
    setLeaving(true);
    await adminApi("/auth/sign-out", { method: "POST" });
    window.location.assign("/admin/login");
  };

  const line = `flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] font-medium leading-5 text-neutral-800 transition-colors duration-200 hover:bg-bg-subtle ${FOCUS_RING_INSET}`;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-[42px] cursor-pointer items-center gap-2 rounded-full border border-neutral-800 bg-white py-1 pl-1 pr-3 transition-colors duration-200 hover:bg-bg-subtle ${FOCUS_RING}`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[12px] font-bold leading-none text-white">
          {initials(me.name)}
        </span>
        <span className="hidden max-w-[180px] flex-col text-left min-[640px]:flex">
          <span className="truncate text-[13px] font-semibold leading-4 text-neutral-900">{me.name}</span>
          <span className="truncate text-[11px] font-medium leading-[14px] text-neutral-500">{me.roleName}</span>
        </span>
        <ChevronDownIcon
          aria-hidden
          className={`size-4 shrink-0 text-neutral-700 transition-[rotate] duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Обліковий запис"
          className={`absolute right-0 top-[calc(100%+8px)] w-[260px] p-2 ${SURFACE.float} ${Z.dropdown}`}
        >
          <div className="border-b border-stroke-subtle px-3 pb-3 pt-2">
            <p className="truncate text-[14px] font-semibold leading-5 text-neutral-900">{me.name}</p>
            <p className="truncate text-[12px] leading-4 text-neutral-500">{me.email}</p>
          </div>
          <div className="pt-2">
            <Link role="menuitem" href="/admin/account" onClick={() => setOpen(false)} className={line}>
              <KeyIcon aria-hidden className="size-5 text-neutral-500" strokeWidth={1.7} />
              Мій акаунт і пароль
            </Link>
            <button role="menuitem" type="button" disabled={leaving} onClick={signOut} className={`${line} cursor-pointer`}>
              <ArrowRightStartOnRectangleIcon aria-hidden className="size-5 text-neutral-500" strokeWidth={1.7} />
              {leaving ? "Виходимо" : "Вийти"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
