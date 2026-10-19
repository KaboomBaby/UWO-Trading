import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ListingRepository } from "../../../../src/services/listing-service";
import type { Listing } from "../../../../src/types/listing";
import {
  testEquipmentDetails,
  testWeaponDetails,
} from "../../fixtures/equipment-details";

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
  currency: "ducats",
  description: "A dependable adventure frigate.",
  seller: "PortRoyalShipwright",
  location: "Port Royal",
  server: "Maris",
  contactNote: "Mail at the Port Royal harbor office.",
  imageEmoji: "🚢",
  createdAt: "2026-10-04T14:00:00Z",
  expiresAt: "2026-10-18T14:00:00Z",
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
        collection: "current",
        search: "frigate",
        sort: "newest",
      }),
    );

    await user.selectOptions(screen.getByLabelText("Sort by"), "price-desc");
    await waitFor(() =>
      expect(mockRepository.list).toHaveBeenLastCalledWith({
        category: "all",
        collection: "current",
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
      collection: "current",
      search: undefined,
      sort: "newest",
    });
    expect(screen.getByRole("button", { name: "Ships" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("offers a Tickets only toggle in Ships browsing and passes it to the repository", async () => {
    const user = userEvent.setup();
    mockRepository.list.mockResolvedValue([]);
    renderBrowse("/browse?category=ships");
    await screen.findByText("0 listings");

    const toggle = screen.getByRole("button", { name: "Tickets only" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    await waitFor(() =>
      expect(mockRepository.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: "ships", ticketsOnly: true }),
      ),
    );
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("does not offer the Tickets only toggle outside Ships browsing", async () => {
    mockRepository.list.mockResolvedValue([]);
    renderBrowse("/browse");
    await screen.findByText("0 listings");

    expect(
      screen.queryByRole("button", { name: "Tickets only" }),
    ).not.toBeInTheDocument();
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

  it("renders Equipment results as a simple searchable list of rows", async () => {
    mockRepository.list.mockResolvedValue([
      {
        ...listing,
        id: "celestial-purple-changpao",
        title: "Celestial Purple Changpao",
        category: "equipment",
        equipmentDetails: testEquipmentDetails,
      },
    ]);
    renderBrowse("/browse?category=equipment");

    expect(
      await screen.findByLabelText("Equipment listings"),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", {
      name: /celestial purple changpao/i,
    });
    expect(link).toHaveAttribute("href", "/listings/celestial-purple-changpao");
    expect(link).toHaveTextContent("Durability 102/100");
    expect(link).toHaveTextContent("Attack Power 55");
    expect(link).toHaveTextContent("Navigation +3");
    expect(link).toHaveTextContent("Reduce Supply Consumption Rank 8");
    expect(mockRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ category: "equipment" }),
    );
  });

  it("filters Equipment listings by picked skills", async () => {
    const user = userEvent.setup({ delay: null });
    mockRepository.list.mockResolvedValue([
      {
        ...listing,
        id: "celestial-purple-changpao",
        title: "Celestial Purple Changpao",
        category: "equipment",
        equipmentDetails: testEquipmentDetails,
      },
      {
        ...listing,
        id: "sba",
        title: "SBA",
        category: "equipment",
        equipmentDetails: {
          attackPower: 10,
          skillBonuses: [
            { name: "Fishing", iconId: "skill_fishing", value: 2 },
          ],
        },
      },
    ]);
    renderBrowse("/browse?category=equipment");

    expect(
      await screen.findByLabelText("Equipment listings"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sba/i })).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Skill 1" }));
    const skillList = screen.getByRole("listbox", { name: "Skill 1" });
    await user.click(
      within(skillList).getByRole("button", { name: /Navigation/ }),
    );

    expect(
      screen.getByRole("link", { name: /celestial purple changpao/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /sba/i }),
    ).not.toBeInTheDocument();
  });

  it("orders Equipment listings by a picked stat and flips the order", async () => {
    const user = userEvent.setup({ delay: null });
    mockRepository.list.mockResolvedValue([
      {
        ...listing,
        id: "celestial-purple-changpao",
        title: "Celestial Purple Changpao",
        category: "equipment",
        equipmentDetails: testEquipmentDetails,
      },
      {
        ...listing,
        id: "battle-hardened-horn-bow",
        title: "Battle-Hardened Horn Bow",
        category: "equipment",
        equipmentDetails: testWeaponDetails,
      },
    ]);
    renderBrowse("/browse?category=equipment");

    const region = await screen.findByLabelText("Equipment listings");
    const hrefs = () =>
      within(region)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"));
    expect(hrefs()).toEqual([
      "/listings/celestial-purple-changpao",
      "/listings/battle-hardened-horn-bow",
    ]);

    await user.selectOptions(
      screen.getByLabelText("Sort by"),
      "stat:attackPower",
    );
    await waitFor(() =>
      expect(hrefs()).toEqual([
        "/listings/battle-hardened-horn-bow",
        "/listings/celestial-purple-changpao",
      ]),
    );

    await user.click(screen.getByRole("button", { name: /highest first/i }));
    await waitFor(() =>
      expect(hrefs()).toEqual([
        "/listings/celestial-purple-changpao",
        "/listings/battle-hardened-horn-bow",
      ]),
    );
    expect(
      screen.getByRole("button", { name: /lowest first/i }),
    ).toBeInTheDocument();
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

  it("defaults to Current and passes that collection to the repository", async () => {
    mockRepository.list.mockResolvedValue([]);
    renderBrowse("/browse");

    expect(await screen.findByText("0 listings")).toBeInTheDocument();
    expect(mockRepository.list).toHaveBeenCalledWith({
      category: "all",
      collection: "current",
      search: undefined,
      sort: "newest",
    });
    expect(screen.getByRole("link", { name: "Current" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByText("/browse")).toBeInTheDocument();
  });

  it("initializes Legacy from the URL and passes collection to the repository", async () => {
    mockRepository.list.mockResolvedValue([listing]);
    renderBrowse("/browse?collection=legacy");

    expect(mockRepository.list).toHaveBeenCalledWith({
      category: "all",
      collection: "legacy",
      search: undefined,
      sort: "newest",
    });
    expect(
      await screen.findByRole("link", { name: /adventurer frigate/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Legacy" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByText("/browse?collection=legacy")).toBeInTheDocument();
  });

  it("canonicalizes invalid and unsupported Browse URL parameters", async () => {
    mockRepository.list.mockResolvedValue([]);
    renderBrowse("/browse?category=invalid&collection=current&source=figma");

    expect(await screen.findByText("/browse")).toBeInTheDocument();
    expect(mockRepository.list).toHaveBeenCalledWith({
      category: "all",
      collection: "current",
      search: undefined,
      sort: "newest",
    });
  });

  it("switches collections through shareable links while preserving active filters", async () => {
    const user = userEvent.setup();
    mockRepository.list.mockResolvedValue([]);
    renderBrowse("/browse?category=ships&collection=legacy");
    await screen.findByText("0 listings");

    await user.type(screen.getByLabelText("Search"), "frigate");
    await user.selectOptions(screen.getByLabelText("Sort by"), "price-desc");
    await waitFor(() =>
      expect(mockRepository.list).toHaveBeenLastCalledWith({
        category: "ships",
        collection: "legacy",
        search: "frigate",
        sort: "price-desc",
      }),
    );

    await user.click(screen.getByRole("link", { name: "Current" }));
    expect(
      await screen.findByText("/browse?category=ships"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(mockRepository.list).toHaveBeenLastCalledWith({
        category: "ships",
        collection: "current",
        search: "frigate",
        sort: "price-desc",
      }),
    );

    await user.click(screen.getByRole("link", { name: "Legacy" }));
    expect(
      await screen.findByText("/browse?category=ships&collection=legacy"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(mockRepository.list).toHaveBeenLastCalledWith({
        category: "ships",
        collection: "legacy",
        search: "frigate",
        sort: "price-desc",
      }),
    );
  });
});
