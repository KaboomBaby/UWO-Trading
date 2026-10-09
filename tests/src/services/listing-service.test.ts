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
import type {
  CreateListingInput,
  ShipDetails,
} from "../../../src/types/listing";
import { testShipDetails } from "../fixtures/ship-details";
import { OPTIONAL_SHIP_SKILLS } from "../../../src/data/ship-skills";

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
  shipDetails: testShipDetails,
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
  image_emoji: string | null;
  ship_details: ShipDetails | null;
  created_at: string;
  expires_at: string;
  sold_at: string | null;
  collection: "current" | "legacy" | null;
};

type SupabaseResponse = {
  data: unknown;
  error: PostgrestError | null;
  status: number;
  statusText: string;
};

type CapturedRequest = {
  table: string | null;
  select: string | null;
  rpc: { functionName: string; args: Record<string, unknown> } | null;
  filters: Array<{
    type: "eq" | "gt" | "or";
    column?: string;
    value?: unknown;
  }>;
  order: { column: string; options: { ascending: boolean } } | null;
  singleMode: "single" | "maybeSingle" | null;
  insert: Record<string, unknown> | null;
};

type QueryChain = {
  eq(column: string, value: unknown): QueryChain;
  gt(column: string, value: unknown): QueryChain;
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
      gt(column, value) {
        request.filters.push({ type: "gt", column, value });
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
        rpc: null,
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

  const rpcClient = {
    ...client,
    rpc(functionName: string, args: Record<string, unknown>) {
      const request: CapturedRequest = {
        table: null,
        select: null,
        rpc: { functionName, args },
        filters: [],
        order: null,
        singleMode: null,
        insert: null,
      };
      requests.push(request);
      return {
        single() {
          request.singleMode = "single";
          return Promise.resolve(currentResponse());
        },
        maybeSingle() {
          request.singleMode = "maybeSingle";
          return Promise.resolve(currentResponse());
        },
      };
    },
  };

  return {
    client: rpcClient as unknown as SupabaseClient,
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
  image_emoji: "🚢",
  ship_details: testShipDetails,
  created_at: "2026-10-01T12:00:00.000Z",
  expires_at: "2026-10-15T12:00:00Z",
  sold_at: null,
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
  imageEmoji: "🚢",
  shipDetails: testShipDetails,
  createdAt: "2026-10-01T12:00:00.000Z",
  expiresAt: "2026-10-15T12:00:00Z",
  soldAt: null,
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T10:00:00Z"));

    const repository = createLocalListingRepository();
    try {
      const legacy = await repository.list({ collection: "legacy" });
      const current = await repository.list({ collection: "current" });

      expect(legacy.map((listing) => listing.id)).toEqual([
        "legacy-grand-voyager",
      ]);
      expect(
        (
          await repository.list({ collection: "legacy", includeExpired: true })
        ).map((listing) => listing.id),
      ).toEqual(["legacy-grand-voyager", "legacy-merchant-caravel"]);
      expect(current).not.toContainEqual(
        expect.objectContaining({ collection: "legacy" }),
      );
    } finally {
      vi.useRealTimers();
    }
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
      shipDetails: testShipDetails,
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

  it("rejects ship listings without details and non-ship listings with them", () => {
    expect(
      validateListingInput({ ...validInput, shipDetails: null }).shipDetails,
    ).toBe("Ship details are required for Ships listings.");

    expect(
      validateListingInput({ ...validInput, category: "equipment" })
        .shipDetails,
    ).toBe("Ship details are only allowed for Ships listings.");
  });

  it("enforces ship skill list membership, limits, and duplicate rules", () => {
    const tooManyOptional = OPTIONAL_SHIP_SKILLS.slice(0, 6);
    expect(
      validateListingInput({
        ...validInput,
        shipDetails: {
          ...testShipDetails,
          optionalSkills: tooManyOptional,
        },
      }).shipDetails,
    ).toBe("Choose at most five Optional ship skills.");

    const duplicatedSkill = OPTIONAL_SHIP_SKILLS[0];
    if (!duplicatedSkill) throw new Error("Optional fixture skill is missing");
    expect(
      validateListingInput({
        ...validInput,
        shipDetails: {
          ...testShipDetails,
          originalSkill: duplicatedSkill,
          optionalSkills: [duplicatedSkill],
        },
      }).shipDetails,
    ).toBe("Choose each ship skill only once.");

    expect(
      validateListingInput({
        ...validInput,
        shipDetails: {
          ...testShipDetails,
          optionalSkills: [{ name: "Not a game skill", iconId: "99999999" }],
        },
      }).shipDetails,
    ).toBe("Ship skills must come from their matching game list.");
  });

  it("ignores retired shipbuilding keys in legacy ship details", () => {
    const legacyShipDetails = {
      ...testShipDetails,
      buildingDays: 99,
      requiredHull: "Legacy Flush Deck Style Hull",
    };

    expect(
      validateListingInput({ ...validInput, shipDetails: legacyShipDetails }),
    ).toEqual({});
  });

  it("validates that improvements are nonnegative whole numbers", () => {
    expect(
      validateListingInput({
        ...validInput,
        shipDetails: { ...testShipDetails, improvements: -1 },
      }).shipDetails,
    ).toBe("Ship improvements must be a whole number of zero or more.");
  });

  it("manages a local listing through its private edit code", async () => {
    const repository = createLocalListingRepository([]);
    const created = await repository.create(validInput);

    expect(created.editCode).toMatch(/^[a-f0-9]{32}$/);
    expect(await repository.findByEditCode(created.editCode)).toMatchObject({
      id: created.id,
    });
    expect(await repository.findByEditCode("wrong-code")).toBeUndefined();

    const updated = await repository.update(created.editCode, {
      ...validInput,
      title: "Updated Schooner",
    });
    expect(updated.title).toBe("Updated Schooner");
    expect(updated.shipDetails).toEqual(testShipDetails);

    const sold = await repository.markSold(created.editCode);
    expect(sold.soldAt).toEqual(expect.any(String));

    const renewed = await repository.renew(created.editCode);
    expect(new Date(renewed.expiresAt).getTime()).toBeGreaterThan(Date.now());

    await repository.delete(created.editCode);
    expect(await repository.get(created.id)).toBeUndefined();
    await expect(repository.delete(created.editCode)).rejects.toThrow(
      "Listing edit code not found.",
    );
  });

  it("creates and manages local offers and reports", async () => {
    const repository = createLocalListingRepository([]);
    const created = await repository.create(validInput);
    const offerInput = {
      offererName: "Captain Offer",
      contact: "In-game mail",
      currency: "CT" as const,
      amount: 120,
      offerText: "Twelve Captain Tickets and a fitted cannon set.",
    };

    await repository.createOffer(created.id, offerInput);
    await expect(repository.countOffers(created.id)).resolves.toBe(1);

    const [offer] = await repository.listOffers(created.editCode);
    expect(offer).toMatchObject({
      offererName: "Captain Offer",
      status: "pending",
    });

    await expect(
      repository.acceptOffer(created.editCode, offer.id),
    ).resolves.toMatchObject({ status: "accepted" });
    await expect(
      repository.declineOffer(created.editCode, offer.id),
    ).resolves.toMatchObject({ status: "declined" });

    await repository.report(created.id, {
      reporterName: "Port Observer",
      reason: "spam",
      details: "Duplicate posting.",
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
        { type: "gt", column: "expires_at", value: expect.any(String) },
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

  it("validates before inserting, then maps the created row", async () => {
    const mock = createMockSupabaseClient({
      data: {
        listing: dbListing,
        edit_code: expect.any(String),
      },
      error: null,
      status: 201,
      statusText: "Created",
    });
    const repository = createSupabaseListingRepository(mock.client);

    await expect(
      repository.create({ ...validInput, title: "x" }),
    ).rejects.toBeInstanceOf(ListingValidationError);
    expect(mock.requests).toHaveLength(0);

    const created = await repository.create(validInput);
    expect(created).toEqual({
      ...expectedListing,
      editCode: expect.any(String),
    });

    expect(mock.requests).toHaveLength(1);
    expect(mock.requests[0]?.rpc).toMatchObject({
      functionName: "create_listing",
      args: {
        edit_code: expect.any(String),
        title: validInput.title,
        category: validInput.category,
        price: validInput.price,
        currency: "ducats",
        description: validInput.description,
        seller: validInput.seller,
        location: validInput.location,
        server_name: validInput.server,
        contact_note: validInput.contactNote,
        image_emoji: "📦",
        ship_details: testShipDetails,
        collection: "current",
      },
    });
    expect(mock.requests[0]?.singleMode).toBe("single");
  });

  it("manages a listing through verified edit-code RPCs", async () => {
    const mock = createMockSupabaseClient({
      data: dbListing,
      error: null,
      status: 200,
      statusText: "OK",
    });
    const repository = createSupabaseListingRepository(mock.client);

    expect(await repository.findByEditCode("test-edit-code")).toEqual(
      expectedListing,
    );

    const updated = await repository.update("test-edit-code", validInput);
    expect(updated.id).toBe(dbListing.id);

    await expect(repository.markSold("test-edit-code")).resolves.toEqual(
      expectedListing,
    );
    await expect(repository.renew("test-edit-code")).resolves.toEqual(
      expectedListing,
    );

    mock.respond({
      data: true,
      error: null,
      status: 200,
      statusText: "OK",
    });
    await expect(repository.delete("test-edit-code")).resolves.toBeUndefined();

    expect(mock.requests.map((request) => request.rpc?.functionName)).toEqual([
      "get_listing_by_edit_code",
      "update_listing",
      "mark_listing_sold",
      "renew_listing",
      "delete_listing",
    ]);
    expect(mock.requests[1]?.rpc?.args).toMatchObject({
      edit_code: "test-edit-code",
      title: validInput.title,
      category: validInput.category,
      currency: validInput.currency,
      price: validInput.price,
      description: validInput.description,
      seller: validInput.seller,
      location: validInput.location,
      server_name: validInput.server,
      contact_note: validInput.contactNote,
      ship_details: testShipDetails,
    });
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
