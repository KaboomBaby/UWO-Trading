import type {
  GuildStorefront,
  ShopItem,
  WatchlistItem,
  WishlistItem,
} from "../types/commerce";

export const mockWishlist: WishlistItem[] = [
  {
    id: "wish-frigate",
    itemName: "Adventurer Frigate",
    category: "Ships",
    targetPrice: 45_000_000,
    note: "Buy below the Port Royal average.",
    imageEmoji: "🚢",
  },
  {
    id: "wish-culverin",
    itemName: "Master Culverin Bank",
    category: "Equipment",
    targetPrice: 11_500_000,
    note: "Wait for the Genoa refit discount.",
    imageEmoji: "💣",
  },
];

export const mockWatchlist: WatchlistItem[] = [
  {
    id: "watch-pepper",
    itemName: "Pepper",
    port: "Lisbon",
    currentPrice: 4_250,
    changePercent: 6.4,
    note: "Export window is open.",
  },
  {
    id: "watch-townhouse",
    itemName: "Seville Townhouse",
    port: "Seville",
    currentPrice: 125_000_000,
    changePercent: -4.1,
    note: "Watch for a correction.",
  },
];

export const mockGuildStorefronts: GuildStorefront[] = [
  {
    id: "blue-wave-traders",
    guildName: "Blue Wave Traders",
    motto: "Reliable routes, disciplined convoys.",
    homePort: "London",
    specialties: ["Convoy escorts", "European textiles", "Insurance"],
    rating: 4.8,
    completedOrders: 1284,
    imageEmoji: "🌊",
  },
  {
    id: "golden-compass-league",
    guildName: "Golden Compass League",
    motto: "Navigation first, profit follows.",
    homePort: "Lisbon",
    specialties: ["Expeditions", "Instruments", "Training"],
    rating: 4.6,
    completedOrders: 942,
    imageEmoji: "🧭",
  },
];

export const mockShopItems: ShopItem[] = [
  {
    id: "shop-frigate",
    name: "Expedition Frigate",
    category: "ships",
    price: 46_500_000,
    stock: 2,
    seller: "Amsterdam Shipyard",
    description: "A balanced expedition vessel ready for long routes.",
    imageEmoji: "⛵",
  },
  {
    id: "shop-compass",
    name: "Mariner's Compass",
    category: "equipment",
    price: 1_250_000,
    stock: 12,
    seller: "Lisbon Instruments",
    description: "Reliable navigation for open-water voyages.",
    imageEmoji: "🧭",
  },
  {
    id: "shop-repair-kit",
    name: "Hull Repair Kit",
    category: "supplies",
    price: 280_000,
    stock: 48,
    seller: "Port Royal Chandler",
    description: "Emergency hull materials for hostile routes.",
    imageEmoji: "🧰",
  },
  {
    id: "shop-dock-office",
    name: "Dock Office Lease",
    category: "property",
    price: 72_000_000,
    stock: 1,
    seller: "Seville Harbor Authority",
    description: "A leased office beside the commercial docks.",
    imageEmoji: "🏛️",
  },
];
