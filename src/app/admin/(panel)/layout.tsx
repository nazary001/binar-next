import { AdminShell } from "@/components/admin/shell/AdminShell";
import { CommandPalette, ConfirmHost, PaletteTrigger, ToastHost } from "@/components/admin/ui";
import { requireStaffPage } from "@/server/admin/page";

// Every page of the panel sits inside the shell and needs a signed-in
// member of staff. The layout renders the shell with what the session says
// about the person; each page checks its own permission again, because a
// layout does not run again when the visitor moves between pages.
//
// The shell also carries the layers every screen uses: the search of the
// top bar (Ctrl+K), the toasts and the confirm / prompt dialogs. They are
// mounted once here, so a screen only calls toast() or confirmDialog().
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { me } = await requireStaffPage();
  return (
    <AdminShell
      me={me}
      slots={{
        search: <PaletteTrigger />,
        layers: (
          <>
            <ToastHost />
            <ConfirmHost />
            <CommandPalette />
          </>
        ),
      }}
    >
      {children}
    </AdminShell>
  );
}
