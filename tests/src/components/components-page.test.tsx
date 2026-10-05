import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ComponentsPage } from "../../../src/pages/components/components-page";
import type { ComponentItem } from "../../../src/types/market";

const repositoryMock = vi.hoisted(() => ({ listComponents: vi.fn() }));

vi.mock("../../../src/lib/market-repository-context", () => ({
  useMarketRepository: () => repositoryMock,
}));

function LocationSearch() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderComponents(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationSearch />
      <Routes>
        <Route path="/components" element={<ComponentsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const mast: ComponentItem = {
  id: "reinforced-mainmast",
  name: "Reinforced Mainmast",
  category: "rigging",
  rarity: "rare",
  price: 4_800_000,
  description: "A strengthened mast for storm-prone routes.",
  compatibleWith: ["Frigates", "Galleons"],
  imageEmoji: "⛵",
  inStock: true,
};

describe("ComponentsPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    repositoryMock.listComponents.mockReset();
  });

  it("initializes filters from the URL, queries the repository, and renders catalog details", async () => {
    repositoryMock.listComponents.mockResolvedValue([mast]);
    renderComponents("/components?category=rigging&search=mast");

    expect(screen.getByLabelText("Search components")).toHaveValue("mast");
    expect(screen.getByLabelText("Filter by category")).toHaveValue("rigging");
    expect(repositoryMock.listComponents).toHaveBeenCalledWith({
      category: "rigging",
      search: "mast",
    });

    await waitFor(() =>
      expect(screen.getByText("1 component found")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "Reinforced Mainmast" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Rare")).toBeInTheDocument();
    expect(screen.getByText("4,800,000 gold")).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
    for (const shipType of mast.compatibleWith) {
      expect(screen.getByText(shipType)).toBeInTheDocument();
    }
  });

  it("preserves search when the category changes in the URL", async () => {
    const user = userEvent.setup();
    repositoryMock.listComponents.mockResolvedValue([mast]);
    renderComponents("/components?category=all&search=mast");

    await user.selectOptions(
      screen.getByLabelText("Filter by category"),
      "rigging",
    );

    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "category=rigging&search=mast",
    );
  });

  it("treats an invalid or empty category as all and renders a safe empty state", async () => {
    repositoryMock.listComponents.mockResolvedValue([]);
    renderComponents("/components?category=furniture&search=");

    expect(screen.getByLabelText("Filter by category")).toHaveValue("all");
    expect(repositoryMock.listComponents).toHaveBeenCalledWith({
      category: "all",
      search: undefined,
    });
    await waitFor(() =>
      expect(screen.getByTestId("location-search").textContent).toBe(""),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: /no components match your filters/i,
        }),
      ).toBeInTheDocument(),
    );
  });
});
