import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ScrollUpDock } from "@/components/ScrollUpDock";
import { CartProvider } from "@/components/cart/CartProvider";
import { CatalogRegistry } from "@/components/catalog/CatalogRegistry";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PlatformChrome } from "@/components/platform/PlatformChrome";
import { ToastHost } from "@/components/ui/Toast";
import { getRegistryProducts } from "@/server/repos/catalog";

// Everything the public site and the customer cabinet stand in: the product
// registry, the cart, the account, the header and the footer. Two places
// render it: the layout of the site's pages (src/app/(site)/layout.tsx) and
// the page an unknown address gets (src/app/global-not-found.tsx). The
// staff area (src/app/admin) never does, so nothing of the storefront is
// rendered or sent there.
export async function SiteShell({ children }: Readonly<{ children: React.ReactNode }>) {
  // The public catalog (cached, tag `catalog`): primes the browser's
  // product registry so the cart, checkout and listings look products up
  // synchronously. Same data for every visitor, so pages stay static.
  const { listing, extras } = await getRegistryProducts();
  return (
    // Renders no element: it only fills catalog/registry.ts.
    <CatalogRegistry listing={listing} extras={extras}>
      {/* The cart (Figma «Кошик», 4329:39830) is site-wide: the provider
          keeps the lines in localStorage and mounts the drawer + the
          stock modal after the page, so the header badge, the catalog
          cards and the product page all talk to one cart. */}
      <CartProvider>
        {/* The account area (Figma «Реєстрація», 4573:36735) is site-wide
            too: the header «Увійти» pill opens the sign-up / sign-in
            drawer, the first login shows the welcome modal. */}
        <AuthProvider>
          {/* Signed-in partners see the catalog inside the B2B platform
              shell (Figma «Каталог :: B2B» 4329:56124): PlatformChrome
              swaps the public header, footer and scroll dock for the
              platform header, side rail and legal bar on those routes. */}
          <PlatformChrome
            header={<Header />}
            footer={
              <>
                <Footer />
                {/* Single travelling scroll-to-top arrow: appears in the
                    corner on scroll, then glides into its footer slot
                    ([data-scrollup-slot]). */}
                <ScrollUpDock />
              </>
            }
          >
            {children}
          </PlatformChrome>
          {/* The one toast host (ui/Toast.tsx): renders nothing visible
              until showToast() fires; phone-only toasts by default. */}
          <ToastHost />
        </AuthProvider>
      </CartProvider>
    </CatalogRegistry>
  );
}
