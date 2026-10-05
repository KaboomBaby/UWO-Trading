import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { ListingCard } from "../../../../src/components/listings/listing-card";
import type { Listing } from "../../../../src/types/listing";

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
    expect(link).toHaveTextContent("48,000,000 gold");
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
});
