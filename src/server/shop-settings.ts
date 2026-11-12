import "server-only";
import { unstable_cache } from "next/cache";
import type { ShopConfig } from "@/lib/session/types";
import { getSettings, SETTINGS, type SettingsOf } from "./admin/settings";
import { TAG } from "./cache-tags";

// The shop rules staff edit in the panel (settings group "shop") as the
// storefront reads them: the payment term of a new partner order, the
// return window, the free-delivery limit of the cart.
//
// Every session answer carries part of them (guests included), so the read
// is cached for the whole server instead of costing a database round trip
// per answer: unstable_cache, SHOP_SETTINGS_SECONDS long, under its own
// tag SHOP_SETTINGS_TAG (revalidateTag(SHOP_SETTINGS_TAG, { expire: 0 })
// drops it) and the catalog tag, which the panel's settings route already
// drops whenever the shop group is saved, so a change shows at once.
// Outside a Next server (tsx scripts and checks) the database is read
// directly, as the catalog snapshot does. Route Handlers call this and
// hand the values to the repositories, which stay free of next/*.

export const SHOP_SETTINGS_TAG = "shop-settings";
export const SHOP_SETTINGS_SECONDS = 60;

export type ShopSettings = SettingsOf<"shop">;

const cached = unstable_cache(() => getSettings("shop"), ["settings:shop:v1"], {
  tags: [SHOP_SETTINGS_TAG, TAG.catalog],
  revalidate: SHOP_SETTINGS_SECONDS,
});

// The group with its defaults filled in. A failed read gives the defaults
// (the values the code had before the panel): a visitor's session answer
// or an order is never refused because the settings could not be read.
export async function shopSettings(): Promise<ShopSettings> {
  try {
    return process.env.NEXT_RUNTIME ? await cached() : await getSettings("shop");
  } catch (error) {
    console.error("[shop-settings] reading the shop settings failed, using the defaults:", error);
    return SETTINGS.shop.parse({}) as ShopSettings;
  }
}

// What the browser needs of them (SessionBootstrap.config).
export async function shopConfig(): Promise<ShopConfig> {
  const shop = await shopSettings();
  return { freeDeliveryLimit: shop.freeDeliveryLimit, returnWindowDays: shop.returnWindowDays };
}
