import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MarketPricesPage } from "../../../../../src/pages/trading/market-prices/market-prices-page";
import type { MarketPrice } from "../../../../../src/types/trading";

const repositoryMock = vi.hoisted(() => ({ listPrices: vi.fn() }));

vi.mock("../../../../../src/lib/trading-repository-context", () => ({
  useTradingRepository: () => repositoryMock,
}));

function LocationSearch() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderMarketPrices(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationSearch />
      <Routes>
        <Route path="/market/prices" element={<MarketPricesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const pepperPrice: MarketPrice = {
  id: "pepper-lisbon",
  itemName: "Pepper",
  category: "commodities",
  port: "Lisbon",
  price: 4_250,
  changePercent: 6.4,
  trend: "rising",
  updatedAt: "2026-10-05T01:00:00Z",
};

describe("MarketPricesPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    repositoryMock.listPrices.mockReset();
  });

  it("initializes filters from the URL, queries the repository, and renders prices and trends", async () => {
    repositoryMock.listPrices.mockResolvedValue([pepperPrice]);
    renderMarketPrices("/market/prices?category=commodities&search=pepper");

    expect(screen.getByLabelText("Search prices")).toHaveValue("pepper");
    expect(screen.getByLabelText("Filter by category")).toHaveValue(
      "commodities",
    );
    expect(repositoryMock.listPrices).toHaveBeenCalledWith({
      category: "commodities",
      search: "pepper",
    });

    await waitFor(() =>
      expect(screen.getByText("1 price found")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("table", {
        name: /market prices by item, category, and port/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: /pepper.*lisbon.*4,250 gold/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("+6.4%")).toHaveLength(2);
    expect(screen.getAllByText("Rising")).toHaveLength(2);
    expect(screen.getByText("Average movement")).toBeInTheDocument();
  });

  it("preserves search when the category changes in the URL", async () => {
    const user = userEvent.setup();
    repositoryMock.listPrices.mockResolvedValue([pepperPrice]);
    renderMarketPrices("/market/prices?category=all&search=pepper");

    await user.selectOptions(
      screen.getByLabelText("Filter by category"),
      "commodities",
    );

    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "category=commodities&search=pepper",
    );
  });

  it("preserves spaces while typing a multiword search", async () => {
    const user = userEvent.setup();
    repositoryMock.listPrices.mockResolvedValue([pepperPrice]);
    renderMarketPrices("/market/prices");

    const input = screen.getByLabelText("Search prices");
    await user.type(input, "Port Royal");

    expect(input).toHaveValue("Port Royal");
    expect(repositoryMock.listPrices).toHaveBeenLastCalledWith({
      category: "all",
      search: "Port Royal",
    });
  });

  it("shows loading for a new query and ignores stale responses", async () => {
    const user = userEvent.setup();
    let resolveFirst: ((value: MarketPrice[]) => void) | undefined;
    let resolveSecond: ((value: MarketPrice[]) => void) | undefined;
    repositoryMock.listPrices
      .mockImplementationOnce(
        () =>
          new Promise<MarketPrice[]>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<MarketPrice[]>((resolve) => {
            resolveSecond = resolve;
          }),
      );
    renderMarketPrices("/market/prices");

    await user.selectOptions(
      screen.getByLabelText("Filter by category"),
      "commodities",
    );
    expect(screen.getByText("Loading market prices…")).toBeInTheDocument();

    resolveFirst?.([
      {
        ...pepperPrice,
        id: "stale-price",
        itemName: "Stale Price",
      },
    ]);
    await waitFor(() =>
      expect(screen.queryByText("Stale Price")).not.toBeInTheDocument(),
    );

    resolveSecond?.([pepperPrice]);
    expect(
      await screen.findByRole("row", { name: /pepper.*lisbon/i }),
    ).toBeInTheDocument();
  });

  it("treats missing and invalid categories as all and renders a safe empty state", async () => {
    repositoryMock.listPrices.mockResolvedValue([]);
    renderMarketPrices("/market/prices?category=unknown&search=");

    expect(screen.getByLabelText("Filter by category")).toHaveValue("all");
    expect(repositoryMock.listPrices).toHaveBeenCalledWith({
      category: "all",
      search: undefined,
    });
    await waitFor(() =>
      expect(screen.getByTestId("location-search").textContent).toBe(""),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: /no prices match your filters/i,
        }),
      ).toBeInTheDocument(),
    );
  });
});
