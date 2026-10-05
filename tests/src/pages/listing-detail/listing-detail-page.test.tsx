import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../../../src/app";
import type { Listing } from "../../../../src/types/listing";

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../../../../src/services/listing-service", () => ({
  createLocalListingRepository: () => repository,
}));

const knownListing: Listing = {
  id: "adventurer-frigate",
  title: "Adventurer Frigate",
  category: "ships",
  price: 48_000_000,
  currency: "gold",
  description:
    "A dependable adventure frigate with strong cargo capacity and ocean handling.",
  seller: "PortRoyalShipwright",
  location: "Port Royal",
  imageEmoji: "🚢",
  createdAt: "2026-10-04T14:00:00Z",
};

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("listing detail page", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    repository.get.mockResolvedValue(knownListing);
  });

  it("renders a known listing from the repository", async () => {
    renderApp("/listings/adventurer-frigate");

    expect(
      await screen.findByRole("heading", { name: "Adventurer Frigate" }),
    ).toBeInTheDocument();
    expect(repository.get).toHaveBeenCalledWith("adventurer-frigate");
    expect(screen.getByText("48,000,000 gold")).toBeInTheDocument();
    expect(screen.getByText("Ships")).toBeInTheDocument();
    expect(screen.getByText(knownListing.description)).toBeInTheDocument();
    expect(screen.getByText("PortRoyalShipwright")).toBeInTheDocument();
    expect(screen.getAllByText("Port Royal").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("img", { name: "Adventurer Frigate visual" }),
    ).toHaveTextContent("🚢");
    expect(
      screen.getByRole("link", { name: "Browse listings" }),
    ).toHaveAttribute("href", "/browse");
    expect(
      screen.getByRole("link", { name: "Post your own listing" }),
    ).toHaveAttribute("href", "/post");
  });

  it("shows a clear not-found state for an unknown listing id", async () => {
    repository.get.mockResolvedValue(undefined);
    renderApp("/listings/missing-listing");

    expect(
      await screen.findByRole("heading", { name: "Listing not found" }),
    ).toBeInTheDocument();
    expect(repository.get).toHaveBeenCalledWith("missing-listing");
    expect(
      screen.getByText(/not in the current local marketplace session/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse listings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Post your own listing" }),
    ).toBeInTheDocument();
  });
});
