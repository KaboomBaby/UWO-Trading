import { describe, expect, it } from "vitest";

import {
  createLocalListingRepository,
  ListingValidationError,
  validateListingInput,
} from "../../../src/services/listing-service";
import type { CreateListingInput } from "../../../src/types/listing";

const validInput: CreateListingInput = {
  title: "Trading Schooner",
  category: "ships",
  price: 32_000_000,
  description: "A swift schooner suitable for regional trade routes.",
  seller: "AmsterdamShipyard",
  location: "Amsterdam",
};

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
    const prices = listings.map((listing) => listing.price);
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
