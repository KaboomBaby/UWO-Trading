import { createContext, useContext, useMemo } from "react";

import {
  createLocalCommerceRepository,
  createSupabaseCommerceRepository,
  type CommerceRepository,
} from "../services/commerce-service";
import { getSupabaseClient } from "./supabase-client";

const CommerceRepositoryContext = createContext<CommerceRepository | null>(
  null,
);

export function CommerceRepositoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const repository = useMemo(() => {
    const client = getSupabaseClient();
    return client
      ? createSupabaseCommerceRepository(client)
      : createLocalCommerceRepository();
  }, []);
  return (
    <CommerceRepositoryContext.Provider value={repository}>
      {children}
    </CommerceRepositoryContext.Provider>
  );
}

export function useCommerceRepository() {
  const repository = useContext(CommerceRepositoryContext);
  if (!repository) {
    throw new Error(
      "useCommerceRepository must be used inside CommerceRepositoryProvider.",
    );
  }
  return repository;
}
