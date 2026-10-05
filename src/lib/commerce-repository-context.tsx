import { createContext, useContext, useMemo } from "react";

import {
  createLocalCommerceRepository,
  type CommerceRepository,
} from "../services/commerce-service";

const CommerceRepositoryContext = createContext<CommerceRepository | null>(
  null,
);

export function CommerceRepositoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const repository = useMemo(() => createLocalCommerceRepository(), []);
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
