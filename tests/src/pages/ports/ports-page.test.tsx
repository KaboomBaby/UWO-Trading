import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortsPage } from "../../../../src/pages/ports/ports-page";
import type { MarketPort } from "../../../../src/types/market";

const repositoryMock = vi.hoisted(() => ({ listPorts: vi.fn() }));

vi.mock("../../../../src/lib/market-repository-context", () => ({
  useMarketRepository: () => repositoryMock,
}));

function LocationSearch() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderPorts(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationSearch />
      <Routes>
        <Route path="/ports" element={<PortsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const caribbeanPort: MarketPort = {
  id: "port-royal",
  name: "Port Royal",
  country: "Jamaica",
  region: "Caribbean",
  specialties: ["Rum", "Sugar", "Privateering"],
  description: "A busy Caribbean port with high profits and serious risk.",
  imageEmoji: "🏴‍☠️",
  dockingCapacity: 120,
  dangerLevel: "high",
};

describe("PortsPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    repositoryMock.listPorts.mockReset();
  });

  it("initializes filters from the URL, queries the repository, and renders port details", async () => {
    repositoryMock.listPorts.mockResolvedValue([caribbeanPort]);
    renderPorts("/ports?region=Caribbean&search=spice");

    expect(screen.getByLabelText("Search ports")).toHaveValue("spice");
    expect(screen.getByLabelText("Filter by region")).toHaveValue("Caribbean");
    expect(repositoryMock.listPorts).toHaveBeenCalledWith({
      region: "Caribbean",
      search: "spice",
    });

    await waitFor(() =>
      expect(screen.getByText("1 port found")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "Port Royal" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jamaica · Caribbean")).toBeInTheDocument();
    expect(screen.getByText("High danger")).toBeInTheDocument();
    expect(screen.getByText("120 ships")).toBeInTheDocument();
    for (const specialty of caribbeanPort.specialties) {
      expect(screen.getByText(specialty)).toBeInTheDocument();
    }
  });

  it("preserves search when the region changes in the URL", async () => {
    const user = userEvent.setup();
    repositoryMock.listPorts.mockResolvedValue([caribbeanPort]);
    renderPorts("/ports?region=all&search=spice");

    await user.selectOptions(
      screen.getByLabelText("Filter by region"),
      "Caribbean",
    );

    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "region=Caribbean&search=spice",
    );
  });

  it("treats an invalid or empty region as all and renders a safe empty state", async () => {
    repositoryMock.listPorts.mockResolvedValue([]);
    renderPorts("/ports?region=atlantis&search=");

    expect(screen.getByLabelText("Filter by region")).toHaveValue("all");
    expect(repositoryMock.listPorts).toHaveBeenCalledWith({
      region: "all",
      search: undefined,
    });
    await waitFor(() =>
      expect(screen.getByTestId("location-search").textContent).toBe(""),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /no ports match your filters/i }),
      ).toBeInTheDocument(),
    );
  });
});
