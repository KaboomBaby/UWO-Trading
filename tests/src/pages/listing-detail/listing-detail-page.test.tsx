import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ListingRepositoryProvider } from "../../../../src/lib/listing-repository-context";
import { ListingDetailPage } from "../../../../src/pages/listing-detail/listing-detail-page";
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
      <ListingRepositoryProvider>
        <Routes>
          <Route element={<ListingDetailPage />} path="/listings/:listingId" />
        </Routes>
      </ListingRepositoryProvider>
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
    expect(screen.getAllByText("PortRoyalShipwright").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("Port Royal").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("img", { name: "Adventurer Frigate visual" }),
    ).toHaveTextContent("🚢");
    expect(
      screen.getByRole("link", {
        name: /Default overview\s*Core listing facts/,
      }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", {
        name: /Legacy provenance\s*Heritage and collection context/,
      }),
    ).toHaveAttribute("href", "/listings/adventurer-frigate?variant=legacy");
    expect(
      screen.getByRole("link", {
        name: /Equipment specifications\s*Compatibility and installation/,
      }),
    ).toHaveAttribute("href", "/listings/adventurer-frigate?variant=equipment");
    expect(
      screen.getByRole("link", {
        name: /Trade negotiation\s*Valuation and next actions/,
      }),
    ).toHaveAttribute("href", "/listings/adventurer-frigate?variant=trade");
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

  it("renders the legacy heritage and provenance presentation", async () => {
    renderApp("/listings/adventurer-frigate?variant=legacy");

    expect(
      await screen.findByRole("heading", { name: "Heritage & provenance" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Legacy Ship Collection/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("44,160,000 gold – 56,640,000 gold"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Provenance timeline" }),
    ).toBeInTheDocument();
    expect(screen.getByText("PortRoyalShipwright")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Legacy-market context" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Default overview\s*Core listing facts/,
      }),
    ).not.toHaveAttribute("aria-current");
  });

  it("renders the equipment component specification presentation", async () => {
    renderApp("/listings/adventurer-frigate?variant=equipment");

    expect(
      await screen.findByRole("heading", {
        name: "Component specifications",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ships platforms · standard fittings"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Seller-confirmed inventory · inspected"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Dock installation · 1,200,000 gold"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Equipment pricing context" }),
    ).toBeInTheDocument();
  });

  it("renders the trade valuation and negotiation presentation", async () => {
    renderApp("/listings/adventurer-frigate?variant=trade");

    expect(
      await screen.findByRole("heading", {
        name: "Trade valuation & negotiation",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1,440,000 gold")).toBeInTheDocument();
    expect(screen.getByText("480,000 gold")).toBeInTheDocument();
    expect(screen.getByText("49,920,000 gold")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Trade readiness" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Next actions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Open terms with PortRoyalShipwright"),
    ).toBeInTheDocument();
  });

  it("falls back to the default presentation for an invalid variant", async () => {
    renderApp("/listings/adventurer-frigate?variant=collector");

    expect(
      await screen.findByRole("heading", { name: "Adventurer Frigate" }),
    ).toBeInTheDocument();
    expect(repository.get).toHaveBeenCalledWith("adventurer-frigate");
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Unknown listing presentation. Showing the safe Default overview instead./,
    );
    expect(
      screen.queryByRole("heading", { name: /provenance/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /specifications/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /negotiation/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Default overview\s*Core listing facts/,
      }),
    ).toHaveAttribute("aria-current", "page");
  });
});
