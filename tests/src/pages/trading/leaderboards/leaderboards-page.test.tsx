import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TradingRepositoryProvider } from "../../../../../src/lib/trading-repository-context";
import { LeaderboardsPage } from "../../../../../src/pages/trading/leaderboards/leaderboards-page";
import type { LeaderboardEntry } from "../../../../../src/types/trading";

const repository = vi.hoisted(() => ({
  listPrices: vi.fn(),
  listAlerts: vi.fn(),
  createAlert: vi.fn(),
  setAlertStatus: vi.fn(),
  listLeaderboard: vi.fn(),
}));

vi.mock(
  "../../../../../src/services/trading-service",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../../../../src/services/trading-service")
      >();

    return {
      ...actual,
      createLocalTradingRepository: () => repository,
    };
  },
);

const profitEntries: LeaderboardEntry[] = [
  {
    id: "captain-alvares",
    trader: "Captain Alvares",
    port: "Lisbon",
    profit: 842_000_000,
    volume: 2_140_000_000,
    trades: 418,
  },
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
];

const tradeEntries = [profitEntries[1], profitEntries[0], profitEntries[2]];

function renderLeaderboards(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/trading/leaderboards",
        element: (
          <TradingRepositoryProvider>
            <LeaderboardsPage />
          </TradingRepositoryProvider>
        ),
      },
    ],
    {
      initialEntries: [path],
    },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe("leaderboards page", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    repository.listLeaderboard.mockResolvedValue(profitEntries);
  });

  it("initializes the repository query from metric and search URL parameters", async () => {
    repository.listLeaderboard.mockResolvedValue(tradeEntries);
    const router = renderLeaderboards(
      "/trading/leaderboards?metric=trades&search=Port%20Royal",
    );

    expect(
      await screen.findByRole("heading", { name: "Leaderboards" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.search).toBe(
        "?metric=trades&search=Port%20Royal",
      );
    });
    expect(repository.listLeaderboard).toHaveBeenCalledWith({
      metric: "trades",
      search: "Port Royal",
    });
    expect(
      screen.getByRole("searchbox", { name: "Search traders and ports" }),
    ).toHaveValue("Port Royal");
    expect(screen.getByRole("link", { name: "Trades" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("3 results for “Port Royal”")).toBeInTheDocument();
  });

  it("canonicalizes invalid metrics and blank searches to default parameters", async () => {
    const router = renderLeaderboards(
      "/trading/leaderboards?metric=invalid&search=%20%20&source=figma",
    );

    expect(
      await screen.findByRole("heading", { name: "Leaderboards" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.search).toBe("");
    });
    expect(repository.listLeaderboard).toHaveBeenCalledWith({
      metric: "profit",
    });
    expect(repository.listLeaderboard).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Profit" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("renders repository order, ranked rows, metric values, and details", async () => {
    renderLeaderboards("/trading/leaderboards?metric=profit");

    expect(
      await screen.findByRole("table", {
        name: "Traders ranked by Profit",
      }),
    ).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(4);

    const firstCells = [
      within(rows[1]).getByRole("rowheader"),
      ...within(rows[1]).getAllByRole("cell"),
    ];
    expect(firstCells.map((cell) => cell.textContent)).toEqual([
      "1",
      "Captain Alvares",
      "Lisbon",
      "842,000,000 gold",
    ]);
    const secondCells = [
      within(rows[2]).getByRole("rowheader"),
      ...within(rows[2]).getAllByRole("cell"),
    ];
    expect(secondCells.map((cell) => cell.textContent)).toEqual([
      "2",
      "Port Royal Marta",
      "Port Royal",
      "731,000,000 gold",
    ]);
    expect(screen.getByText("3 results")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Profit" }),
    ).toHaveAttribute("aria-sort", "descending");
  });

  it("updates canonical metric and search URL parameters from page controls", async () => {
    const user = userEvent.setup();
    const router = renderLeaderboards("/trading/leaderboards");

    await user.click(await screen.findByRole("link", { name: "Volume" }));
    await waitFor(() => {
      expect(router.state.location.search).toBe("?metric=volume");
    });
    expect(repository.listLeaderboard).toHaveBeenLastCalledWith({
      metric: "volume",
    });

    await user.type(
      screen.getByRole("searchbox", { name: "Search traders and ports" }),
      "Port Royal",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => {
      expect(router.state.location.search).toBe(
        "?metric=volume&search=Port+Royal",
      );
    });
    expect(repository.listLeaderboard).toHaveBeenLastCalledWith({
      metric: "volume",
      search: "Port Royal",
    });
  });

  it("renders a clear empty state when the repository returns no entries", async () => {
    repository.listLeaderboard.mockResolvedValue([]);
    const router = renderLeaderboards("/trading/leaderboards?search=Ghost");

    expect(
      await screen.findByRole("heading", { name: "No leaderboard matches" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 results for “Ghost”")).toBeInTheDocument();
    expect(
      screen.getByText(/No traders or ports match “Ghost”/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear search" })).toHaveAttribute(
      "href",
      "/trading/leaderboards",
    );
    expect(router.state.location.search).toBe("?search=Ghost");
  });

  it("shows a clear repository error state", async () => {
    repository.listLeaderboard.mockRejectedValue(
      new Error("Trading archive unavailable."),
    );
    renderLeaderboards("/trading/leaderboards?metric=volume");

    const error = await screen.findByRole("alert");
    expect(
      screen.getByRole("heading", { name: "Leaderboards could not load" }),
    ).toBeInTheDocument();
    expect(error).toHaveTextContent("Unable to load leaderboards.");
  });
});
