export const PORT_REGIONS = [
  "Northern Europe",
  "Southern Europe",
  "Caribbean",
  "Africa",
  "Asia",
] as const;

export type PortRegion = (typeof PORT_REGIONS)[number];

export type MarketPort = {
  id: string;
  name: string;
  country: string;
  region: PortRegion;
  specialties: string[];
  description: string;
  imageEmoji: string;
  dockingCapacity: number;
  dangerLevel: "low" | "moderate" | "high";
};

export const COMPONENT_CATEGORIES = [
  "rigging",
  "armament",
  "navigation",
  "armor",
  "cargo",
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

export type ComponentItem = {
  id: string;
  name: string;
  category: ComponentCategory;
  rarity: "common" | "rare" | "epic" | "legendary";
  price: number;
  description: string;
  compatibleWith: string[];
  imageEmoji: string;
  inStock: boolean;
};

export type PortQuery = {
  search?: string;
  region?: PortRegion | "all";
};

export type ComponentQuery = {
  search?: string;
  category?: ComponentCategory | "all";
};
