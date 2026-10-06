import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  createLocalMarketRepository,
  createSupabaseMarketRepository,
  normalizeComponentCategory,
  normalizePortRegion,
} from "../../../src/services/market-service";

function createReadQuery(rows: unknown[]) {
  const response = Promise.resolve({ data: rows, error: null });
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    then: (
      onFulfilled:
        ((value: { data: unknown[]; error: null }) => unknown) | null,
      onRejected: ((reason: unknown) => unknown) | null,
    ) => response.then(onFulfilled, onRejected),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(response);

  return query;
}

function createClient(
  table: string,
  query: ReturnType<typeof createReadQuery>,
) {
  return {
    from: vi.fn((requestedTable: string) => {
      if (requestedTable !== table)
        throw new Error(`Unexpected table: ${requestedTable}`);
      return query;
    }),
  } as unknown as SupabaseClient;
}

describe("local market repository", () => {
  it("filters ports by search and region", async () => {
    const repository = createLocalMarketRepository();

    expect(await repository.listPorts({ search: "spice" })).toMatchObject([
      { id: "lisbon" },
      { id: "alexandria" },
    ]);
    expect(await repository.listPorts({ region: "Caribbean" })).toMatchObject([
      { id: "port-royal" },
    ]);
  });

  it("filters components by search and category", async () => {
    const repository = createLocalMarketRepository();

    expect(
      await repository.listComponents({ search: "compass" }),
    ).toMatchObject([{ id: "astrological-compass" }]);
    expect(
      await repository.listComponents({ category: "rigging" }),
    ).toMatchObject([{ id: "reinforced-mainmast" }]);
  });

  it("normalizes invalid filter values to all", () => {
    expect(normalizePortRegion("Not a region")).toBe("all");
    expect(normalizeComponentCategory("Not a category")).toBe("all");
  });

  it("returns copies of nested mock arrays", async () => {
    const repository = createLocalMarketRepository();
    const [port] = await repository.listPorts({ search: "amsterdam" });
    const [component] = await repository.listComponents({
      search: "mainmast",
    });

    port?.specialties.push("Mutated specialty");
    component?.compatibleWith.push("Mutated ship");

    const [freshPort] = await repository.listPorts({ search: "amsterdam" });
    const [freshComponent] = await repository.listComponents({
      search: "mainmast",
    });
    expect(freshPort?.specialties).not.toContain("Mutated specialty");
    expect(freshComponent?.compatibleWith).not.toContain("Mutated ship");
  });
});

describe("Supabase market repository", () => {
  it("filters and maps market ports", async () => {
    const query = createReadQuery([
      {
        id: "port-royal",
        name: "Port Royal",
        country: "Jamaica",
        region: "Caribbean",
        specialties: ["Rum", "Sugar"],
        description: "A busy Caribbean port.",
        image_emoji: "🏴‍☠️",
        docking_capacity: 120,
        danger_level: "high",
      },
      {
        id: "amsterdam",
        name: "Amsterdam",
        country: "Netherlands",
        region: "Northern Europe",
        specialties: ["Textiles"],
        description: "A northern commercial hub.",
        image_emoji: "🏛️",
        docking_capacity: 180,
        danger_level: "low",
      },
    ]);
    const repository = createSupabaseMarketRepository(
      createClient("market_ports", query),
    );

    expect(
      await repository.listPorts({ region: "Caribbean", search: "sugar" }),
    ).toEqual([
      {
        id: "port-royal",
        name: "Port Royal",
        country: "Jamaica",
        region: "Caribbean",
        specialties: ["Rum", "Sugar"],
        description: "A busy Caribbean port.",
        imageEmoji: "🏴‍☠️",
        dockingCapacity: 120,
        dangerLevel: "high",
      },
    ]);
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.eq).toHaveBeenCalledWith("region", "Caribbean");
  });

  it("filters and maps components", async () => {
    const query = createReadQuery([
      {
        id: "reinforced-mainmast",
        name: "Reinforced Mainmast",
        category: "rigging",
        rarity: "rare",
        price: 4_800_000,
        description: "A strengthened mainmast.",
        compatible_with: ["Frigates", "Galleons"],
        image_emoji: "⛵",
        in_stock: true,
      },
      {
        id: "astrological-compass",
        name: "Astrological Compass",
        category: "navigation",
        rarity: "legendary",
        price: 28_400_000,
        description: "A precision compass.",
        compatible_with: ["All ships"],
        image_emoji: "🧭",
        in_stock: false,
      },
    ]);
    const repository = createSupabaseMarketRepository(
      createClient("components", query),
    );

    expect(
      await repository.listComponents({
        category: "rigging",
        search: "galleon",
      }),
    ).toEqual([
      {
        id: "reinforced-mainmast",
        name: "Reinforced Mainmast",
        category: "rigging",
        rarity: "rare",
        price: 4_800_000,
        description: "A strengthened mainmast.",
        compatibleWith: ["Frigates", "Galleons"],
        imageEmoji: "⛵",
        inStock: true,
      },
    ]);
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.eq).toHaveBeenCalledWith("category", "rigging");
  });
});
