import { mockListings } from "../data/mock-listings";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateListingInput,
  Listing,
  ListingCategory,
  ListingCollection,
  ListingCurrency,
  ListingQuery,
} from "../types/listing";
import { isNumericListingCurrency } from "../types/listing";

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

function comparePrices(
  a: Listing["price"],
  b: Listing["price"],
  ascending: boolean,
) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return ascending ? a - b : b - a;
}

export function validateListingInput(input: CreateListingInput) {
  const errors: Record<string, string> = {};
  if (input.title.trim().length < 3)
    errors.title = "Title must be at least 3 characters.";
  if (isNumericListingCurrency(input.currency)) {
    if (input.price === null) {
      errors.price = "Price is required for this currency.";
    } else if (!Number.isFinite(input.price) || input.price <= 0) {
      errors.price = "Price must be greater than zero.";
    } else if (input.currency === "CT" && !Number.isInteger(input.price)) {
      errors.price = "Captain Tickets must be a whole number.";
    }
  } else if (input.price !== null) {
    errors.currency =
      "Trade and negotiable listings cannot set a numeric price.";
  }
  if (input.description.trim().length < 10)
    errors.description = "Description must be at least 10 characters.";
  if (!input.seller.trim()) errors.seller = "Seller is required.";
  if (!input.location.trim()) errors.location = "Location is required.";
  if (!input.server.trim()) errors.server = "Server is required.";
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

export class SupabaseListingRepositoryError extends Error {
  constructor(
    operation: string,
    { code, details, hint, message }: PostgrestError,
  ) {
    const context = [
      code ? `code ${code}` : null,
      details ? `details: ${details}` : null,
      hint ? `hint: ${hint}` : null,
    ].filter(Boolean);
    const contextMessage = context.length > 0 ? ` (${context.join("; ")})` : "";

    super(`Unable to ${operation} in Supabase: ${message}${contextMessage}`, {
      cause: { code, details, hint, message },
    });
    this.name = "SupabaseListingRepositoryError";
  }
}

type ListingRow = {
  id: string;
  title: string;
  category: ListingCategory;
  price: number | null;
  currency: ListingCurrency;
  description: string;
  seller: string;
  location: string;
  server: string;
  contact_note: string;
  image_url: string | null;
  image_emoji: string | null;
  created_at: string;
  collection: ListingCollection | null;
};

function assertSuccessfulResponse(
  operation: string,
  error: PostgrestError | null,
) {
  if (error) {
    throw new SupabaseListingRepositoryError(operation, error);
  }
}

function mapListingRow(row: ListingRow): Listing {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    price: row.price,
    currency: row.currency,
    description: row.description,
    seller: row.seller,
    location: row.location,
    server: row.server,
    contactNote: row.contact_note,
    imageUrl: row.image_url,
    imageEmoji: row.image_emoji ?? "📦",
    createdAt: row.created_at,
    collection: row.collection ?? "current",
  };
}

function quotePostgrestFilterValue(value: string) {
  return `"${value.replace(/(["\\])/g, "\\$1")}"`;
}

function searchFilter(search: string) {
  const needle = search.trim();
  if (!needle) return null;

  // PostgREST treats commas and parentheses as filter syntax unless a value
  // containing them is quoted. Quoting keeps the user's search literal.
  const pattern = /[,"%()]/.test(needle)
    ? quotePostgrestFilterValue(`%${needle}%`)
    : `%${needle}%`;

  return [
    `title.ilike.${pattern}`,
    `description.ilike.${pattern}`,
    `seller.ilike.${pattern}`,
    `location.ilike.${pattern}`,
  ].join(",");
}

export function createSupabaseListingRepository(
  client: SupabaseClient,
): ListingRepository {
  return {
    async list(query: ListingQuery = {}) {
      let request = client.from("listings").select("*");

      const category = query.category ?? "all";
      if (category !== "all") {
        request = request.eq("category", category);
      }

      const collection = query.collection ?? "all";
      if (collection === "current") {
        request = request.or("collection.eq.current,collection.is.null");
      } else if (collection === "legacy") {
        request = request.eq("collection", collection);
      }

      const filter = query.search ? searchFilter(query.search) : null;
      if (filter) {
        request = request.or(filter);
      }

      if (query.sort === "price-asc") {
        request = request.order("price", {
          ascending: true,
          nullsFirst: false,
        });
      } else if (query.sort === "price-desc") {
        request = request.order("price", {
          ascending: false,
          nullsFirst: false,
        });
      } else {
        request = request.order("created_at", { ascending: false });
      }

      const { data, error } = await request;
      assertSuccessfulResponse("load listings", error);
      return (data ?? []).map(mapListingRow);
    },

    async get(id: string) {
      const { data, error } = await client
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      assertSuccessfulResponse("load listing", error);
      return data ? mapListingRow(data) : undefined;
    },

    async create(input: CreateListingInput) {
      const errors = validateListingInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const { data, error } = await client
        .from("listings")
        .insert({
          title: input.title,
          category: input.category,
          price: input.price,
          currency: input.currency,
          description: input.description,
          seller: input.seller,
          location: input.location,
          server: input.server.trim(),
          contact_note: input.contactNote?.trim() ?? "",
          image_url: input.imageUrl ?? null,
          image_emoji: input.imageEmoji ?? "📦",
          collection: input.collection ?? "current",
        })
        .select("*")
        .single();

      assertSuccessfulResponse("create listing", error);
      return mapListingRow(data);
    },
  };
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
        results = [...results].sort((a, b) =>
          comparePrices(a.price, b.price, true),
        );
      } else if (query.sort === "price-desc") {
        results = [...results].sort((a, b) =>
          comparePrices(a.price, b.price, false),
        );
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
        currency: input.currency,
        ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
        imageEmoji: input.imageEmoji ?? "📦",
        server: input.server.trim(),
        contactNote: input.contactNote?.trim() ?? "",
        collection: input.collection ?? "current",
        createdAt: new Date().toISOString(),
      };
      listings.unshift(listing);
      return { ...listing };
    },
  };
}
