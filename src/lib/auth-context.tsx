import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseClient } from "./supabase-client";

export type AuthActionResult = {
  requiresConfirmation: boolean;
};

type AuthContextValue = {
  email: string | null;
  isInitializing: boolean;
  isSupabaseEnabled: boolean;
  register: (
    email: string,
    password: string,
  ) => Promise<AuthActionResult | undefined>;
  session: Session | null;
  signIn: (
    email: string,
    password: string,
  ) => Promise<AuthActionResult | undefined>;
  signOut: () => Promise<void>;
  userId: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(() => client !== null);

  useEffect(() => {
    if (!client) return;

    let active = true;

    client.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setIsInitializing(false);
      });

    const { data } = client.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      setIsInitializing(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const register = useCallback(
    async (email: string, password: string) => {
      if (!client) throw new Error("Account sign-up is unavailable.");

      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw error;

      setSession(data.session ?? null);
      return { requiresConfirmation: data.session === null };
    },
    [client],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!client) throw new Error("Account sign-in is unavailable.");

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      setSession(data.session);
      return { requiresConfirmation: false };
    },
    [client],
  );

  const signOut = useCallback(async () => {
    if (!client) return;

    const { error } = await client.auth.signOut();
    if (error) throw error;
    setSession(null);
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      email: session?.user.email ?? null,
      isInitializing,
      isSupabaseEnabled: client !== null,
      register,
      session,
      signIn,
      signOut,
      userId: session?.user.id ?? null,
    }),
    [client, isInitializing, register, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
