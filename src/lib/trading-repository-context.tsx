import { createContext, useContext, useMemo } from "react";

import {
  createLocalTradingRepository,
  createSupabaseTradingRepository,
  type TradingRepository,
} from "../services/trading-service";
import { getSupabaseClient } from "./supabase-client";

const TradingRepositoryContext = createContext<TradingRepository | null>(null);

export function TradingRepositoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const repository = useMemo(() => {
    const client = getSupabaseClient();
    return client
      ? createSupabaseTradingRepository(client)
      : createLocalTradingRepository();
  }, []);
  return (
    <TradingRepositoryContext.Provider value={repository}>
      {children}
    </TradingRepositoryContext.Provider>
  );
}

export function useTradingRepository() {
  const repository = useContext(TradingRepositoryContext);
  if (!repository) {
    throw new Error(
      "useTradingRepository must be used inside TradingRepositoryProvider.",
    );
  }
  return repository;
}
