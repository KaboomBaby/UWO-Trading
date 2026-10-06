import type { SupabaseClient } from "@supabase/supabase-js";

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

type MarketPriceRow = {
  id: string;
  item_name: string;
  category: string;
  port: string;
  price: number;
  change_percent: number;
  trend: string;
  updated_at: string;
};

type PriceAlertRow = {
  id: string;
  item_name: string;
  target_price: number;
  direction: string;
  status: string;
  note: string;
  created_at: string;
};

type LeaderboardEntryRow = {
  id: string;
  trader: string;
  port: string;
  profit: number;
  volume: number;
  trades: number;
};

type RepositoryResult<T> = {
  data: T | null;
  error: { code?: string; message: string } | null;
};

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

function toMarketPrice(row: MarketPriceRow): MarketPrice {
  return {
    id: row.id,
    itemName: row.item_name,
    category: row.category as MarketPrice["category"],
    port: row.port,
    price: row.price,
    changePercent: row.change_percent,
    trend: row.trend as MarketPrice["trend"],
    updatedAt: row.updated_at,
  };
}

function toPriceAlert(row: PriceAlertRow): PriceAlert {
  return {
    id: row.id,
    itemName: row.item_name,
    targetPrice: row.target_price,
    direction: row.direction as PriceAlert["direction"],
    status: row.status as PriceAlert["status"],
    note: row.note,
    createdAt: row.created_at,
  };
}

function toLeaderboardEntry(row: LeaderboardEntryRow): LeaderboardEntry {
  return {
    id: row.id,
    trader: row.trader,
    port: row.port,
    profit: row.profit,
    volume: row.volume,
    trades: row.trades,
  };
}

function readRows<T>(
  result: RepositoryResult<T[]>,
  unableToLoadMessage: string,
): T[] {
  if (result.error) {
    throw new Error(`${unableToLoadMessage}: ${result.error.message}`);
  }
  return result.data ?? [];
}

function readRequiredRow<T>(
  result: RepositoryResult<T>,
  unableToPerformMessage: string,
  missingMessage: string,
): T {
  if (!result.data) {
    if (!result.error || result.error.code === "PGRST116") {
      throw new Error(missingMessage);
    }
    throw new Error(`${unableToPerformMessage}: ${result.error.message}`);
  }
  if (result.error) {
    throw new Error(`${unableToPerformMessage}: ${result.error.message}`);
  }
  return result.data;
}

function validateAlertInput(input: CreatePriceAlertInput) {
  if (input.itemName.trim().length < 2)
    throw new Error("Item name must be at least 2 characters.");
  if (!Number.isFinite(input.targetPrice) || input.targetPrice <= 0)
    throw new Error("Target price must be greater than zero.");
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
      validateAlertInput(input);

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

export function createSupabaseTradingRepository(
  client: SupabaseClient,
): TradingRepository {
  return {
    async listPrices(query: MarketPriceQuery = {}) {
      let request = client.from("market_prices").select("*");
      if (query.category && query.category !== "all") {
        request = request.eq("category", query.category);
      }

      const rows = readRows(
        await request,
        "Unable to load market prices",
      ) as MarketPriceRow[];
      const category = query.category ?? "all";
      return rows
        .map(toMarketPrice)
        .filter((price) => category === "all" || price.category === category)
        .filter((price) =>
          matches([price.itemName, price.port, price.category], query.search),
        );
    },

    async listAlerts(query: PriceAlertQuery = {}) {
      let request = client.from("price_alerts").select("*");
      if (query.status && query.status !== "all") {
        request = request.eq("status", query.status);
      }

      const rows = readRows(
        await request,
        "Unable to load price alerts",
      ) as PriceAlertRow[];
      const status = query.status ?? "all";
      return rows
        .map(toPriceAlert)
        .filter((alert) => status === "all" || alert.status === status);
    },

    async createAlert(input: CreatePriceAlertInput) {
      validateAlertInput(input);

      const row = readRequiredRow(
        await client
          .from("price_alerts")
          .insert({
            item_name: input.itemName.trim(),
            target_price: input.targetPrice,
            direction: input.direction,
            note: input.note.trim(),
          })
          .select("*")
          .single(),
        "Unable to create price alert",
        "Price alert could not be created.",
      ) as PriceAlertRow;
      return toPriceAlert(row);
    },

    async setAlertStatus(id: string, status: PriceAlert["status"]) {
      const row = readRequiredRow(
        await client
          .from("price_alerts")
          .update({ status })
          .eq("id", id)
          .select("*")
          .single(),
        "Unable to update price alert",
        "Price alert not found.",
      ) as PriceAlertRow;
      return toPriceAlert(row);
    },

    async listLeaderboard(query: LeaderboardQuery = {}) {
      const metric = query.metric ?? "profit";
      const rows = readRows(
        await client
          .from("leaderboard_entries")
          .select("*")
          .order(metric, { ascending: false }),
        "Unable to load leaderboard entries",
      ) as LeaderboardEntryRow[];
      return rows
        .map(toLeaderboardEntry)
        .filter((entry) => matches([entry.trader, entry.port], query.search));
    },
  };
}
