import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  createLocalTradingRepository,
  createSupabaseTradingRepository,
} from "../../../src/services/trading-service";

function createReadQuery(rows: unknown[]) {
  const response = Promise.resolve({ data: rows, error: null });
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    then: (
      onFulfilled:
        ((value: { data: unknown[]; error: null }) => unknown) | null,
      onRejected: ((reason: unknown) => unknown) | null,
    ) => response.then(onFulfilled, onRejected),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(response);
  query.order.mockReturnValue(response);

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

function createWriteClient(
  table: string,
  response: { data: unknown; error: unknown },
) {
  const chain = {
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.single.mockResolvedValue(response);

  const client = {
    from: vi.fn((requestedTable: string) => {
      if (requestedTable !== table)
        throw new Error(`Unexpected table: ${requestedTable}`);
      return chain;
    }),
  };
  return { client, chain };
}

describe("local trading repository", () => {
  it("filters market prices", async () => {
    const repository = createLocalTradingRepository();
    expect(await repository.listPrices({ category: "ships" })).toMatchObject([
      { id: "adventurer-frigate-port-royal" },
    ]);
    expect(await repository.listPrices({ search: "pepper" })).toMatchObject([
      { id: "pepper-lisbon" },
    ]);
  });

  it("creates and updates local alerts", async () => {
    const repository = createLocalTradingRepository();
    const alert = await repository.createAlert({
      itemName: "Silk",
      targetPrice: 8_000,
      direction: "above",
      note: "Sell at the Asian export peak.",
    });

    expect(await repository.listAlerts({ status: "active" })).toHaveLength(2);
    expect(await repository.setAlertStatus(alert.id, "paused")).toMatchObject({
      status: "paused",
    });
  });

  it("sorts leaderboard entries by the selected metric", async () => {
    const repository = createLocalTradingRepository();
    expect(
      (await repository.listLeaderboard({ metric: "volume" }))[0],
    ).toMatchObject({ id: "amsterdam-jan" });
    expect(
      (await repository.listLeaderboard({ metric: "trades" }))[0],
    ).toMatchObject({ id: "port-royal-marta" });
  });
});

describe("Supabase trading repository", () => {
  it("filters, maps, and searches market prices", async () => {
    const query = createReadQuery([
      {
        id: "adventurer-frigate-port-royal",
        item_name: "Adventurer Frigate",
        category: "ships",
        port: "Port Royal",
        price: 48_000_000,
        change_percent: 0,
        trend: "stable",
        updated_at: "2026-10-04T23:40:00Z",
      },
      {
        id: "caravel-genoa",
        item_name: "Trading Caravel",
        category: "ships",
        port: "Genoa",
        price: 12_000_000,
        change_percent: 1.2,
        trend: "rising",
        updated_at: "2026-10-05T00:40:00Z",
      },
    ]);
    const repository = createSupabaseTradingRepository(
      createClient("market_prices", query),
    );

    expect(
      await repository.listPrices({ category: "ships", search: "port royal" }),
    ).toEqual([
      {
        id: "adventurer-frigate-port-royal",
        itemName: "Adventurer Frigate",
        category: "ships",
        port: "Port Royal",
        price: 48_000_000,
        changePercent: 0,
        trend: "stable",
        updatedAt: "2026-10-04T23:40:00Z",
      },
    ]);
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.eq).toHaveBeenCalledWith("category", "ships");
  });

  it("creates price alerts with snake_case writes and camelCase results", async () => {
    const input = {
      itemName: "  Silk  ",
      targetPrice: 8_000,
      direction: "above" as const,
      note: " Sell at the peak. ",
    };
    const { client, chain } = createWriteClient("price_alerts", {
      data: {
        id: "67087510-74e8-4d15-a68c-a12a68e40b41",
        item_name: "Silk",
        target_price: 8_000,
        direction: "above",
        status: "active",
        note: "Sell at the peak.",
        created_at: "2026-10-05T02:12:00Z",
      },
      error: null,
    });
    const repository = createSupabaseTradingRepository(
      client as unknown as SupabaseClient,
    );

    expect(await repository.createAlert(input)).toEqual({
      id: "67087510-74e8-4d15-a68c-a12a68e40b41",
      itemName: "Silk",
      targetPrice: 8_000,
      direction: "above",
      status: "active",
      note: "Sell at the peak.",
      createdAt: "2026-10-05T02:12:00Z",
    });
    expect(chain.insert).toHaveBeenCalledWith({
      item_name: "Silk",
      target_price: 8_000,
      direction: "above",
      note: "Sell at the peak.",
    });
    expect(chain.select).toHaveBeenCalledWith("*");
  });

  it("updates alert status and preserves local missing-row semantics", async () => {
    const { client, chain } = createWriteClient("price_alerts", {
      data: {
        id: "alert-1",
        item_name: "Silk",
        target_price: 8_000,
        direction: "above",
        status: "paused",
        note: "",
        created_at: "2026-10-05T02:12:00Z",
      },
      error: null,
    });
    const repository = createSupabaseTradingRepository(
      client as unknown as SupabaseClient,
    );

    expect(await repository.setAlertStatus("alert-1", "paused")).toMatchObject({
      id: "alert-1",
      status: "paused",
    });
    expect(chain.update).toHaveBeenCalledWith({ status: "paused" });
    expect(chain.eq).toHaveBeenCalledWith("id", "alert-1");

    const missing = createWriteClient("price_alerts", {
      data: null,
      error: null,
    });
    await expect(
      createSupabaseTradingRepository(
        missing.client as unknown as SupabaseClient,
      ).setAlertStatus("missing", "paused"),
    ).rejects.toThrow("Price alert not found.");
  });

  it("orders the leaderboard by the requested metric and searches traders", async () => {
    const query = createReadQuery([
      {
        id: "port-royal-marta",
        trader: "Port Royal Marta",
        port: "Port Royal",
        profit: 731_000_000,
        volume: 1_860_000_000,
        trades: 502,
      },
      {
        id: "amsterdam-jan",
        trader: "Amsterdam Jan",
        port: "Amsterdam",
        profit: 614_000_000,
        volume: 2_520_000_000,
        trades: 367,
      },
    ]);
    const repository = createSupabaseTradingRepository(
      createClient("leaderboard_entries", query),
    );

    expect(
      await repository.listLeaderboard({ metric: "trades", search: "marta" }),
    ).toMatchObject([{ id: "port-royal-marta", trades: 502 }]);
    expect(query.order).toHaveBeenCalledWith("trades", { ascending: false });
  });
});
