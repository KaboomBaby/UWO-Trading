import {
  mockLeaderboardEntries,
  mockMarketPrices,
  mockPriceAlerts,
} from "../data/mock-trading";
import type {
  CreatePriceAlertInput,
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardQuery,
  MarketPrice,
  MarketPriceQuery,
  PriceAlert,
  PriceAlertQuery,
  PriceCategory,
} from "../types/trading";
import { PRICE_CATEGORIES } from "../types/trading";

export interface TradingRepository {
  listPrices(query?: MarketPriceQuery): Promise<MarketPrice[]>;
  listAlerts(query?: PriceAlertQuery): Promise<PriceAlert[]>;
  createAlert(input: CreatePriceAlertInput): Promise<PriceAlert>;
  setAlertStatus(id: string, status: PriceAlert["status"]): Promise<PriceAlert>;
  listLeaderboard(query?: LeaderboardQuery): Promise<LeaderboardEntry[]>;
}

export function normalizePriceCategory(
  value: string | null,
): PriceCategory | "all" {
  return PRICE_CATEGORIES.includes(value as PriceCategory)
    ? (value as PriceCategory)
    : "all";
}

export function normalizeLeaderboardMetric(
  value: string | null,
): LeaderboardMetric {
  return value === "volume" || value === "trades" ? value : "profit";
}

function matches(parts: string[], search?: string) {
  if (!search?.trim()) return true;
  return parts.join(" ").toLowerCase().includes(search.trim().toLowerCase());
}

export function createLocalTradingRepository(): TradingRepository {
  const alerts = [...mockPriceAlerts];
  let alertSequence = 0;

  return {
    async listPrices(query: MarketPriceQuery = {}) {
      const category = query.category ?? "all";
      return mockMarketPrices
        .filter((price) => category === "all" || price.category === category)
        .filter((price) =>
          matches([price.itemName, price.port, price.category], query.search),
        )
        .map((price) => ({ ...price }));
    },

    async listAlerts(query: PriceAlertQuery = {}) {
      const status = query.status ?? "all";
      return alerts
        .filter((alert) => status === "all" || alert.status === status)
        .map((alert) => ({ ...alert }));
    },

    async createAlert(input: CreatePriceAlertInput) {
      if (input.itemName.trim().length < 2)
        throw new Error("Item name must be at least 2 characters.");
      if (!Number.isFinite(input.targetPrice) || input.targetPrice <= 0)
        throw new Error("Target price must be greater than zero.");

      const alert: PriceAlert = {
        id: `alert-${Date.now()}-${++alertSequence}`,
        itemName: input.itemName.trim(),
        targetPrice: input.targetPrice,
        direction: input.direction,
        status: "active",
        note: input.note.trim(),
        createdAt: new Date().toISOString(),
      };
      alerts.unshift(alert);
      return { ...alert };
    },

    async setAlertStatus(id: string, status: PriceAlert["status"]) {
      const index = alerts.findIndex((alert) => alert.id === id);
      if (index === -1) throw new Error("Price alert not found.");
      alerts[index] = { ...alerts[index], status };
      return { ...alerts[index] };
    },

    async listLeaderboard(query: LeaderboardQuery = {}) {
      const metric = query.metric ?? "profit";
      return mockLeaderboardEntries
        .filter((entry) => matches([entry.trader, entry.port], query.search))
        .sort((a, b) => b[metric] - a[metric])
        .map((entry) => ({ ...entry }));
    },
  };
}
