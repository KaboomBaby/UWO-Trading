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

const { BrowsePage } = await import("../../../../src/pages/browse/browse-page");

function renderBrowse(path = "/browse") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <>
        <Routes>
          <Route path="/browse" element={<BrowsePage />} />
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

describe("BrowsePage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockRepository.list.mockReset();
    mockRepository.list.mockResolvedValue([]);
  });

  it("passes every selected category to the repository and stores Ships in the URL", async () => {
    const user = userEvent.setup();
    mockRepository.list.mockResolvedValue([]);
    renderBrowse("/browse");
    await screen.findByText("0 listings");

    const categoryLabels: Array<[string, string]> = [
      ["ships", "Ships"],
      ["property", "Property"],
      ["equipment", "Equipment"],
      ["resources", "Resources"],
      ["services", "Services"],
      ["all", "All"],
    ];

    for (const [category, label] of categoryLabels) {
      await user.click(screen.getByRole("button", { name: label }));
      await waitFor(() =>
        expect(mockRepository.list).toHaveBeenLastCalledWith(
          expect.objectContaining({ category }),
        ),
      );
    }

    const calls = mockRepository.list.mock.calls.map(([query]) => query);
    expect(calls.map((query) => query?.category)).toEqual([
      "all",
      "ships",
      "property",
      "equipment",
      "resources",
      "services",
      "all",
    ]);
    expect(screen.getByText("/browse")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ships" }));
    await waitFor(() =>
      expect(screen.getByText("/browse?category=ships")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Ships" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("passes search and sort queries to the repository", async () => {
    const user = userEvent.setup();
    mockRepository.list.mockResolvedValue([]);
    renderBrowse();
    await screen.findByText("0 listings");

    await user.type(screen.getByLabelText("Search"), "frigate");
    await waitFor(() =>
      expect(mockRepository.list).toHaveBeenLastCalledWith({
        category: "all",
        search: "frigate",
        sort: "newest",
      }),
    );

    await user.selectOptions(screen.getByLabelText("Sort by"), "price-desc");
    await waitFor(() =>
      expect(mockRepository.list).toHaveBeenLastCalledWith({
        category: "all",
        search: "frigate",
        sort: "price-desc",
      }),
    );
  });

  it("reads a Ships category from the initial URL", async () => {
    mockRepository.list.mockResolvedValue([]);
    renderBrowse("/browse?category=ships");

    expect(await screen.findByText("0 listings")).toBeInTheDocument();
    expect(mockRepository.list).toHaveBeenCalledWith({
      category: "ships",
      search: undefined,
      sort: "newest",
    });
    expect(screen.getByRole("button", { name: "Ships" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders a clear empty state when the repository returns no listings", async () => {
    mockRepository.list.mockResolvedValue([]);
    renderBrowse();

    expect(
      await screen.findByRole("heading", { name: "No listings found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nothing matches your current filters/i),
    ).toBeInTheDocument();
    expect(screen.getByText("0 listings")).toBeInTheDocument();
  });

  it("renders successful repository results as listing links", async () => {
    mockRepository.list.mockResolvedValue([listing]);
    renderBrowse();

    expect(
      await screen.findByRole("heading", { name: "Adventurer Frigate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 listing")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /adventurer frigate/i }),
    ).toHaveAttribute("href", "/listings/adventurer-frigate");
  });

  it("enters a loading state and recovers when filters are reset after an error", async () => {
    const user = userEvent.setup();
    let resolveRetry: ((value: Listing[]) => void) | undefined;
    mockRepository.list
      .mockRejectedValueOnce(new Error("Unable to load listings"))
      .mockImplementationOnce(
        () =>
          new Promise<Listing[]>((resolve) => {
            resolveRetry = resolve;
          }),
      );
    renderBrowse();

    expect(
      await screen.findByRole("heading", {
        name: /listings could not be loaded/i,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getAllByText("Loading listings…")).toHaveLength(2);
    resolveRetry?.([listing]);
    expect(
      await screen.findByRole("heading", { name: "Adventurer Frigate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 listing")).toBeInTheDocument();
  });
});
