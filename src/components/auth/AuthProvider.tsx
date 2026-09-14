"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { markWelcomed, signOut as apiSignOut } from "./api";
import type { Account } from "./data";
import { currentAccount, getServerSnapshot, getSnapshot, subscribe } from "./store";
import { AuthDrawer } from "./AuthDrawer";
import { WelcomeModal } from "./WelcomeModal";

// Which screen the drawer opens on. `auto` = the entry the master
// describes: «Sign in» (login + password) for a device that already
// holds an account, otherwise «Sign up» (phone -> code -> registration).
export type AuthEntry = "auto" | "account";

type AuthContextValue = {
  user: Account | null;
  hasAccounts: boolean;
  open: boolean;
  // Increments on every open so the drawer body remounts with fresh
  // state (no setState-in-effect resets).
  openCount: number;
  entry: AuthEntry;
  openAuth: (entry?: AuthEntry) => void;
  closeAuth: () => void;
  signOut: () => void;
  // Registration done: the drawer closes and the first-login
  // «Вітаємо на платформі Binar-2000» modal (4573:35590) takes over.
  finishRegistration: () => void;
  welcomeOpen: boolean;
  closeWelcome: () => void;
  // «Перейти в профіль»: closes the modal and shows the account screen
  // (the profile pages are not designed for the site yet).
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
  const hasAccounts = state.accounts.length > 0;

  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [entry, setEntry] = useState<AuthEntry>("auto");
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  const openAuth = useCallback((next: AuthEntry = "auto") => {
    setEntry(next);
    setOpenCount((c) => c + 1);
    setOpen(true);
  }, []);
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
    openAuth("account");
  }, [openAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      hasAccounts,
      open,
      openCount,
      entry,
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
      hasAccounts,
      open,
      openCount,
      entry,
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
