"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { hasPermission, type Permission, type StaffMe } from "../lib/permissions";

// Who is signed in to the panel, for every client component under the
// panel layout:
//
//   const { me, can } = useStaff();
//   {can("orders.edit") && <Button>Змінити статус</Button>}
//
// The layout reads the session on the server and passes it down, so the
// first paint already knows the role. Hiding a button is a courtesy only:
// the API checks the permission again.

type StaffContextValue = {
  me: StaffMe;
  can: (permission: Permission | readonly Permission[]) => boolean;
};

const StaffContext = createContext<StaffContextValue | null>(null);

export function StaffProvider({ me, children }: { me: StaffMe; children: ReactNode }) {
  const can = useCallback(
    (permission: Permission | readonly Permission[]) => hasPermission(me.permissions, permission),
    [me.permissions],
  );
  const value = useMemo(() => ({ me, can }), [me, can]);
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export function useStaff(): StaffContextValue {
  const value = useContext(StaffContext);
  if (!value) throw new Error("useStaff must be used inside the admin panel layout");
  return value;
}
