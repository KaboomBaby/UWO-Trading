import { describe, expect, it } from "vitest";

import { createLocalTradingRepository } from "../../../src/services/trading-service";

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
