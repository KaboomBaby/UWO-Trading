import { act, renderHook } from "@testing-library/react";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLocalListingRepository,
  createSupabaseListingRepository,
  ListingValidationError,
  SupabaseListingRepositoryError,
  validateListingInput,
  validateOfferInput,
} from "../../../src/services/listing-service";
import {
  ListingRepositoryProvider,
  useListingRepository,
} from "../../../src/lib/listing-repository-context";
import { getSupabaseClient } from "../../../src/lib/supabase-client";
import type {
  CreateOfferInput,
  EquipmentDetails,
  CreateListingInput,
  Listing,
  ListingCategory,
  ListingCurrency,
  Offer,
  ShipDetails,
} from "../../../src/types/listing";
import { testShipDetails } from "../fixtures/ship-details";
import {
  testEquipmentDetails,
  testWeaponDetails,
} from "../fixtures/equipment-details";
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

const validOfferInput: CreateOfferInput = {
  offererName: "Captain Offer",
  currency: "CT",
  amount: 120,
  offerText: "Twelve Captain Tickets and a fitted cannon set.",
};

function localListingFixture(): Listing {
  return {
    id: "local-frigate",
    title: "Local Schooner",
    category: "ships",
    price: 32_000_000,
    currency: "ducats",
    description: "A swift local fixture vessel.",
    seller: "AmsterdamShipyard",
    location: "Amsterdam",
    server: "Maris",
    contactNote: "",
    imageEmoji: "🚢",
    shipDetails: testShipDetails,
    createdAt: "2026-10-01T12:00:00Z",
    expiresAt: "2026-10-15T12:00:00Z",
    soldAt: null,
    collection: "current",
  };
}

type ListingRow = {
  id: string;
  owner_id: string | null;
  title: string;
  category: ListingCategory;
  price: number | null;
  currency: "ducats" | "UWC" | "CT" | "trade" | "negotiable";
  description: string;
  seller: string;
  location: string;
  server: string;
  contact_note: string;
  image_emoji: string | null;
  ship_details: ShipDetails | null;
  equipment_details: EquipmentDetails | null;
  created_at: string;
  expires_at: string;
  sold_at: string | null;
  collection: "current" | "legacy" | null;
};

type OfferRow = {
  id: string;
  listing_id: string;
  offerer_name: string;
  contact: string;
  currency: ListingCurrency;
  amount: number | null;
  offer_text: string;
  status: Offer["status"];
  created_at: string;
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
  update: Record<string, unknown> | null;
  isDelete: boolean;
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
  select(columns?: string): QueryChain;
  update(values: Record<string, unknown>): QueryChain;
  delete(): QueryChain;
  then(
    onFulfilled?: (response: SupabaseResponse) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<unknown>;
};

function createMockSupabaseClient(initialResponse: SupabaseResponse) {
  const responses: SupabaseResponse[] = [initialResponse];
  const requests: CapturedRequest[] = [];

  function currentResponse(): SupabaseResponse {
    if (responses.length <= 1) return { ...responses[0] };
    return responses.shift() as SupabaseResponse;
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
      select(columns = "*") {
        request.select = columns;
        return filter;
      },
      update(values) {
        request.update = values;
        return filter;
      },
      delete() {
        request.isDelete = true;
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
        update: null,
        isDelete: false,
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
        update(values: Record<string, unknown>) {
          request.update = values;
          return createFilter(request);
        },
        delete() {
          request.isDelete = true;
          return createFilter(request);
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
        update: null,
        isDelete: false,
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
      responses.splice(0, responses.length, nextResponse);
    },
    respondMany(nextResponses: SupabaseResponse[]) {
      responses.splice(1, 0, ...nextResponses);
    },
  };
}

function successfulResponse(data: unknown): SupabaseResponse {
  return { data, error: null, status: 200, statusText: "OK" };
}

const dbListing: ListingRow = {
  id: "supabase-frigate",
  owner_id: "player-account-1",
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
  equipment_details: null,
  created_at: "2026-10-01T12:00:00.000Z",
  expires_at: "2026-10-15T12:00:00Z",
  sold_at: null,
  collection: "legacy",
};

const expectedListing = {
  id: "supabase-frigate",
  ownerId: "player-account-1",
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
  equipmentDetails: null,
  createdAt: "2026-10-01T12:00:00.000Z",
  expiresAt: "2026-10-15T12:00:00Z",
  soldAt: null,
  collection: "legacy",
} as const;

const dbOffer: OfferRow = {
  id: "supabase-offer",
  listing_id: dbListing.id,
  offerer_name: "Captain Offer",
  contact: "In-game mail",
  currency: "CT",
  amount: 120,
  offer_text: "Twelve Captain Tickets and a fitted cannon set.",
  status: "pending",
  created_at: "2026-10-02T12:00:00Z",
};

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

  it("accepts blank descriptions, partial stats, and ship tickets", () => {
    expect(validateListingInput({ ...validInput, description: "" })).toEqual(
      {},
    );
    expect(
      validateListingInput({
        ...validInput,
        description: "short",
        shipDetails: { type: "trade", shipClass: "heavy" },
      }),
    ).toEqual({});
    expect(
      validateListingInput({
        ...validInput,
        shipDetails: {
          type: "battle",
          shipClass: "standard",
          performance: { rowPower: 130 },
          hold: { cargo: 950 },
        },
      }),
    ).toEqual({});
    expect(
      validateListingInput({
        ...validInput,
        shipDetails: { type: "battle", isTicket: true, ticketNumber: 407 },
      }),
    ).toEqual({});
    expect(
      validateListingInput({
        ...validInput,
        shipDetails: { type: "adventure", isTicket: true },
      }),
    ).toEqual({});
  });

  it("rejects invalid ticket numbers and negative partial stats", () => {
    for (const ticketNumber of [0, -3, 2.5]) {
      expect(
        validateListingInput({
          ...validInput,
          shipDetails: { type: "battle", isTicket: true, ticketNumber },
        }).shipDetails,
      ).toBe("Ticket No. must be a positive whole number.");
    }
    expect(
      validateListingInput({
        ...validInput,
        shipDetails: {
          type: "trade",
          shipClass: "heavy",
          performance: { rowPower: -1 },
        },
      }).shipDetails,
    ).toBe("Ship performance values must be whole numbers of zero or more.");
    expect(
      validateListingInput({
        ...validInput,
        shipDetails: { type: "trade" },
      }).shipDetails,
    ).toBe("Choose a valid ship class.");
  });

  it("validates that improvements are nonnegative whole numbers", () => {
    expect(
      validateListingInput({
        ...validInput,
        shipDetails: { ...testShipDetails, improvements: -1 },
      }).shipDetails,
    ).toBe("Ship improvements must be a whole number of zero or more.");
  });

  it("accepts equipment listings with full, partial, or no stats", () => {
    const equipmentInput: CreateListingInput = {
      title: "Celestial Purple Changpao",
      category: "equipment",
      price: 45_000_000,
      currency: "ducats",
      description: "A fine changpao with strong bonuses.",
      seller: "Niadra",
      location: "Seville",
      server: "Maris",
      equipmentDetails: testEquipmentDetails,
    };
    expect(validateListingInput(equipmentInput)).toEqual({});
    expect(
      validateListingInput({
        ...equipmentInput,
        equipmentDetails: testWeaponDetails,
      }),
    ).toEqual({});
    expect(
      validateListingInput({
        ...equipmentInput,
        equipmentDetails: { attackPower: 142 },
      }),
    ).toEqual({});
    expect(
      validateListingInput({ ...equipmentInput, equipmentDetails: null }),
    ).toEqual({});
    expect(
      validateListingInput({ ...equipmentInput, equipmentDetails: {} }),
    ).toEqual({});
  });

  it("rejects equipment details on non-equipment listings", () => {
    expect(
      validateListingInput({
        ...validInput,
        equipmentDetails: testEquipmentDetails,
      }).equipmentDetails,
    ).toBe("Equipment details are only allowed for Equipment listings.");
  });

  it("enforces equipment skill membership, the three-skill limit, and duplicates", () => {
    const base: CreateListingInput = {
      title: "Celestial Purple Changpao",
      category: "equipment",
      price: 45_000_000,
      currency: "ducats",
      description: "",
      seller: "Niadra",
      location: "Seville",
      server: "Maris",
      equipmentDetails: testEquipmentDetails,
    };
    const bonuses = testEquipmentDetails.skillBonuses ?? [];
    expect(
      validateListingInput({
        ...base,
        equipmentDetails: {
          skillBonuses: [
            ...bonuses,
            { name: "Cooking", iconId: "skill_cooking", value: 1 },
          ],
        },
      }).equipmentDetails,
    ).toBe("Choose at most three equipment skill bonuses.");
    expect(
      validateListingInput({
        ...base,
        equipmentDetails: {
          skillBonuses: [
            { name: "Teleport", iconId: "skill_teleport", value: 3 },
          ],
        },
      }).equipmentDetails,
    ).toBe("Equipment skill bonuses must come from the game skill list.");
    expect(
      validateListingInput({
        ...base,
        equipmentDetails: {
          skillBonuses: [{ name: "Cooking", iconId: "skill_arms", value: 3 }],
        },
      }).equipmentDetails,
    ).toBe("Equipment skill bonuses must come from the game skill list.");
    expect(
      validateListingInput({
        ...base,
        equipmentDetails: {
          skillBonuses: [
            { name: "Arms", iconId: "skill_arms", value: 3 },
            { name: "Arms", iconId: "skill_arms", value: 2 },
          ],
        },
      }).equipmentDetails,
    ).toBe("Choose each equipment skill only once.");
    expect(
      validateListingInput({
        ...base,
        equipmentDetails: {
          skillBonuses: [{ name: "Arms", iconId: "skill_arms", value: 0 }],
        },
      }).equipmentDetails,
    ).toBe(
      "Equipment skill bonus values must be whole numbers of one or more.",
    );
  });

  it("rejects invalid equipment stats, wearer, effects, and extra lines", () => {
    const base: CreateListingInput = {
      title: "Celestial Purple Changpao",
      category: "equipment",
      price: 45_000_000,
      currency: "ducats",
      description: "",
      seller: "Niadra",
      location: "Seville",
      server: "Maris",
    };
    expect(
      validateListingInput({
        ...base,
        equipmentDetails: { attackPower: -1 },
      }).equipmentDetails,
    ).toBe("Equipment stats must be whole numbers of zero or more.");
    expect(
      validateListingInput({
        ...base,
        equipmentDetails: { durabilityCurrent: 10.5 },
      }).equipmentDetails,
    ).toBe("Equipment stats must be whole numbers of zero or more.");
    expect(
      validateListingInput({
        ...base,
        equipmentDetails: {
          wearer: "alien" as unknown as EquipmentDetails["wearer"],
        },
      }).equipmentDetails,
    ).toBe("Choose a valid wearer marker.");
    expect(
      validateListingInput({
        ...base,
        equipmentDetails: { effects: [{ name: "Land Speed Up", rank: 0 }] },
      }).equipmentDetails,
    ).toBe("Equipment Effect ranks must be whole numbers of one or more.");
    expect(
      validateListingInput({
        ...base,
        equipmentDetails: { extraLines: [{ label: "Layers", value: -1 }] },
      }).equipmentDetails,
    ).toBe("Extra line values must be whole numbers of zero or more.");
  });

  it("creates and updates a local equipment listing with stats intact", async () => {
    const repository = createLocalListingRepository([]);
    const created = await repository.create({
      title: "Celestial Purple Changpao",
      category: "equipment",
      price: 45_000_000,
      currency: "ducats",
      description: "A fine changpao with strong bonuses.",
      seller: "Niadra",
      location: "Seville",
      server: "Maris",
      equipmentDetails: testEquipmentDetails,
    });
    expect(created.equipmentDetails).toEqual(testEquipmentDetails);
    const createdEditCode = created.editCode;
    if (!createdEditCode) throw new Error("Expected a local edit code");

    const stored = await repository.get(created.id);
    expect(stored?.equipmentDetails).toEqual(testEquipmentDetails);

    const updated = await repository.update(createdEditCode, {
      title: "Celestial Purple Changpao",
      category: "equipment",
      price: 45_000_000,
      currency: "ducats",
      description: "A fine changpao with strong bonuses.",
      seller: "Niadra",
      location: "Seville",
      server: "Maris",
      equipmentDetails: {
        ...testEquipmentDetails,
        durabilityCurrent: 97,
        skillBonuses: [
          { name: "Navigation", iconId: "skill_navigation", value: 2 },
        ],
      },
    });
    expect(updated.equipmentDetails?.durabilityCurrent).toBe(97);
    expect(updated.equipmentDetails?.skillBonuses).toEqual([
      { name: "Navigation", iconId: "skill_navigation", value: 2 },
    ]);

    const blank = await repository.create({
      title: "Plain Boots",
      category: "equipment",
      price: 10_000,
      currency: "ducats",
      description: "",
      seller: "Niadra",
      location: "Seville",
      server: "Maris",
      equipmentDetails: { skillBonuses: [], effects: [], extraLines: [] },
    });
    expect(blank.equipmentDetails).toBeNull();
  });

  it("manages a local listing through its private edit code", async () => {
    const repository = createLocalListingRepository([]);
    const created = await repository.create(validInput);
    const createdEditCode = created.editCode;
    if (!createdEditCode) throw new Error("Expected a local edit code");

    expect(createdEditCode).toMatch(/^[a-f0-9]{32}$/);
    expect(await repository.findByEditCode(createdEditCode)).toMatchObject({
      id: created.id,
    });
    expect(await repository.findByEditCode("wrong-code")).toBeUndefined();

    const updated = await repository.update(createdEditCode, {
      ...validInput,
      title: "Updated Schooner",
    });
    expect(updated.title).toBe("Updated Schooner");
    expect(updated.shipDetails).toEqual(testShipDetails);

    const sold = await repository.markSold(createdEditCode);
    expect(sold.soldAt).toEqual(expect.any(String));

    const renewed = await repository.renew(createdEditCode);
    expect(new Date(renewed.expiresAt).getTime()).toBeGreaterThan(Date.now());

    await repository.delete(createdEditCode);
    expect(await repository.get(created.id)).toBeUndefined();
    await expect(repository.delete(createdEditCode)).rejects.toThrow(
      "Listing edit code not found.",
    );
  });

  it("creates and manages local offers and reports", async () => {
    const repository = createLocalListingRepository([]);
    const created = await repository.create(validInput);
    const createdEditCode = created.editCode;
    if (!createdEditCode) throw new Error("Expected a local edit code");
    const offerInput = {
      offererName: "Captain Offer",
      contact: "In-game mail",
      currency: "CT" as const,
      amount: 120,
      offerText: "Twelve Captain Tickets and a fitted cannon set.",
    };

    await repository.createOffer(created.id, offerInput);
    await expect(repository.countOffers(created.id)).resolves.toBe(1);

    const [offer] = await repository.listOffers(createdEditCode);
    expect(offer).toMatchObject({
      offererName: "Captain Offer",
      status: "pending",
    });

    await expect(
      repository.acceptOffer(createdEditCode, offer.id),
    ).resolves.toMatchObject({ status: "accepted" });
    await expect(
      repository.declineOffer(createdEditCode, offer.id),
    ).resolves.toMatchObject({ status: "declined" });

    await repository.report(created.id, {
      reporterName: "Port Observer",
      reason: "spam",
      details: "Duplicate posting.",
    });
  });

  it("manages local owner listings and offers without edit codes", async () => {
    const ownedListing: Listing = {
      ...localListingFixture(),
      id: "owned-local-frigate",
      ownerId: "player-account-1",
    };
    const legacyListing: Listing = {
      ...ownedListing,
      id: "legacy-local-frigate",
      ownerId: null,
    };
    const repository = createLocalListingRepository([
      ownedListing,
      legacyListing,
    ]);

    await expect(repository.listOwned("player-account-1")).resolves.toEqual([
      ownedListing,
    ]);

    const updated = await repository.updateOwned(
      ownedListing.id,
      "player-account-1",
      { ...validInput, title: "Updated Owner Schooner" },
    );
    expect(updated.title).toBe("Updated Owner Schooner");

    await repository.createOffer(ownedListing.id, validOfferInput);
    const [offer] = await repository.listOffersOwned(
      "player-account-1",
      ownedListing.id,
    );
    if (!offer) throw new Error("Expected an owner-path offer");

    await expect(
      repository.acceptOwnedOffer(
        "player-account-1",
        ownedListing.id,
        offer.id,
      ),
    ).resolves.toMatchObject({ status: "accepted" });
    await expect(
      repository.declineOwnedOffer(
        "player-account-1",
        ownedListing.id,
        offer.id,
      ),
    ).resolves.toMatchObject({ status: "declined" });

    await expect(
      repository.markSoldOwned(ownedListing.id, "player-account-1"),
    ).resolves.toMatchObject({ soldAt: expect.any(String) });
    await expect(
      repository.renewOwned(ownedListing.id, "player-account-1"),
    ).resolves.toMatchObject({ expiresAt: expect.any(String) });
    await repository.deleteOwned(ownedListing.id, "player-account-1");
    expect(await repository.get(ownedListing.id)).toBeUndefined();
    await expect(
      repository.updateOwned("wrong-owner", "player-account-1", validInput),
    ).rejects.toThrow("Owned listing was not found.");
  });

  it("accepts omitted and blank offer contact details without validation errors", () => {
    const omittedContact = { ...validOfferInput };
    delete omittedContact.contact;

    expect(validateOfferInput(omittedContact)).toEqual({});
    expect(validateOfferInput({ ...validOfferInput, contact: "   " })).toEqual(
      {},
    );
  });

  it("does not count contact as an invalid offer field", () => {
    const omittedContact = { ...validOfferInput };
    delete omittedContact.contact;
    const errors = validateOfferInput({
      ...omittedContact,
      offererName: " ",
      amount: null,
      offerText: "Short",
    });

    expect(Object.keys(errors)).toEqual(["offererName", "amount", "offerText"]);
    expect(errors.contact).toBeUndefined();
  });

  it("normalizes omitted and blank offer contact to an empty string locally", async () => {
    const repository = createLocalListingRepository([]);
    const created = await repository.create(validInput);
    const createdEditCode = created.editCode;
    if (!createdEditCode) throw new Error("Expected a local edit code");
    const omittedContact = { ...validOfferInput };
    delete omittedContact.contact;

    await repository.createOffer(created.id, omittedContact);
    await repository.createOffer(created.id, {
      ...validOfferInput,
      contact: "   ",
    });

    const offers = await repository.listOffers(createdEditCode);
    expect(offers.map((offer) => offer.contact)).toEqual(["", ""]);
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

  it("validates before calling create_owned_listing and returns no edit code", async () => {
    const mock = createMockSupabaseClient({
      data: dbListing,
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
    expect(created).toEqual(expectedListing);
    expect(created.editCode).toBeUndefined();

    expect(mock.requests).toHaveLength(1);
    expect(mock.requests[0]?.rpc).toMatchObject({
      functionName: "create_owned_listing",
      args: {
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
    expect(mock.requests[0]?.rpc?.args).not.toHaveProperty("edit_code");
  });

  it("sends equipment details to create_owned_listing and maps them back", async () => {
    const equipmentRow: ListingRow = {
      ...dbListing,
      id: "supabase-changpao",
      title: "Celestial Purple Changpao",
      category: "equipment",
      ship_details: null,
      equipment_details: testEquipmentDetails,
    };
    const mock = createMockSupabaseClient({
      data: equipmentRow,
      error: null,
      status: 201,
      statusText: "Created",
    });
    const repository = createSupabaseListingRepository(mock.client);

    const created = await repository.create({
      title: "Celestial Purple Changpao",
      category: "equipment",
      price: 45_000_000,
      currency: "ducats",
      description: "A fine changpao with strong bonuses.",
      seller: "Niadra",
      location: "Seville",
      server: "Maris",
      equipmentDetails: testEquipmentDetails,
    });
    expect(created.equipmentDetails).toEqual(testEquipmentDetails);
    expect(created.shipDetails).toBeNull();
    expect(mock.requests[0]?.rpc).toMatchObject({
      functionName: "create_owned_listing",
      args: {
        category: "equipment",
        ship_details: null,
        equipment_details: testEquipmentDetails,
      },
    });
  });

  it("loads and mutates only listings owned by the account", async () => {
    const mock = createMockSupabaseClient(successfulResponse([dbListing]));
    const repository = createSupabaseListingRepository(mock.client);

    await expect(repository.listOwned("player-account-1")).resolves.toEqual([
      expectedListing,
    ]);
    expect(mock.requests[0]).toMatchObject({
      table: "listings",
      filters: [{ type: "eq", column: "owner_id", value: "player-account-1" }],
    });

    mock.respond(successfulResponse(dbListing));
    await expect(
      repository.updateOwned(dbListing.id, "player-account-1", validInput),
    ).resolves.toEqual(expectedListing);
    expect(mock.requests[1]).toMatchObject({
      update: expect.objectContaining({ title: validInput.title }),
      filters: [
        { type: "eq", column: "id", value: dbListing.id },
        { type: "eq", column: "owner_id", value: "player-account-1" },
      ],
      select: "*",
      singleMode: "maybeSingle",
    });

    mock.respond(successfulResponse(dbListing));
    await expect(
      repository.markSoldOwned(dbListing.id, "player-account-1"),
    ).resolves.toEqual(expectedListing);
    expect(mock.requests[2]?.update).toMatchObject({
      sold_at: expect.any(String),
    });

    mock.respond(successfulResponse(dbListing));
    await expect(
      repository.renewOwned(dbListing.id, "player-account-1"),
    ).resolves.toEqual(expectedListing);
    expect(mock.requests[3]?.update).toMatchObject({
      expires_at: expect.any(String),
    });

    mock.respond(successfulResponse(null));
    await expect(
      repository.deleteOwned(dbListing.id, "player-account-1"),
    ).resolves.toBeUndefined();
    expect(mock.requests[4]).toMatchObject({
      table: "listings",
      isDelete: true,
      filters: [
        { type: "eq", column: "id", value: dbListing.id },
        { type: "eq", column: "owner_id", value: "player-account-1" },
      ],
    });
  });

  it("uses owner paths for listing offers", async () => {
    const listMock = createMockSupabaseClient(
      successfulResponse({ id: dbListing.id, owner_id: dbListing.owner_id }),
    );
    listMock.respondMany([successfulResponse([dbOffer])]);
    const listRepository = createSupabaseListingRepository(listMock.client);

    await expect(
      listRepository.listOffersOwned("player-account-1", dbListing.id),
    ).resolves.toEqual([
      {
        id: dbOffer.id,
        listingId: dbOffer.listing_id,
        offererName: dbOffer.offerer_name,
        contact: dbOffer.contact,
        currency: dbOffer.currency,
        amount: dbOffer.amount,
        offerText: dbOffer.offer_text,
        status: dbOffer.status,
        createdAt: dbOffer.created_at,
      },
    ]);
    expect(listMock.requests[0]).toMatchObject({
      table: "listings",
      filters: [
        { type: "eq", column: "id", value: dbListing.id },
        { type: "eq", column: "owner_id", value: "player-account-1" },
      ],
    });
    expect(listMock.requests[1]).toMatchObject({
      table: "offers",
      filters: [{ type: "eq", column: "listing_id", value: dbListing.id }],
    });

    const acceptMock = createMockSupabaseClient(
      successfulResponse({ id: dbListing.id, owner_id: dbListing.owner_id }),
    );
    acceptMock.respondMany([
      successfulResponse({ ...dbOffer, status: "accepted" }),
    ]);
    const acceptRepository = createSupabaseListingRepository(acceptMock.client);
    await expect(
      acceptRepository.acceptOwnedOffer(
        "player-account-1",
        dbListing.id,
        dbOffer.id,
      ),
    ).resolves.toMatchObject({ status: "accepted" });
    expect(acceptMock.requests[1]).toMatchObject({
      table: "offers",
      update: { status: "accepted" },
      filters: [
        { type: "eq", column: "id", value: dbOffer.id },
        { type: "eq", column: "listing_id", value: dbListing.id },
      ],
    });
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

  it("normalizes omitted and blank offer contact to an empty string for Supabase", async () => {
    const mock = createMockSupabaseClient({
      data: null,
      error: null,
      status: 201,
      statusText: "Created",
    });
    const repository = createSupabaseListingRepository(mock.client);
    const omittedContact = { ...validOfferInput };
    delete omittedContact.contact;

    await repository.createOffer("supabase-frigate", omittedContact);
    await repository.createOffer("supabase-frigate", {
      ...validOfferInput,
      contact: "   ",
    });

    expect(mock.requests.map((request) => request.insert?.contact)).toEqual([
      "",
      "",
    ]);
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
