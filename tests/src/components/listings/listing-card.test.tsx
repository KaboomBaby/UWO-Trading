import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { ListingCard } from "../../../../src/components/listings/listing-card";
import type { Listing } from "../../../../src/types/listing";
import { testShipDetails } from "../../fixtures/ship-details";

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
  contactNote: "",
  imageEmoji: "🚢",
  createdAt: "2026-10-04T14:00:00Z",
  expiresAt: "2026-10-18T14:00:00Z",
};

describe("ListingCard", () => {
  afterEach(cleanup);

  it("renders listing details with a link to the listing", () => {
    render(
      <MemoryRouter>
        <ListingCard listing={listing} />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /adventurer frigate/i });
    expect(link).toHaveAttribute("href", "/listings/adventurer-frigate");
    expect(link).toHaveTextContent("Adventurer Frigate");
    expect(link).toHaveTextContent("ships");
    expect(link).toHaveTextContent("48,000,000 ducats");
    expect(link).toHaveTextContent("PortRoyalShipwright");
    expect(link).toHaveTextContent("Port Royal");
    expect(link).toHaveTextContent("🚢");
  });

  it("marks legacy listings", () => {
    render(
      <MemoryRouter>
        <ListingCard listing={{ ...listing, collection: "legacy" }} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Legacy")).toBeInTheDocument();
  });

  it("uses the selected ship type visual and summary for ship listings", () => {
    const { container } = render(
      <MemoryRouter>
        <ListingCard listing={{ ...listing, shipDetails: testShipDetails }} />
      </MemoryRouter>,
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Trade · Heavy")).toBeInTheDocument();
  });

  it("shows a SOLD badge when the listing has sold", () => {
    render(
      <MemoryRouter>
        <ListingCard
          listing={{
            ...listing,
            soldAt: "2026-10-05T10:00:00Z",
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("SOLD")).toBeInTheDocument();
  });

  it("formats every supported listing currency without inventing numeric prices", () => {
    const cases = [
      {
        currency: "UWC" as const,
        price: 1_250.5,
        expected: "1,250.5 UWC",
      },
      { currency: "CT" as const, price: 7, expected: "7 CT" },
      { currency: "trade" as const, price: null, expected: "Trade" },
      {
        currency: "negotiable" as const,
        price: null,
        expected: "Negotiable",
      },
    ];

    for (const testCase of cases) {
      cleanup();
      render(
        <MemoryRouter>
          <ListingCard
            listing={{ ...listing, ...testCase, price: testCase.price }}
          />
        </MemoryRouter>,
      );
      expect(screen.getByText(testCase.expected)).toBeInTheDocument();
      expect(screen.queryByText(/nan/i)).not.toBeInTheDocument();
    }
  });
});
