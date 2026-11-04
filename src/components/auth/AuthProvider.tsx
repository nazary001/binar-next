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
import { useRouter } from "next/navigation";
import { markWelcomed, signOut as apiSignOut } from "./api";
import { PROFILE_HREF, RESET_QUERY_PARAM, type Account } from "./data";
import { currentAccount, getServerSnapshot, getSnapshot, subscribe } from "./store";
import { AuthDrawer } from "./AuthDrawer";
import { WelcomeModal } from "./WelcomeModal";

// Which screen the drawer opens on (Figma «Authorisation NEW» 5420:38169).
// `auto` = «Sign in» for visitors, the signed-in summary for an account;
// `account` = the summary (after «Перейти в профіль» for a customer);
// `reset` = «Створіть новий пароль», opened by the (mocked) e-mailed
// link `/?reset=<token>`.
export type AuthEntry = "auto" | "account" | "reset";

type AuthContextValue = {
  user: Account | null;
  open: boolean;
  // Increments on every open so the drawer body remounts with fresh
  // state (no setState-in-effect resets).
  openCount: number;
  entry: AuthEntry;
  // The token of the reset link the drawer was opened with.
  resetToken: string | null;
  openAuth: (entry?: AuthEntry) => void;
  closeAuth: () => void;
  signOut: () => void;
  // Partner first login: the drawer closes and the
  // «Вітаємо на платформі Binar-2000» modal (4573:35590) takes over.
  // The retail sign-up (5420:38224) does not use it; kept for the
  // partner onboarding (Figma 4260:38821).
  finishRegistration: () => void;
  welcomeOpen: boolean;
  closeWelcome: () => void;
  // «Перейти в профіль»: closes the modal; a partner goes to «Мій
  // профіль» (/profile), a retail customer gets the drawer summary.
  goToProfile: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

  const openAuth = useCallback((next: AuthEntry = "auto") => {
    setEntry(next);
    setOpenCount((c) => c + 1);
    setOpen(true);
  }, []);

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

  const signOut = useCallback(() => {
    apiSignOut();
    setOpen(false);
  }, []);

  const finishRegistration = useCallback(() => {
    setOpen(false);
    setWelcomeOpen(true);
  }, []);

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
      finishRegistration,
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
      finishRegistration,
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
