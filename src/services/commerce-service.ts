import {
  mockGuildStorefronts,
  mockShopItems,
  mockWatchlist,
  mockWishlist,
} from "../data/mock-commerce";
import type {
  GuildStorefront,
  ShopCategory,
  ShopItem,
  ShopQuery,
  WatchlistItem,
  WishlistItem,
} from "../types/commerce";
import { SHOP_CATEGORIES } from "../types/commerce";

export interface CommerceRepository {
  listWishlist(): Promise<WishlistItem[]>;
  listWatchlist(): Promise<WatchlistItem[]>;
  listGuildStorefronts(search?: string): Promise<GuildStorefront[]>;
  listShopItems(query?: ShopQuery): Promise<ShopItem[]>;
}

export function normalizeShopCategory(
  value: string | null,
): ShopCategory | "all" {
  return SHOP_CATEGORIES.includes(value as ShopCategory)
    ? (value as ShopCategory)
    : "all";
}

function matches(parts: string[], value?: string) {
  if (!value?.trim()) return true;
  return parts.join(" ").toLowerCase().includes(value.trim().toLowerCase());
}

export function createLocalCommerceRepository(): CommerceRepository {
  return {
    async listWishlist() {
      return mockWishlist.map((item) => ({ ...item }));
    },
    async listWatchlist() {
      return mockWatchlist.map((item) => ({ ...item }));
    },
    async listGuildStorefronts(search?: string) {
      return mockGuildStorefronts
        .filter((guild) =>
          matches(
            [
              guild.guildName,
              guild.motto,
              guild.homePort,
              ...guild.specialties,
            ],
            search,
          ),
        )
        .map((guild) => ({ ...guild, specialties: [...guild.specialties] }));
    },
    async listShopItems(query: ShopQuery = {}) {
      const category = query.category ?? "all";
      return mockShopItems
        .filter((item) => category === "all" || item.category === category)
        .filter((item) =>
          matches([item.name, item.seller, item.description], query.search),
        )
        .map((item) => ({ ...item }));
    },
  };
}
