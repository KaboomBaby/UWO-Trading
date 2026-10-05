import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShopCatalogPage } from "../../../../src/pages/shops/shop-catalog-page";
import type { ShopItem } from "../../../../src/types/commerce";

const repositoryMock = vi.hoisted(() => ({ listShopItems: vi.fn() }));

vi.mock("../../../../src/lib/commerce-repository-context", () => ({
  useCommerceRepository: () => repositoryMock,
}));

function LocationSearch() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderShopCatalog(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationSearch />
      <Routes>
        <Route path="/shops" element={<ShopCatalogPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const frigate: ShopItem = {
  id: "shop-frigate",
  name: "Expedition Frigate",
  category: "ships",
  price: 46_500_000,
  stock: 2,
  seller: "Amsterdam Shipyard",
  description: "A balanced expedition vessel ready for long routes.",
  imageEmoji: "⛵",
};

describe("ShopCatalogPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    repositoryMock.listShopItems.mockReset();
  });

  it("initializes filters from the URL, queries the repository, and renders item details", async () => {
    repositoryMock.listShopItems.mockResolvedValue([frigate]);
    renderShopCatalog("/shops?category=ships&search=frigate");

    expect(screen.getByLabelText("Search shop items")).toHaveValue("frigate");
    expect(screen.getByLabelText("Filter by category")).toHaveValue("ships");
    expect(repositoryMock.listShopItems).toHaveBeenCalledWith({
      category: "ships",
      search: "frigate",
    });

    await waitFor(() =>
      expect(screen.getByText("1 item found")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "Expedition Frigate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Amsterdam Shipyard")).toBeInTheDocument();
    expect(screen.getByText("46,500,000 gold")).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
    expect(screen.getByText("2 units available")).toBeInTheDocument();
  });

  it("preserves search when the category changes in the URL", async () => {
    const user = userEvent.setup();
    repositoryMock.listShopItems.mockResolvedValue([frigate]);
    renderShopCatalog("/shops?search=frigate");

    await user.selectOptions(
      screen.getByLabelText("Filter by category"),
      "ships",
    );

    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "category=ships&search=frigate",
    );
  });

  it("preserves spaces in multiword searches", async () => {
    const user = userEvent.setup();
    repositoryMock.listShopItems.mockResolvedValue([frigate]);
    renderShopCatalog("/shops");

    const input = screen.getByLabelText("Search shop items");
    await user.type(input, "Amsterdam Shipyard");

    expect(input).toHaveValue("Amsterdam Shipyard");
    expect(repositoryMock.listShopItems).toHaveBeenLastCalledWith({
      category: "all",
      search: "Amsterdam Shipyard",
    });
  });

  it("shows loading for a new query and ignores stale responses", async () => {
    const user = userEvent.setup();
    let resolveFirst: ((value: ShopItem[]) => void) | undefined;
    let resolveSecond: ((value: ShopItem[]) => void) | undefined;
    repositoryMock.listShopItems
      .mockImplementationOnce(
        () =>
          new Promise<ShopItem[]>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<ShopItem[]>((resolve) => {
            resolveSecond = resolve;
          }),
      );
    renderShopCatalog("/shops");

    await user.selectOptions(
      screen.getByLabelText("Filter by category"),
      "ships",
    );
    expect(screen.getByText("Loading shop items…")).toBeInTheDocument();

    resolveFirst?.([{ ...frigate, name: "Stale Frigate" }]);
    await waitFor(() =>
      expect(screen.queryByText("Stale Frigate")).not.toBeInTheDocument(),
    );

    resolveSecond?.([frigate]);
    expect(
      await screen.findByRole("heading", { name: /expedition frigate/i }),
    ).toBeInTheDocument();
  });

  it("canonicalizes invalid defaults and renders a safe empty state", async () => {
    repositoryMock.listShopItems.mockResolvedValue([]);
    renderShopCatalog("/shops?category=unknown&search=");

    expect(screen.getByLabelText("Filter by category")).toHaveValue("all");
    expect(repositoryMock.listShopItems).toHaveBeenCalledWith({
      category: "all",
      search: undefined,
    });

    await waitFor(() =>
      expect(screen.getByTestId("location-search").textContent).toBe(""),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: /no shop items match your filters/i,
        }),
      ).toBeInTheDocument(),
    );
  });
});
