export const PRICE_CATEGORIES = [
  "commodities",
  "equipment",
  "ships",
  "property",
] as const;

export type PriceCategory = (typeof PRICE_CATEGORIES)[number];
export type PriceTrend = "rising" | "falling" | "stable";

export type MarketPrice = {
  id: string;
  itemName: string;
  category: PriceCategory;
  port: string;
  price: number;
  changePercent: number;
  trend: PriceTrend;
  updatedAt: string;
};

export type PriceAlertDirection = "above" | "below";
export type PriceAlertStatus = "active" | "paused" | "triggered";

export type PriceAlert = {
  id: string;
  itemName: string;
  targetPrice: number;
  direction: PriceAlertDirection;
  status: PriceAlertStatus;
  note: string;
  createdAt: string;
};

export type CreatePriceAlertInput = {
  itemName: string;
  targetPrice: number;
  direction: PriceAlertDirection;
  note: string;
};

export type PriceAlertQuery = {
  status?: PriceAlertStatus | "all";
};

export type LeaderboardMetric = "profit" | "volume" | "trades";

export type LeaderboardEntry = {
  id: string;
  trader: string;
  port: string;
  profit: number;
  volume: number;
  trades: number;
};

export type LeaderboardQuery = {
  metric?: LeaderboardMetric;
  search?: string;
};

export type MarketPriceQuery = {
  category?: PriceCategory | "all";
  search?: string;
};
