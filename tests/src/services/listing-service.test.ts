import { act, renderHook } from "@testing-library/react";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLocalListingRepository,
  createSupabaseListingRepository,
  ListingValidationError,
  SupabaseListingRepositoryError,
  validateListingInput,
} from "../../../src/services/listing-service";
import {
  ListingRepositoryProvider,
  useListingRepository,
} from "../../../src/lib/listing-repository-context";
import { getSupabaseClient } from "../../../src/lib/supabase-client";
import type { CreateListingInput } from "../../../src/types/listing";

vi.mock("../../../src/lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(),
}));

const validInput: CreateListingInput = {
  title: "Trading Schooner",
  category: "ships",
  price: 32_000_000,
  currency: "ducats",
  description: "A swift schooner suitable for regional trade routes.",
  seller: "AmsterdamShipyard",
  location: "Amsterdam",
  server: "Maris",
  contactNote: "Mail me at the Amsterdam dock.",
};

type ListingRow = {
  id: string;
  title: string;
  category: "ships";
  price: number | null;
  currency: "ducats" | "UWC" | "CT" | "trade" | "negotiable";
  description: string;
  seller: string;
  location: string;
  server: string;
  contact_note: string;
  image_url: string | null;
  image_emoji: string | null;
  created_at: string;
  collection: "current" | "legacy" | null;
};

type SupabaseResponse = {
  data: unknown;
  error: PostgrestError | null;
  status: number;
  statusText: string;
};

type CapturedRequest = {
  table: string;
  select: string | null;
  filters: Array<{ type: "eq" | "or"; column?: string; value?: unknown }>;
  order: { column: string; options: { ascending: boolean } } | null;
  singleMode: "single" | "maybeSingle" | null;
  insert: Record<string, unknown> | null;
};

type QueryChain = {
  eq(column: string, value: unknown): QueryChain;
  or(filter: string): QueryChain;
  order(
    column: string,
    options: { ascending: boolean; nullsFirst?: boolean },
  ): QueryChain;
  maybeSingle(): Promise<SupabaseResponse>;
  single(): Promise<SupabaseResponse>;
  then(
    onFulfilled?: (response: SupabaseResponse) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<unknown>;
};

function createMockSupabaseClient(initialResponse: SupabaseResponse) {
  let response = initialResponse;
  const requests: CapturedRequest[] = [];

  function currentResponse(): SupabaseResponse {
    return { ...response };
  }

  function createFilter(request: CapturedRequest): QueryChain {
    const filter: QueryChain = {
      eq(column, value) {
        request.filters.push({ type: "eq", column, value });
        return filter;
      },
      or(orFilter) {
        request.filters.push({ type: "or", value: orFilter });
        return filter;
      },
      order(column, options) {
        request.order = { column, options };
        return filter;
      },
      maybeSingle() {
        request.singleMode = "maybeSingle";
        return Promise.resolve(currentResponse());
      },
      single() {
        request.singleMode = "single";
        return Promise.resolve(currentResponse());
      },
      then(onFulfilled, onRejected) {
        return Promise.resolve(currentResponse()).then(onFulfilled, onRejected);
      },
    };

    return filter;
  }

  const client = {
    from(table: string) {
      const request: CapturedRequest = {
        table,
        select: null,
        filters: [],
        order: null,
        singleMode: null,
        insert: null,
      };
      requests.push(request);

      return {
        select(columns = "*") {
          request.select = columns;
          return createFilter(request);
        },
        insert(row: Record<string, unknown>) {
          request.insert = row;
          return {
            select(columns = "*") {
              request.select = columns;
              return createFilter(request);
            },
          };
        },
      };
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    requests,
    respond(nextResponse: SupabaseResponse) {
      response = nextResponse;
    },
  };
}

const dbListing: ListingRow = {
  id: "supabase-frigate",
  title: "Supabase Frigate",
  category: "ships",
  price: 42_000_000,
  currency: "ducats",
  description: "A fast database-backed trading vessel.",
  seller: "Postgres Harbor",
  location: "Amsterdam",
  server: "Maris",
  contact_note: "Mail me at the database harbor.",
  image_url: null,
  image_emoji: "🚢",
  created_at: "2026-10-01T12:00:00.000Z",
  collection: "legacy",
};

const expectedListing = {
  id: "supabase-frigate",
  title: "Supabase Frigate",
  category: "ships",
  price: 42_000_000,
  currency: "ducats",
  description: "A fast database-backed trading vessel.",
  seller: "Postgres Harbor",
  location: "Amsterdam",
  server: "Maris",
  contactNote: "Mail me at the database harbor.",
  imageUrl: null,
  imageEmoji: "🚢",
  createdAt: "2026-10-01T12:00:00.000Z",
  collection: "legacy",
} as const;

const getSupabaseClientMock = vi.mocked(getSupabaseClient);

describe("local listing repository", () => {
  it("filters by category and search", async () => {
    const repository = createLocalListingRepository();
    const ships = await repository.list({
      category: "ships",
      search: "frigate",
    });
    expect(ships).toHaveLength(1);
    expect(ships[0]?.title).toBe("Adventurer Frigate");
  });

  it("sorts by ascending price", async () => {
    const repository = createLocalListingRepository();
    const listings = await repository.list({ sort: "price-asc" });
    const prices = listings
      .map((listing) => listing.price)
      .filter((price): price is number => price !== null);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("filters by current and legacy collections", async () => {
    const repository = createLocalListingRepository();
    const legacy = await repository.list({ collection: "legacy" });
    const current = await repository.list({ collection: "current" });

    expect(legacy.map((listing) => listing.id)).toEqual([
      "legacy-grand-voyager",
      "legacy-merchant-caravel",
    ]);
    expect(current).not.toContainEqual(
      expect.objectContaining({ collection: "legacy" }),
    );
  });

  it("finds a listing by id", async () => {
    const repository = createLocalListingRepository();
    expect(await repository.get("adventurer-frigate")).toMatchObject({
      title: "Adventurer Frigate",
    });
    expect(await repository.get("missing-listing")).toBeUndefined();
  });

  it("creates a valid listing in local memory", async () => {
    const repository = createLocalListingRepository([]);
    const created = await repository.create({
      ...validInput,
      collection: "legacy",
    });
    expect(await repository.list()).toHaveLength(1);
    expect(await repository.get(created.id)).toMatchObject({
      title: "Trading Schooner",
      collection: "legacy",
    });
  });

  it("creates a barter listing without a numeric price", async () => {
    const repository = createLocalListingRepository([]);
    const created = await repository.create({
      ...validInput,
      currency: "trade",
      price: null,
    });

    expect(created).toMatchObject({
      currency: "trade",
      price: null,
      server: "Maris",
      contactNote: "Mail me at the Amsterdam dock.",
    });
  });

  it("validates currency-specific prices", () => {
    expect(
      validateListingInput({ ...validInput, currency: "negotiable" }),
    ).toMatchObject({
      currency: "Trade and negotiable listings cannot set a numeric price.",
    });

    expect(
      validateListingInput({
        ...validInput,
        currency: "CT",
        price: 120.5,
      }),
    ).toMatchObject({
      price: "Captain Tickets must be a whole number.",
    });
  });

  it("rejects invalid input with field errors", async () => {
    const errors = validateListingInput({
      ...validInput,
      title: "x",
      price: 0,
    });
    expect(errors.title).toContain("at least 3 characters");
    expect(errors.price).toContain("greater than zero");

    const repository = createLocalListingRepository([]);
    await expect(
      repository.create({ ...validInput, seller: " " }),
    ).rejects.toBeInstanceOf(ListingValidationError);
  });
});

describe("Supabase listing repository", () => {
  beforeEach(() => {
    getSupabaseClientMock.mockReset();
  });

  it("maps rows and sends list query, sort, and filter semantics", async () => {
    const mock = createMockSupabaseClient({
      data: [{ ...dbListing, image_emoji: null, collection: null }],
      error: null,
      status: 200,
      statusText: "OK",
    });
    const repository = createSupabaseListingRepository(mock.client);

    await expect(
      repository.list({
        category: "ships",
        collection: "current",
        search: "Fast Vessel",
        sort: "price-desc",
      }),
    ).resolves.toEqual([
      {
        ...expectedListing,
        imageEmoji: "📦",
        collection: "current",
      },
    ]);

    expect(mock.requests).toHaveLength(1);
    expect(mock.requests[0]).toMatchObject({
      table: "listings",
      select: "*",
      filters: [
        { type: "eq", column: "category", value: "ships" },
        {
          type: "or",
          value: "collection.eq.current,collection.is.null",
        },
        {
          type: "or",
          value:
            "title.ilike.%Fast Vessel%,description.ilike.%Fast Vessel%,seller.ilike.%Fast Vessel%,location.ilike.%Fast Vessel%",
        },
      ],
      order: {
        column: "price",
        options: { ascending: false, nullsFirst: false },
      },
    });
  });

  it("uses newest-first ordering by default and maps a fetched row", async () => {
    const mock = createMockSupabaseClient({
      data: [dbListing],
      error: null,
      status: 200,
      statusText: "OK",
    });
    const repository = createSupabaseListingRepository(mock.client);

    await expect(repository.list()).resolves.toEqual([
      {
        ...expectedListing,
      },
    ]);
    expect(mock.requests[0]?.order).toEqual({
      column: "created_at",
      options: { ascending: false },
    });

    mock.respond({
      data: dbListing,
      error: null,
      status: 200,
      statusText: "OK",
    });
    await expect(repository.get("supabase-frigate")).resolves.toEqual(
      expectedListing,
    );
    expect(mock.requests[1]).toMatchObject({
      table: "listings",
      filters: [{ type: "eq", column: "id", value: "supabase-frigate" }],
      singleMode: "maybeSingle",
    });
    mock.respond({
      data: null,
      error: null,
      status: 406,
      statusText: "Not Acceptable",
    });
    expect(await repository.get("missing")).toBeUndefined();
  });

  it("maps a stored public image URL", async () => {
    const mock = createMockSupabaseClient({
      data: [{ ...dbListing, image_url: "https://example.test/frigate.png" }],
      error: null,
      status: 200,
      statusText: "OK",
    });
    const repository = createSupabaseListingRepository(mock.client);

    await expect(repository.list()).resolves.toMatchObject([
      { imageUrl: "https://example.test/frigate.png" },
    ]);
  });

  it("validates before inserting, then maps the created row", async () => {
    const imageUrl = "https://example.test/schooner.webp";
    const mock = createMockSupabaseClient({
      data: { ...dbListing, image_url: imageUrl },
      error: null,
      status: 201,
      statusText: "Created",
    });
    const repository = createSupabaseListingRepository(mock.client);

    await expect(
      repository.create({ ...validInput, title: "x" }),
    ).rejects.toBeInstanceOf(ListingValidationError);
    expect(mock.requests).toHaveLength(0);

    await expect(
      repository.create({ ...validInput, imageUrl }),
    ).resolves.toEqual({ ...expectedListing, imageUrl });

    expect(mock.requests).toHaveLength(1);
    expect(mock.requests[0]?.insert).toEqual({
      title: validInput.title,
      category: validInput.category,
      price: validInput.price,
      currency: "ducats",
      description: validInput.description,
      seller: validInput.seller,
      location: validInput.location,
      server: validInput.server,
      contact_note: validInput.contactNote,
      image_url: imageUrl,
      image_emoji: "📦",
      collection: "current",
    });
    expect(mock.requests[0]?.singleMode).toBe("single");
  });

  it("wraps Supabase errors with operation and PostgREST context", async () => {
    const error = {
      message: "Relation does not exist",
      details: "missing table",
      hint: "Run the migration",
      code: "42P01",
    } as PostgrestError;
    const mock = createMockSupabaseClient({
      data: null,
      error,
      status: 404,
      statusText: "Not Found",
    });
    const repository = createSupabaseListingRepository(mock.client);

    const failure = repository.list();
    await expect(failure).rejects.toBeInstanceOf(
      SupabaseListingRepositoryError,
    );
    await expect(failure).rejects.toThrow(
      "Unable to load listings in Supabase: Relation does not exist (code 42P01; details: missing table; hint: Run the migration)",
    );
  });

  it("provides the local repository without credentials", async () => {
    getSupabaseClientMock.mockReturnValue(null);

    const { result } = renderHook(() => useListingRepository(), {
      wrapper: ListingRepositoryProvider,
    });

    await act(async () => {
      await expect(
        result.current.list({ category: "ships", search: "frigate" }),
      ).resolves.toHaveLength(1);
    });
  });

  it("provides the Supabase repository when a client is available", async () => {
    const mock = createMockSupabaseClient({
      data: [dbListing],
      error: null,
      status: 200,
      statusText: "OK",
    });
    getSupabaseClientMock.mockReturnValue(mock.client);

    const { result } = renderHook(() => useListingRepository(), {
      wrapper: ListingRepositoryProvider,
    });

    await act(async () => {
      await expect(result.current.list()).resolves.toHaveLength(1);
    });
    expect(mock.requests).toHaveLength(1);
    expect(mock.requests[0]?.table).toBe("listings");
  });
});
