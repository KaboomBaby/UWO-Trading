import { describe, expect, it } from "vitest";

import {
  createLocalMarketRepository,
  normalizeComponentCategory,
  normalizePortRegion,
} from "../../../src/services/market-service";

describe("local market repository", () => {
  it("filters ports by search and region", async () => {
    const repository = createLocalMarketRepository();

    expect(await repository.listPorts({ search: "spice" })).toMatchObject([
      { id: "lisbon" },
      { id: "alexandria" },
    ]);
    expect(await repository.listPorts({ region: "Caribbean" })).toMatchObject([
      { id: "port-royal" },
    ]);
  });

  it("filters components by search and category", async () => {
    const repository = createLocalMarketRepository();

    expect(
      await repository.listComponents({ search: "compass" }),
    ).toMatchObject([{ id: "astrological-compass" }]);
    expect(
      await repository.listComponents({ category: "rigging" }),
    ).toMatchObject([{ id: "reinforced-mainmast" }]);
  });

  it("normalizes invalid filter values to all", () => {
    expect(normalizePortRegion("Not a region")).toBe("all");
    expect(normalizeComponentCategory("Not a category")).toBe("all");
  });

  it("returns copies of nested mock arrays", async () => {
    const repository = createLocalMarketRepository();
    const [port] = await repository.listPorts({ search: "amsterdam" });
    const [component] = await repository.listComponents({
      search: "mainmast",
    });

    port?.specialties.push("Mutated specialty");
    component?.compatibleWith.push("Mutated ship");

    const [freshPort] = await repository.listPorts({ search: "amsterdam" });
    const [freshComponent] = await repository.listComponents({
      search: "mainmast",
    });
    expect(freshPort?.specialties).not.toContain("Mutated specialty");
    expect(freshComponent?.compatibleWith).not.toContain("Mutated ship");
  });
});
