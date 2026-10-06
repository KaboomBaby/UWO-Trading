import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "../../../../src/pages/home/home-page";
import type { Listing } from "../../../../src/types/listing";

const listMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/lib/listing-repository-context", () => ({
  useListingRepository: () => ({ list: listMock }),
}));

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <HomePage />
    </MemoryRouter>,
  );
}

function createListing(
  overrides: Partial<Listing> & Pick<Listing, "id" | "title">,
): Listing {
  return {
    category: "ships",
    price: 1_250_000,
    currency: "ducats",
    description: "A fast merchant ship with strong cargo capacity.",
    seller: "Captain Aurora",
    location: "Lisbon",
    server: "Maris",
    contactNote: "Contact in game.",
    imageEmoji: "⛵",
    createdAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("HomePage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    listMock.mockReset();
  });

  it("renders hero actions and category shortcuts with the correct destinations", async () => {
    listMock.mockResolvedValue([]);
    renderHome();

    expect(
      screen.getByRole("link", { name: "Browse marketplace" }),
    ).toHaveAttribute("href", "/browse");
    expect(
      screen.getByRole("link", { name: "Post a listing" }),
    ).toHaveAttribute("href", "/post");

    const expectedCategories = [
      ["Ships", "ships"],
      ["Property", "property"],
      ["Equipment", "equipment"],
      ["Resources", "resources"],
      ["Services", "services"],
    ] as const;

    for (const [name, slug] of expectedCategories) {
      expect(
        screen.getByRole("link", { name: new RegExp(`browse ${name}`, "i") }),
      ).toHaveAttribute("href", `/browse?category=${slug}`);
    }

    await waitFor(() =>
      expect(
        screen.getByText(/no listings are ready yet/i),
      ).toBeInTheDocument(),
    );
  });

  it("loads the three newest listings through the listing repository", async () => {
    const listings = [
      createListing({ id: "newest", title: "Newest Merchant Ship" }),
      createListing({ id: "middle", title: "Recent Port Warehouse" }),
      createListing({
        id: "third",
        title: "Fresh Cargo Haul",
        category: "resources",
      }),
      createListing({ id: "older", title: "Older Offer" }),
    ];
    listMock.mockResolvedValue(listings);

    renderHome();

    await waitFor(() =>
      expect(screen.getByText("Newest Merchant Ship")).toBeInTheDocument(),
    );
    expect(listMock).toHaveBeenCalledWith({ sort: "newest" });
    expect(screen.getByText("Recent Port Warehouse")).toBeInTheDocument();
    expect(screen.getByText("Fresh Cargo Haul")).toBeInTheDocument();
    expect(screen.queryByText("Older Offer")).not.toBeInTheDocument();
  });

  it("renders a safe empty state when the repository returns no listings", async () => {
    listMock.mockResolvedValue([]);
    renderHome();

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /no listings are ready yet/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("link", { name: "Post the first listing" }),
    ).toHaveAttribute("href", "/post");
  });
});
