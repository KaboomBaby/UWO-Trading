import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CommerceRepository } from "../../../../../src/services/commerce-service";
import type {
  WatchlistItem,
  WishlistItem,
} from "../../../../../src/types/commerce";

const { repositoryMock } = vi.hoisted(() => ({
  repositoryMock: {
    listWishlist: vi.fn<CommerceRepository["listWishlist"]>(async () => []),
    listWatchlist: vi.fn<CommerceRepository["listWatchlist"]>(async () => []),
  },
}));

vi.mock("../../../../../src/lib/commerce-repository-context", () => ({
  useCommerceRepository: () => repositoryMock,
}));

const { WishlistWatchlistsPage } =
  await import("../../../../../src/pages/account/wishlist-watchlists/wishlist-watchlists-page");

const wishlistItem: WishlistItem = {
  id: "wish-frigate",
  itemName: "Adventurer Frigate",
  category: "Ships",
  targetPrice: 45_000_000,
  note: "Buy below the Port Royal average.",
  imageEmoji: "🚢",
};

const watchlistItem: WatchlistItem = {
  id: "watch-pepper",
  itemName: "Pepper",
  port: "Lisbon",
  currentPrice: 4_250,
  changePercent: 6.4,
  note: "Export window is open.",
};

function renderPage() {
  return render(<WishlistWatchlistsPage />);
}

describe("WishlistWatchlistsPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    repositoryMock.listWishlist.mockReset();
    repositoryMock.listWishlist.mockResolvedValue([]);
    repositoryMock.listWatchlist.mockReset();
    repositoryMock.listWatchlist.mockResolvedValue([]);
  });

  it("loads both repositories and renders distinct section details and counts", async () => {
    repositoryMock.listWishlist.mockResolvedValue([wishlistItem]);
    repositoryMock.listWatchlist.mockResolvedValue([watchlistItem]);
    renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "Adventurer Frigate",
      }),
    ).toBeInTheDocument();
    expect(repositoryMock.listWishlist).toHaveBeenCalledTimes(1);
    expect(repositoryMock.listWatchlist).toHaveBeenCalledTimes(1);

    expect(
      screen.getByRole("region", { name: "Wishlist" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Watchlists" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ships")).toBeInTheDocument();
    expect(screen.getByText("45,000,000 gold")).toBeInTheDocument();
    expect(
      screen.getByText("Buy below the Port Royal average."),
    ).toBeInTheDocument();
    expect(screen.getByText("🚢")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Pepper" })).toBeInTheDocument();
    expect(screen.getByText("4,250 gold")).toBeInTheDocument();
    expect(screen.getByText("+6.4%")).toBeInTheDocument();
    expect(screen.getByText("Lisbon")).toBeInTheDocument();
    expect(screen.getByText("Export window is open.")).toBeInTheDocument();
    expect(screen.getAllByText("1 item")).toHaveLength(2);
    expect(screen.getByTestId("saved-items-summary")).toHaveTextContent(
      "1 wishlist item · 1 watchlist item",
    );
  });

  it("renders accessible loading states for both sections", () => {
    repositoryMock.listWishlist.mockImplementation(
      () => new Promise<WishlistItem[]>(() => undefined),
    );
    repositoryMock.listWatchlist.mockImplementation(
      () => new Promise<WatchlistItem[]>(() => undefined),
    );
    renderPage();

    expect(screen.getByText("Loading saved items…")).toBeInTheDocument();
    expect(screen.getByText("Loading wishlist…")).toBeInTheDocument();
    expect(screen.getByText("Loading watchlists…")).toBeInTheDocument();
    expect(screen.getAllByText("Loading…")).toHaveLength(2);
    expect(screen.getAllByRole("list")).toHaveLength(2);
  });

  it("recovers when either repository request fails", async () => {
    const user = userEvent.setup();
    repositoryMock.listWishlist
      .mockRejectedValueOnce(new Error("Wishlist failed"))
      .mockResolvedValue([wishlistItem]);
    repositoryMock.listWatchlist.mockResolvedValue([watchlistItem]);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /saved items could not be loaded/i,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: "Adventurer Frigate" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pepper" })).toBeInTheDocument();
    expect(repositoryMock.listWishlist).toHaveBeenCalledTimes(2);
    expect(repositoryMock.listWatchlist).toHaveBeenCalledTimes(2);
  });

  it("renders distinct empty states and zero counts", async () => {
    repositoryMock.listWishlist.mockResolvedValue([]);
    repositoryMock.listWatchlist.mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "No wishlist items yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "No watchlist items yet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/set a target price to wait for/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/follow prices at ports you trade from/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("0 items")).toHaveLength(2);
    expect(screen.getByTestId("saved-items-summary")).toHaveTextContent(
      "0 wishlist items · 0 watchlist items",
    );
  });
});
