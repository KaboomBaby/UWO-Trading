import { createContext, useContext, useMemo } from "react";

import {
  createLocalMarketRepository,
  type MarketRepository,
} from "../services/market-service";

const MarketRepositoryContext = createContext<MarketRepository | null>(null);

export function MarketRepositoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const repository = useMemo(() => createLocalMarketRepository(), []);
  return (
    <MarketRepositoryContext.Provider value={repository}>
      {children}
    </MarketRepositoryContext.Provider>
  );
}

export function useMarketRepository() {
  const repository = useContext(MarketRepositoryContext);
  if (!repository) {
    throw new Error(
      "useMarketRepository must be used inside MarketRepositoryProvider.",
    );
  }
  return repository;
}
