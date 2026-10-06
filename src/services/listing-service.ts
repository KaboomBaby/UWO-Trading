import { mockListings } from "../data/mock-listings";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  CreatedListing,
  CreateListingInput,
  Listing,
  ListingCategory,
  ListingCollection,
  ListingCurrency,
  ListingQuery,
  UpdateListingInput,
} from "../types/listing";
import { isNumericListingCurrency } from "../types/listing";

export interface ListingRepository {
  list(query?: ListingQuery): Promise<Listing[]>;
  get(id: string): Promise<Listing | undefined>;
  create(input: CreateListingInput): Promise<CreatedListing>;
  findByEditCode(editCode: string): Promise<Listing | undefined>;
  update(editCode: string, input: UpdateListingInput): Promise<Listing>;
  markSold(editCode: string): Promise<Listing>;
  renew(editCode: string): Promise<Listing>;
  delete(editCode: string): Promise<void>;
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

function generateListingEditCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
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
  expires_at: string;
  sold_at: string | null;
  collection: ListingCollection | null;
};

type CreateListingRpcResult = {
  listing: ListingRow;
  edit_code: string;
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
    expiresAt: row.expires_at,
    soldAt: row.sold_at,
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

function listingRpcArguments(editCode: string, input: CreateListingInput) {
  return {
    edit_code: editCode,
    title: input.title.trim(),
    category: input.category,
    currency: input.currency,
    price: input.price,
    description: input.description.trim(),
    seller: input.seller.trim(),
    location: input.location.trim(),
    server_name: input.server.trim(),
    contact_note: input.contactNote?.trim() ?? "",
    image_url: input.imageUrl ?? null,
    image_emoji: input.imageEmoji ?? "📦",
    collection: input.collection ?? "current",
  };
}

export function createSupabaseListingRepository(
  client: SupabaseClient,
): ListingRepository {
  return {
    async list(query: ListingQuery = {}) {
      let request = client.from("listings").select("*");
      if (!query.includeExpired) {
        request = request.gt("expires_at", new Date().toISOString());
      }

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
      return data ? mapListingRow(data as ListingRow) : undefined;
    },

    async create(input: CreateListingInput) {
      const errors = validateListingInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const editCode = generateListingEditCode();
      const { data, error } = await client
        .rpc("create_listing", listingRpcArguments(editCode, input))
        .single();

      assertSuccessfulResponse("create listing", error);
      const result = data as CreateListingRpcResult;
      return { ...mapListingRow(result.listing), editCode: result.edit_code };
    },

    async findByEditCode(editCode: string) {
      const { data, error } = await client
        .rpc("get_listing_by_edit_code", { edit_code: editCode })
        .maybeSingle();

      assertSuccessfulResponse("load listing with edit code", error);
      return data ? mapListingRow(data as ListingRow) : undefined;
    },

    async update(editCode: string, input: UpdateListingInput) {
      const errors = validateListingInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const { data, error } = await client
        .rpc("update_listing", listingRpcArguments(editCode, input))
        .single();

      assertSuccessfulResponse("update listing", error);
      return mapListingRow(data as ListingRow);
    },

    async markSold(editCode: string) {
      const { data, error } = await client
        .rpc("mark_listing_sold", { edit_code: editCode })
        .single();

      assertSuccessfulResponse("mark listing sold", error);
      return mapListingRow(data as ListingRow);
    },

    async renew(editCode: string) {
      const { data, error } = await client
        .rpc("renew_listing", { edit_code: editCode })
        .single();

      assertSuccessfulResponse("renew listing", error);
      return mapListingRow(data as ListingRow);
    },

    async delete(editCode: string) {
      const { data, error } = await client
        .rpc("delete_listing", { edit_code: editCode })
        .single();

      assertSuccessfulResponse("delete listing", error);
      if (!data) throw new Error("Listing edit code not found.");
    },
  };
}

export function createLocalListingRepository(
  initialListings: Listing[] = mockListings,
): ListingRepository {
  const listings = [...initialListings];
  const editCodes = new Map<string, string>();

  return {
    async list(query: ListingQuery = {}) {
      const category = query.category ?? "all";
      const collection = query.collection ?? "all";
      let results = listings.filter(
        (listing) =>
          (query.includeExpired ||
            new Date(listing.expiresAt).getTime() > Date.now()) &&
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
        expiresAt: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      const editCode = generateListingEditCode();
      listings.unshift(listing);
      editCodes.set(listing.id, editCode);
      return { ...listing, editCode };
    },

    async findByEditCode(editCode: string) {
      const listing = listings.find(
        (item) => editCodes.get(item.id) === editCode,
      );
      return listing ? { ...listing } : undefined;
    },

    async update(editCode: string, input: UpdateListingInput) {
      const errors = validateListingInput(input);
      if (Object.keys(errors).length > 0) {
        throw new ListingValidationError(errors);
      }

      const index = listings.findIndex(
        (item) => editCodes.get(item.id) === editCode,
      );
      if (index === -1) throw new Error("Listing edit code not found.");

      listings[index] = {
        ...listings[index],
        ...input,
        price: input.price,
        currency: input.currency,
        title: input.title.trim(),
        description: input.description.trim(),
        seller: input.seller.trim(),
        location: input.location.trim(),
        server: input.server.trim(),
        contactNote: input.contactNote?.trim() ?? "",
        imageEmoji: input.imageEmoji ?? "📦",
        collection: input.collection ?? "current",
      };
      return { ...listings[index] };
    },

    async markSold(editCode: string) {
      const index = listings.findIndex(
        (item) => editCodes.get(item.id) === editCode,
      );
      if (index === -1) throw new Error("Listing edit code not found.");

      listings[index] = {
        ...listings[index],
        soldAt: listings[index].soldAt ?? new Date().toISOString(),
      };
      return { ...listings[index] };
    },

    async renew(editCode: string) {
      const index = listings.findIndex(
        (item) => editCodes.get(item.id) === editCode,
      );
      if (index === -1) throw new Error("Listing edit code not found.");

      listings[index] = {
        ...listings[index],
        expiresAt: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      return { ...listings[index] };
    },

    async delete(editCode: string) {
      const index = listings.findIndex(
        (item) => editCodes.get(item.id) === editCode,
      );
      if (index === -1) throw new Error("Listing edit code not found.");

      const [listing] = listings.splice(index, 1);
      editCodes.delete(listing.id);
    },
  };
}
