import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ListingRepository } from "../../../../src/services/listing-service";
import type { Listing } from "../../../../src/types/listing";

const { mockRepository } = vi.hoisted(() => ({
  mockRepository: {
    list: vi.fn<ListingRepository["list"]>(async () => []),
  },
}));

vi.mock("../../../../src/lib/listing-repository-context", () => ({
  useListingRepository: () => mockRepository,
}));

const { SearchPage } = await import("../../../../src/pages/search/search-page");

const listing: Listing = {
  id: "adventurer-frigate",
  title: "Adventurer Frigate",
  category: "ships",
  price: 48_000_000,
  currency: "gold",
  description: "A dependable adventure frigate.",
  seller: "PortRoyalShipwright",
  location: "Port Royal",
  imageEmoji: "🚢",
  createdAt: "2026-10-04T14:00:00Z",
};

function renderSearch(path = "/search") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <>
        <Routes>
          <Route path="/search" element={<SearchPage />} />
        </Routes>
        <output>
          <TestLocation />
        </output>
      </>
    </MemoryRouter>,
  );
}

function TestLocation() {
  const location = useLocation();
  return <span>{location.pathname + location.search}</span>;
}

describe("SearchPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockRepository.list.mockReset();
    mockRepository.list.mockResolvedValue([]);
  });

  it("reads q from the URL, calls the repository, and renders matches", async () => {
    mockRepository.list.mockResolvedValue([listing]);
    renderSearch("/search?q=frigate");

    expect(mockRepository.list).toHaveBeenCalledWith({ search: "frigate" });
    expect(
      await screen.findByRole("link", { name: /adventurer frigate/i }),
    ).toHaveAttribute("href", "/listings/adventurer-frigate");
    expect(screen.getByText(/1 result for “frigate”/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("frigate")).toBeInTheDocument();
  });

  it("updates the shareable q URL from the accessible search form", async () => {
    const user = userEvent.setup();
    mockRepository.list.mockResolvedValue([]);
    renderSearch("/search");

    const input = screen.getByLabelText("Search listings");
    await user.type(input, "galleon{Enter}");

    expect(await screen.findByText("/search?q=galleon")).toBeInTheDocument();
    expect(input).toHaveFocus();
    await waitFor(() =>
      expect(mockRepository.list).toHaveBeenLastCalledWith({
        search: "galleon",
      }),
    );
  });

  it("renders a clear empty-query state without calling the repository", () => {
    renderSearch("/search");

    expect(
      screen.getByRole("heading", { name: "Start your search" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter a search term")).toBeInTheDocument();
    expect(mockRepository.list).not.toHaveBeenCalled();
  });

  it("renders a clear no-results state for a shared query", async () => {
    mockRepository.list.mockResolvedValue([]);
    renderSearch("/search?q=missing");

    expect(
      await screen.findByRole("heading", { name: /no results for “missing”/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/try a shorter keyword/i)).toBeInTheDocument();
    expect(screen.getByText(/0 results for “missing”/i)).toBeInTheDocument();
  });

  it("shows a strong loading state while the repository is pending", () => {
    mockRepository.list.mockImplementation(
      () => new Promise<Listing[]>(() => undefined),
    );
    renderSearch("/search?q=frigate");

    expect(screen.getAllByText("Loading results…")).toHaveLength(2);
    expect(screen.getAllByRole("list")).toHaveLength(1);
  });

  it("recovers after a repository error", async () => {
    const user = userEvent.setup();
    mockRepository.list
      .mockRejectedValueOnce(new Error("Search failed"))
      .mockResolvedValueOnce([listing]);
    renderSearch("/search?q=frigate");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /search could not be completed/i,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("link", { name: /adventurer frigate/i }),
    ).toBeInTheDocument();
  });
});
