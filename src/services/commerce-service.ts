import type { SupabaseClient } from "@supabase/supabase-js";

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

type WishlistItemRow = {
  id: string;
  item_name: string;
  category: string;
  target_price: number;
  note: string;
  image_emoji: string;
};

type WatchlistItemRow = {
  id: string;
  item_name: string;
  port: string;
  current_price: number;
  change_percent: number;
  note: string;
};

type GuildStorefrontRow = {
  id: string;
  guild_name: string;
  motto: string;
  home_port: string;
  specialties: string[];
  rating: number;
  completed_orders: number;
  image_emoji: string;
};

type ShopItemRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  seller: string;
  description: string;
  image_emoji: string;
};

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

function toWishlistItem(row: WishlistItemRow): WishlistItem {
  return {
    id: row.id,
    itemName: row.item_name,
    category: row.category,
    targetPrice: row.target_price,
    note: row.note,
    imageEmoji: row.image_emoji,
  };
}

function toWatchlistItem(row: WatchlistItemRow): WatchlistItem {
  return {
    id: row.id,
    itemName: row.item_name,
    port: row.port,
    currentPrice: row.current_price,
    changePercent: row.change_percent,
    note: row.note,
  };
}

function toGuildStorefront(row: GuildStorefrontRow): GuildStorefront {
  return {
    id: row.id,
    guildName: row.guild_name,
    motto: row.motto,
    homePort: row.home_port,
    specialties: [...row.specialties],
    rating: row.rating,
    completedOrders: row.completed_orders,
    imageEmoji: row.image_emoji,
  };
}

function toShopItem(row: ShopItemRow): ShopItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ShopItem["category"],
    price: row.price,
    stock: row.stock,
    seller: row.seller,
    description: row.description,
    imageEmoji: row.image_emoji,
  };
}

function readRows<T>(
  result: { data: T[] | null; error: { message: string } | null },
  unableToLoadMessage: string,
): T[] {
  if (result.error) {
    throw new Error(`${unableToLoadMessage}: ${result.error.message}`);
  }
  return result.data ?? [];
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

export function createSupabaseCommerceRepository(
  client: SupabaseClient,
): CommerceRepository {
  return {
    async listWishlist() {
      const rows = readRows(
        await client.from("wishlist_items").select("*"),
        "Unable to load wishlist items",
      ) as WishlistItemRow[];
      return rows.map(toWishlistItem);
    },

    async listWatchlist() {
      const rows = readRows(
        await client.from("watchlist_items").select("*"),
        "Unable to load watchlist items",
      ) as WatchlistItemRow[];
      return rows.map(toWatchlistItem);
    },

    async listGuildStorefronts(search?: string) {
      const rows = readRows(
        await client.from("guild_storefronts").select("*"),
        "Unable to load guild storefronts",
      ) as GuildStorefrontRow[];
      return rows
        .map(toGuildStorefront)
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
        );
    },

    async listShopItems(query: ShopQuery = {}) {
      let request = client.from("shop_items").select("*");
      if (query.category && query.category !== "all") {
        request = request.eq("category", query.category);
      }

      const rows = readRows(
        await request,
        "Unable to load shop items",
      ) as ShopItemRow[];
      const category = query.category ?? "all";
      return rows
        .map(toShopItem)
        .filter((item) => category === "all" || item.category === category)
        .filter((item) =>
          matches([item.name, item.seller, item.description], query.search),
        );
    },
  };
}
