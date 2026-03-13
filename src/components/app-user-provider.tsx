"use client";

import { createContext, useContext } from "react";

import type { AppUser } from "@/types/auth";

const AppUserContext = createContext<AppUser | null>(null);

type AppUserProviderProps = {
  children: React.ReactNode;
  user: AppUser;
};

export function AppUserProvider({ children, user }: AppUserProviderProps) {
  return <AppUserContext.Provider value={user}>{children}</AppUserContext.Provider>;
}

export function useAppUser() {
  const value = useContext(AppUserContext);

  if (!value) {
    throw new Error("useAppUser must be used within AppUserProvider.");
  }

  return value;
}
