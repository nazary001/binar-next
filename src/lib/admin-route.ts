// The staff area (/admin and everything under it) brings its own shell
// (src/app/admin/layout.tsx). The site-wide wrappers of the root layout ask
// this before doing storefront work there: no public header or footer, no
// customer session boot, no account drawer.
export function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
