"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { observeIdentity, type Identity, type Role } from "./auth";

interface AuthState { guest: Identity | null; musician: Identity | null; guestReady: boolean; musicianReady: boolean; error: unknown; }
const initial: AuthState = {guest: null, musician: null, guestReady: false, musicianReady: false, error: null};
const AuthContext = createContext<AuthState>(initial);

export function AuthProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<AuthState>(initial);
  const client = useQueryClient();
  const previous = useRef<Record<Role, string | null | undefined>>({guest: undefined, musician: undefined});
  useEffect(() => {
    const subscriptions = (["guest", "musician"] as const).map((role) => observeIdentity(role, (identity) => {
      if (previous.current[role] !== (identity?.uid ?? null)) {
        // Cancel first, then discard prior private data, including mutations.
        const prefix = role === "guest" ? "guest-requests" : "musician-dashboard";
        void client.cancelQueries({queryKey: [prefix]});
        client.removeQueries({queryKey: [prefix]});
        client.getMutationCache().clear();
        previous.current[role] = identity?.uid ?? null;
      }
      setState((current) => ({...current, [role]: identity, [`${role}Ready`]: true}));
    }, (error) => setState((current) => ({...current, error, [`${role}Ready`]: true, [role]: null}))));
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [client]);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {return useContext(AuthContext);}
