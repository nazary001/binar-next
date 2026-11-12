import "server-only";
import type { SessionBootstrap, SessionData } from "@/lib/session/types";
import type { SessionContext } from "./auth/session";
import { assortmentLines } from "./repos/assortment";
import { cartLines } from "./repos/carts";
import { partnerPrices } from "./repos/catalog";
import { ordersPayload } from "./repos/orders";
import { profileData } from "./repos/profile";
import { accountOf } from "./repos/users";
import { shopConfig } from "./shop-settings";

// Builds the answer of GET /api/session (and of sign-in / sign-up): the
// account plus every data domain that belongs to it, in one round trip, so
// the browser can switch to the signed-in state with nothing left to load.
// Each domain comes from its repository; a repository that answers
// undefined is simply left out. `config` (the shop rules the browser
// applies: the cart's free-delivery limit, the cabinet's return window) is
// in every answer, a signed-out one too; it comes from the cached settings
// read, so a guest's answer still costs no database round trip.
export async function buildBootstrap(session: SessionContext | null): Promise<SessionBootstrap> {
  if (!session) return { account: null, data: {}, config: await shopConfig() };
  const { user } = session;
  const partnerClient = user.type === "b2b" ? user.clientId : null;

  const [account, cart, prices, orders, profile, assortment, config] = await Promise.all([
    accountOf(user),
    cartLines(user._id),
    partnerClient ? partnerPrices(partnerClient) : undefined,
    partnerClient ? ordersPayload(partnerClient) : undefined,
    partnerClient ? profileData(partnerClient) : undefined,
    partnerClient ? assortmentLines(user._id) : undefined,
    shopConfig(),
  ]);

  const data: SessionData = {};
  if (cart !== undefined) data.cart = cart;
  if (prices !== undefined) data.prices = prices;
  if (orders !== undefined) data.orders = orders;
  if (profile !== undefined) data.profile = profile;
  if (assortment !== undefined) data.assortment = assortment;
  return { account, data, config };
}
