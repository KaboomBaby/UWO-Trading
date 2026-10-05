import { createContext, useContext, useMemo } from "react";

import {
  createLocalListingRepository,
  type ListingRepository,
} from "../services/listing-service";

const ListingRepositoryContext = createContext<ListingRepository | null>(null);

export function ListingRepositoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const repository = useMemo(() => createLocalListingRepository(), []);
  return (
    <ListingRepositoryContext.Provider value={repository}>
      {children}
    </ListingRepositoryContext.Provider>
  );
}

export function useListingRepository() {
  const repository = useContext(ListingRepositoryContext);
  if (!repository) {
    throw new Error(
      "useListingRepository must be used inside ListingRepositoryProvider.",
    );
  }
  return repository;
}
