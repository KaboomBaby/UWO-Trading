export type WishlistItem = {
  id: string;
  itemName: string;
  category: string;
  targetPrice: number;
  note: string;
  imageEmoji: string;
};

export type WatchlistItem = {
  id: string;
  itemName: string;
  port: string;
  currentPrice: number;
  changePercent: number;
  note: string;
};

export type GuildStorefront = {
  id: string;
  guildName: string;
  motto: string;
  homePort: string;
  specialties: string[];
  rating: number;
  completedOrders: number;
  imageEmoji: string;
};

export const SHOP_CATEGORIES = [
  "ships",
  "equipment",
  "supplies",
  "property",
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

export type ShopItem = {
  id: string;
  name: string;
  category: ShopCategory;
  price: number;
  stock: number;
  seller: string;
  description: string;
  imageEmoji: string;
};

export type ShopQuery = {
  category?: ShopCategory | "all";
  search?: string;
};
