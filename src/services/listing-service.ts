import { mockListings } from "../data/mock-listings";
import type {
  CreateListingInput,
  Listing,
  ListingCategory,
  ListingCollection,
  ListingQuery,
} from "../types/listing";

export interface ListingRepository {
  list(query?: ListingQuery): Promise<Listing[]>;
  get(id: string): Promise<Listing | undefined>;
  create(input: CreateListingInput): Promise<Listing>;
}

export function normalizeCategory(value: string): ListingCategory | "all" {
  return value === "all" ? "all" : (value as ListingCategory);
}

export function normalizeCollection(
  value: string | null,
): ListingCollection | "all" {
  return value === "legacy" || value === "current" ? value : "all";
}

function matchesQuery(listing: Listing, search?: string) {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [listing.title, listing.description, listing.seller, listing.location]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function validateListingInput(input: CreateListingInput) {
  const errors: Record<string, string> = {};
  if (input.title.trim().length < 3)
    errors.title = "Title must be at least 3 characters.";
  if (!Number.isFinite(input.price) || input.price <= 0)
    errors.price = "Price must be greater than zero.";
  if (input.description.trim().length < 10)
    errors.description = "Description must be at least 10 characters.";
  if (!input.seller.trim()) errors.seller = "Seller is required.";
  if (!input.location.trim()) errors.location = "Location is required.";
  return errors;
}

export class ListingValidationError extends Error {
  readonly errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    super("Listing input is invalid.");
    this.name = "ListingValidationError";
    this.errors = errors;
  }
}

export function createLocalListingRepository(
  initialListings: Listing[] = mockListings,
): ListingRepository {
  const listings = [...initialListings];

  return {
    async list(query: ListingQuery = {}) {
      const category = query.category ?? "all";
      const collection = query.collection ?? "all";
      let results = listings.filter(
        (listing) =>
          (category === "all" || listing.category === category) &&
          (collection === "all" ||
            (listing.collection ?? "current") === collection) &&
          matchesQuery(listing, query.search),
      );

      if (query.sort === "price-asc") {
        results = [...results].sort((a, b) => a.price - b.price);
      } else if (query.sort === "price-desc") {
        results = [...results].sort((a, b) => b.price - a.price);
      } else {
        results = [...results].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        );
      }

      return results.map((listing) => ({ ...listing }));
    },

    async get(id: string) {
      const listing = listings.find((item) => item.id === id);
      return listing ? { ...listing } : undefined;
    },

    async create(input: CreateListingInput) {
      const errors = validateListingInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const listing: Listing = {
        ...input,
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `listing-${Date.now()}`,
        currency: "gold",
        imageEmoji: input.imageEmoji ?? "📦",
        collection: input.collection ?? "current",
        createdAt: new Date().toISOString(),
      };
      listings.unshift(listing);
      return { ...listing };
    },
  };
}
