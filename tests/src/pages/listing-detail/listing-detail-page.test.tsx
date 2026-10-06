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
  currency: "ducats",
  description:
    "A dependable adventure frigate with strong cargo capacity and ocean handling.",
  seller: "PortRoyalShipwright",
  location: "Port Royal",
  server: "Maris",
  contactNote: "Message through the harbor office.",
  imageEmoji: "🚢",
  createdAt: "2026-10-04T14:00:00Z",
  expiresAt: "2026-10-18T14:00:00Z",
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
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
    repository.get.mockResolvedValue(knownListing);
  });

  it("renders a known listing from the repository", async () => {
    renderApp("/listings/adventurer-frigate");

    expect(
      await screen.findByRole("heading", { name: "Adventurer Frigate" }),
    ).toBeInTheDocument();
    expect(repository.get).toHaveBeenCalledWith("adventurer-frigate");
    expect(screen.getByText("48,000,000 ducats")).toBeInTheDocument();
    expect(screen.getByText("Ships")).toBeInTheDocument();
    expect(screen.getByText(knownListing.description)).toBeInTheDocument();
    expect(screen.getAllByText("PortRoyalShipwright").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("Port Royal").length).toBeGreaterThan(0);
    expect(screen.getByText("Server")).toBeInTheDocument();
    expect(screen.getByText("Maris")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(
      screen.getByText("Message through the harbor office."),
    ).toBeInTheDocument();
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

  it("renders a responsive image in place of the emoji when available", async () => {
    repository.get.mockResolvedValue({
      ...knownListing,
      imageUrl: "https://example.com/listings/frigate.webp",
    });
    renderApp("/listings/adventurer-frigate");

    const image = await screen.findByRole("img", {
      name: "Adventurer Frigate listing image",
    });
    expect(image).toHaveAttribute(
      "src",
      "https://example.com/listings/frigate.webp",
    );
    expect(image.className).toContain("max-h-96");
    expect(image.className).toContain("w-full");
    expect(image.className).toContain("object-contain");
    expect(
      screen.queryByRole("img", { name: "Adventurer Frigate visual" }),
    ).not.toBeInTheDocument();
  });

  it("shows a clear not-found state for an unknown listing id", async () => {
    repository.get.mockResolvedValue(undefined);
    renderApp("/listings/missing-listing");

    expect(
      await screen.findByRole("heading", { name: "Listing not found" }),
    ).toBeInTheDocument();
    expect(repository.get).toHaveBeenCalledWith("missing-listing");
    expect(
      screen.getByText(/not available from the active repository/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse listings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Post your own listing" }),
    ).toBeInTheDocument();
  });

  it("shows an expired notice while retaining the listing", async () => {
    repository.get.mockResolvedValue({
      ...knownListing,
      expiresAt: "2026-10-04T14:00:00Z",
    });
    renderApp("/listings/adventurer-frigate");

    expect(
      await screen.findByRole("heading", { name: "Adventurer Frigate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("This listing has expired")).toBeInTheDocument();
    expect(
      screen.getByText(/It expired on October 4, 2026/),
    ).toBeInTheDocument();
    expect(screen.getByText(knownListing.description)).toBeInTheDocument();
    expect(screen.getByText("48,000,000 ducats")).toBeInTheDocument();
  });

  it("shows a SOLD badge when the listing has sold", async () => {
    repository.get.mockResolvedValue({
      ...knownListing,
      soldAt: "2026-10-05T10:00:00Z",
    });
    renderApp("/listings/adventurer-frigate");

    expect(
      await screen.findByRole("heading", { name: "Adventurer Frigate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SOLD")).toBeInTheDocument();
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
      screen.getByText("44,160,000 ducats – 56,640,000 ducats"),
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
      screen.getByText("Dock installation · 1,200,000 ducats"),
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
    expect(screen.getByText("1,440,000 ducats")).toBeInTheDocument();
    expect(screen.getByText("480,000 ducats")).toBeInTheDocument();
    expect(screen.getByText("49,920,000 ducats")).toBeInTheDocument();
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

  it("hides the contact section when the note is blank", async () => {
    repository.get.mockResolvedValue({ ...knownListing, contactNote: "   " });
    renderApp("/listings/adventurer-frigate");

    await screen.findByRole("heading", { name: "Adventurer Frigate" });
    expect(
      screen.queryByRole("heading", { name: "Contact" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Message through the harbor office."),
    ).not.toBeInTheDocument();
  });

  it("renders null-price presentations without fake numeric valuations", async () => {
    const tradeListing: Listing = {
      ...knownListing,
      id: "barter-cargo",
      title: "Barter Cargo",
      price: null,
      currency: "trade",
    };
    repository.get.mockResolvedValue(tradeListing);

    const expectations = [
      {
        variant: "legacy",
        heading: "Heritage & provenance",
        text: "Value established through direct negotiation",
      },
      {
        variant: "equipment",
        heading: "Component specifications",
        text: "Agreed with the seller",
      },
      {
        variant: "trade",
        heading: "Trade valuation & negotiation",
        text: "Recorded in the final exchange agreement",
      },
    ] as const;

    for (const expected of expectations) {
      renderApp(`/listings/barter-cargo?variant=${expected.variant}`);
      expect(
        await screen.findByRole("heading", { name: expected.heading }),
      ).toBeInTheDocument();
      expect(screen.getByText(expected.text)).toBeInTheDocument();
      expect(screen.getAllByText("Trade").length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/^nan$/i)).toHaveLength(0);
      cleanup();
    }
  });
});
