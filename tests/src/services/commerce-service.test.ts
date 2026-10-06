import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { createSupabaseCommerceRepository } from "../../../src/services/commerce-service";

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
      if (requestedTable !== table) {
        throw new Error(`Unexpected table: ${requestedTable}`);
      }
      return query;
    }),
  } as unknown as SupabaseClient;
}

describe("Supabase commerce repository", () => {
  it("maps wishlist and watchlist rows", async () => {
    const wishlistQuery = createReadQuery([
      {
        id: "wish-frigate",
        item_name: "Adventurer Frigate",
        category: "Ships",
        target_price: 45_000_000,
        note: "Buy below the average.",
        image_emoji: "🚢",
      },
    ]);
    const watchlistQuery = createReadQuery([
      {
        id: "watch-pepper",
        item_name: "Pepper",
        port: "Lisbon",
        current_price: 4_250,
        change_percent: 6.4,
        note: "Export window is open.",
      },
    ]);
    const repository = createSupabaseCommerceRepository({
      from: vi.fn((table: string) =>
        table === "wishlist_items"
          ? wishlistQuery
          : table === "watchlist_items"
            ? watchlistQuery
            : (() => {
                throw new Error(`Unexpected table: ${table}`);
              })(),
      ),
    } as unknown as SupabaseClient);

    expect(await repository.listWishlist()).toEqual([
      {
        id: "wish-frigate",
        itemName: "Adventurer Frigate",
        category: "Ships",
        targetPrice: 45_000_000,
        note: "Buy below the average.",
        imageEmoji: "🚢",
      },
    ]);
    expect(await repository.listWatchlist()).toEqual([
      {
        id: "watch-pepper",
        itemName: "Pepper",
        port: "Lisbon",
        currentPrice: 4_250,
        changePercent: 6.4,
        note: "Export window is open.",
      },
    ]);
  });

  it("searches guild storefront fields and copies nested specialties", async () => {
    const query = createReadQuery([
      {
        id: "blue-wave-traders",
        guild_name: "Blue Wave Traders",
        motto: "Reliable routes, disciplined convoys.",
        home_port: "London",
        specialties: ["Convoy escorts", "Insurance"],
        rating: 4.8,
        completed_orders: 1_284,
        image_emoji: "🌊",
      },
      {
        id: "golden-compass-league",
        guild_name: "Golden Compass League",
        motto: "Navigation first, profit follows.",
        home_port: "Lisbon",
        specialties: ["Expeditions"],
        rating: 4.6,
        completed_orders: 942,
        image_emoji: "🧭",
      },
    ]);
    const repository = createSupabaseCommerceRepository(
      createClient("guild_storefronts", query),
    );

    const [guild] = await repository.listGuildStorefronts("convoy escorts");
    expect(guild).toEqual({
      id: "blue-wave-traders",
      guildName: "Blue Wave Traders",
      motto: "Reliable routes, disciplined convoys.",
      homePort: "London",
      specialties: ["Convoy escorts", "Insurance"],
      rating: 4.8,
      completedOrders: 1_284,
      imageEmoji: "🌊",
    });

    guild.specialties.push("Mutated specialty");
    expect(
      (await repository.listGuildStorefronts("blue wave"))[0].specialties,
    ).toEqual(["Convoy escorts", "Insurance"]);
  });

  it("filters and maps shop items", async () => {
    const query = createReadQuery([
      {
        id: "shop-compass",
        name: "Mariner's Compass",
        category: "equipment",
        price: 1_250_000,
        stock: 12,
        seller: "Lisbon Instruments",
        description: "Reliable navigation.",
        image_emoji: "🧭",
      },
      {
        id: "shop-repair-kit",
        name: "Hull Repair Kit",
        category: "supplies",
        price: 280_000,
        stock: 48,
        seller: "Port Royal Chandler",
        description: "Emergency hull materials.",
        image_emoji: "🧰",
      },
    ]);
    const repository = createSupabaseCommerceRepository(
      createClient("shop_items", query),
    );

    expect(
      await repository.listShopItems({
        category: "equipment",
        search: "lisbon",
      }),
    ).toEqual([
      {
        id: "shop-compass",
        name: "Mariner's Compass",
        category: "equipment",
        price: 1_250_000,
        stock: 12,
        seller: "Lisbon Instruments",
        description: "Reliable navigation.",
        imageEmoji: "🧭",
      },
    ]);
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.eq).toHaveBeenCalledWith("category", "equipment");
  });
});
