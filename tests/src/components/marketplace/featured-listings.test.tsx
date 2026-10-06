import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { FeaturedListings } from "../../../../src/components/marketplace/featured-listings";
import type { Listing } from "../../../../src/types/listing";

function createListing(
  overrides: Pick<Listing, "id" | "title"> & Partial<Listing>,
): Listing {
  return {
    category: "ships",
    price: 48_000_000,
    currency: "ducats",
    description: "A dependable adventure frigate.",
    seller: "PortRoyalShipwright",
    location: "Port Royal",
    server: "Maris",
    contactNote: "Contact in game.",
    imageEmoji: "🚢",
    createdAt: "2026-10-04T14:00:00Z",
    expiresAt: "2026-10-18T14:00:00Z",
    ...overrides,
  };
}

describe("FeaturedListings", () => {
  afterEach(cleanup);

  it("exposes loading state text to assistive technology", () => {
    render(
      <MemoryRouter>
        <FeaturedListings listings={[]} loading />
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading featured listings/i)).toBeInTheDocument();
  });

  it("renders a safe empty state with a posting action", () => {
    render(
      <MemoryRouter>
        <FeaturedListings listings={[]} loading={false} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /no listings are ready yet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /post the first listing/i }),
    ).toHaveAttribute("href", "/post");
  });

  it("formats numeric and non-numeric listing prices safely", () => {
    render(
      <MemoryRouter>
        <FeaturedListings
          loading={false}
          listings={[
            createListing({
              id: "numeric-listing",
              title: "Adventurer Frigate",
            }),
            createListing({
              id: "trade-listing",
              title: "Cargo Barter",
              price: null,
              currency: "trade",
            }),
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("48,000,000 ducats")).toBeInTheDocument();
    expect(screen.getByText("Trade")).toBeInTheDocument();
    expect(screen.queryByText(/nan/i)).not.toBeInTheDocument();
  });
});
