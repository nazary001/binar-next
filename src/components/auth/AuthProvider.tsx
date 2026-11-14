"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { dropLocalSession, refreshSession, sessionAgeMs } from "@/lib/session/bootstrap";
import { clearAccountCache } from "@/lib/session/cache";
import { hasSessionHint } from "@/lib/session/hint";
import { markWelcomed, retryPendingSignOut, signOut as apiSignOut } from "./api";
import { DASHBOARD_HREF, PROFILE_HREF, RESET_QUERY_PARAM, type Account } from "./data";
import { currentAccount, getServerSnapshot, getSnapshot, subscribe } from "./store";
import { AuthDrawer } from "./AuthDrawer";
import { WelcomeModal } from "./WelcomeModal";

// Which screen the drawer opens on (Figma «Authorisation NEW» 5420:38169).
// `auto` = «Sign in» for visitors, the signed-in summary for a retail
// customer; `account` = that summary (after «Перейти в профіль» for a
// retail customer); `reset` = «Створіть новий пароль», opened by the
// (mocked) e-mailed link `/?reset=<token>`. A signed-in partner has no
// summary (designer, 2026-11-13): `auto` / `account` take them to the
// dashboard instead of opening the drawer.
export type AuthEntry = "auto" | "account" | "reset";

export type OpenAuthOptions = {
  // A sign-in started by the page itself (the cabinet SignInPrompt, the
  // materials padlock) keeps that page; any other partner sign-in (the
  // header «Увійти») lands on the dashboard.
  stay?: boolean;
};

type AuthContextValue = {
  user: Account | null;
  open: boolean;
  // Increments on every open so the drawer body remounts with fresh
  // state (no setState-in-effect resets).
  openCount: number;
  entry: AuthEntry;
  // The token of the reset link the drawer was opened with.
  resetToken: string | null;
  openAuth: (entry?: AuthEntry, options?: OpenAuthOptions) => void;
  closeAuth: () => void;
  signOut: () => void;
  // A successful «Увійти»: the drawer closes; a partner goes to the
  // dashboard (C27, «після кнопки увійти діректимо на Дашборд») unless
  // the page opened the drawer with `stay`. A partner's first login (CRM
  // account not yet welcomed) opens the «Вітаємо на платформі Binar-2000»
  // modal (4573:35590) over the page it lands on. A retail customer stays.
  signedIn: (account: Account) => void;
  welcomeOpen: boolean;
  closeWelcome: () => void;
  // «Перейти в профіль»: closes the modal; a partner goes to «Мій
  // профіль» (/profile), a retail customer gets the drawer summary.
  goToProfile: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// A visible tab re-checks its session when the last answer is older.
const SESSION_RECHECK_MS = 5 * 60 * 1000;

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Site-wide account state: the header pill, the auth drawer and the
// welcome modal all read the localStorage-backed store through here.
export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const user = useMemo(() => currentAccount(state), [state]);
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [entry, setEntry] = useState<AuthEntry>("auto");
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  // Set per open: the page opened the drawer and a sign-in keeps it.
  const [stayAfterSignIn, setStayAfterSignIn] = useState(false);
  // A partner's first sign-in redirected to the dashboard: the welcome
  // card opens with the new page.
  const [welcomeAfterNav, setWelcomeAfterNav] = useState(false);

  // A route change (a link inside the sheet, Back, the logo) closes the
  // account sheet and the welcome card in the same commit as the new page
  // (render-phase adjustment, as Header / PlatformHeader do for their
  // menus); the welcome card is not marked as seen then. The one route
  // change that opens it is the first-login redirect to the dashboard.
  const pathname = usePathname();
  const [overlayPath, setOverlayPath] = useState(pathname);
  if (overlayPath !== pathname) {
    setOverlayPath(pathname);
    setOpen(false);
    setWelcomeOpen(welcomeAfterNav);
    setWelcomeAfterNav(false);
  }

  // A signed-in partner never gets the drawer summary (designer,
  // 2026-11-13): «Кабінет» anywhere leads to the dashboard. The account is
  // read from the store, so the callback stays stable.
  const openAuth = useCallback(
    (next: AuthEntry = "auto", options?: OpenAuthOptions) => {
      if (next !== "reset" && currentAccount(getSnapshot())?.type === "b2b") {
        if (window.location.pathname !== DASHBOARD_HREF) router.push(DASHBOARD_HREF);
        return;
      }
      setStayAfterSignIn(options?.stay ?? false);
      setEntry(next);
      setOpenCount((c) => c + 1);
      setOpen(true);
    },
    [router],
  );

  // The reset link: `/?reset=<token>` opens the drawer on «Створіть новий
  // пароль» once the page has hydrated, and the token leaves the address
  // bar so a reload does not reopen it. Deferred to a task so the state
  // updates happen outside the effect body.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get(RESET_QUERY_PARAM);
    if (!token) return;
    const id = window.setTimeout(() => {
      setResetToken(token);
      openAuth("reset");
      const url = new URL(window.location.href);
      url.searchParams.delete(RESET_QUERY_PARAM);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }, 0);
    return () => window.clearTimeout(id);
  }, [openAuth]);
  const closeAuth = useCallback(() => setOpen(false), []);

  // The server owns the session; the stored account is a mirror for the
  // first paint. After mount: a sign-out the server never confirmed is sent
  // again first (it also removes the hint, so this browser counts as signed
  // out); then, with the hint cookie, ask the server and let its answer
  // replace the mirror; without it, the browser has no session, so a mirror
  // left behind (expired cookie, an old browser-only account) and its
  // cached data are removed. A tab that comes back after a while asks again.
  useEffect(() => {
    retryPendingSignOut();
    if (hasSessionHint()) {
      void refreshSession();
    } else {
      const stale = getSnapshot().accounts.map((a) => a.id);
      dropLocalSession();
      stale.forEach(clearAccountCache);
    }
    const onVisible = () => {
      if (document.visibilityState !== "visible" || retryPendingSignOut() || !hasSessionHint()) return;
      if (sessionAgeMs() > SESSION_RECHECK_MS) void refreshSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // A partner signs out from the cabinet header menu or the phone cabinet
  // menu: the platform shell gives way to the public chrome and the pressed
  // control goes with it, so focus would drop to <body>; the page title
  // (CabinetPageHead h1, tabIndex -1) takes it, else the header logo.
  const signOut = useCallback(() => {
    apiSignOut();
    setOpen(false);
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active && active !== document.body && active.isConnected) return;
      const target =
        document.querySelector<HTMLElement>("main h1[tabindex='-1']") ??
        document.querySelector<HTMLElement>("body > header a");
      target?.focus({ preventScroll: true });
    });
  }, []);

  const signedIn = useCallback(
    (account: Account) => {
      const welcome = account.type === "b2b" && !account.welcomed;
      setOpen(false);
      if (account.type === "b2b" && !stayAfterSignIn && pathname !== DASHBOARD_HREF) {
        setWelcomeAfterNav(welcome);
        router.push(DASHBOARD_HREF);
        return;
      }
      setWelcomeOpen(welcome);
    },
    [pathname, router, stayAfterSignIn],
  );

  const closeWelcome = useCallback(() => {
    markWelcomed();
    setWelcomeOpen(false);
  }, []);

  const goToProfile = useCallback(() => {
    markWelcomed();
    setWelcomeOpen(false);
    if (user?.type === "b2b") router.push(PROFILE_HREF);
    else openAuth("account");
  }, [openAuth, router, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      open,
      openCount,
      entry,
      resetToken,
      openAuth,
      closeAuth,
      signOut,
      signedIn,
      welcomeOpen,
      closeWelcome,
      goToProfile,
    }),
    [
      user,
      open,
      openCount,
      entry,
      resetToken,
      openAuth,
      closeAuth,
      signOut,
      signedIn,
      welcomeOpen,
      closeWelcome,
      goToProfile,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthDrawer />
      <WelcomeModal />
    </AuthContext.Provider>
  );
}
