import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CommerceRepositoryProvider } from "../../../../../src/lib/commerce-repository-context";
import { GuildStorefrontPage } from "../../../../../src/pages/guilds/storefront/guild-storefront-page";
import type { GuildStorefront } from "../../../../../src/types/commerce";

const repository = vi.hoisted(() => ({
  listWishlist: vi.fn(),
  listWatchlist: vi.fn(),
  listGuildStorefronts: vi.fn(),
  listShopItems: vi.fn(),
}));

vi.mock("../../../../../src/services/commerce-service", () => ({
  createLocalCommerceRepository: () => repository,
}));

const storefronts: GuildStorefront[] = [
  {
    id: "blue-wave-traders",
    guildName: "Blue Wave Traders",
    motto: "Reliable routes, disciplined convoys.",
    homePort: "London",
    specialties: ["Convoy escorts", "European textiles", "Insurance"],
    rating: 4.8,
    completedOrders: 1_284,
    imageEmoji: "🌊",
  },
  {
    id: "golden-compass-league",
    guildName: "Golden Compass League",
    motto: "Navigation first, profit follows.",
    homePort: "Lisbon",
    specialties: ["Expeditions", "Instruments", "Training"],
    rating: 4.6,
    completedOrders: 942,
    imageEmoji: "🧭",
  },
];

function renderStorefronts(path = "/guilds/storefront") {
  const router = createMemoryRouter(
    [
      {
        path: "/guilds/storefront",
        element: (
          <CommerceRepositoryProvider>
            <GuildStorefrontPage />
          </CommerceRepositoryProvider>
        ),
      },
    ],
    { initialEntries: [path] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe("guild storefront page", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    repository.listGuildStorefronts.mockResolvedValue(storefronts);
  });

  it("initializes the search from the canonical URL parameter", async () => {
    repository.listGuildStorefronts.mockResolvedValue([storefronts[0]]);
    const router = renderStorefronts("/guilds/storefront?search=Blue%20Wave");

    expect(
      await screen.findByRole("heading", {
        name: "Blue Wave Traders",
      }),
    ).toBeInTheDocument();
    expect(repository.listGuildStorefronts).toHaveBeenCalledWith("Blue Wave");
    expect(
      screen.getByRole("searchbox", {
        name: "Search guilds, ports, mottos, and specialties",
      }),
    ).toHaveValue("Blue Wave");
    expect(
      screen.getByText("1 storefront for “Blue Wave”"),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe("?search=Blue%20Wave");
  });

  it("canonicalizes blank searches and queries the repository without a search", async () => {
    const router = renderStorefronts("/guilds/storefront?search=%20%20");

    expect(
      await screen.findByRole("heading", {
        name: "Blue Wave Traders",
      }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.search).toBe("");
    });
    expect(repository.listGuildStorefronts).toHaveBeenCalledWith(undefined);
    expect(repository.listGuildStorefronts).toHaveBeenCalledTimes(1);
  });

  it("renders guild identity, details, specialties, ratings, and order counts", async () => {
    renderStorefronts();

    expect(
      await screen.findByRole("heading", { name: "Guild storefront" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Guild storefronts" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Reliable routes, disciplined convoys."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Navigation first, profit follows."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("London")).toHaveLength(1);
    expect(screen.getAllByText("Lisbon")).toHaveLength(1);
    expect(screen.getByText("Convoy escorts")).toBeInTheDocument();
    expect(screen.getByText("Insurance")).toBeInTheDocument();
    expect(screen.getByText("Expeditions")).toBeInTheDocument();
    expect(screen.getByText("Training")).toBeInTheDocument();
    expect(screen.getByText("4.8 / 5")).toBeInTheDocument();
    expect(screen.getByText("4.6 / 5")).toBeInTheDocument();
    expect(screen.getByText("1,284 completed")).toBeInTheDocument();
    expect(screen.getByText("942 completed")).toBeInTheDocument();
    expect(screen.getByText("2 storefronts")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Blue Wave Traders emblem" }),
    ).toHaveTextContent("🌊");
    expect(
      screen.getByRole("img", { name: "Golden Compass League emblem" }),
    ).toHaveTextContent("🧭");
  });

  it("updates and canonicalizes search from the page form", async () => {
    const user = userEvent.setup();
    const router = renderStorefronts();

    await user.type(
      await screen.findByRole("searchbox", {
        name: "Search guilds, ports, mottos, and specialties",
      }),
      " Convoy escorts ",
    );
    await user.click(
      screen.getByRole("button", { name: "Search storefronts" }),
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe("?search=Convoy+escorts");
    });
    expect(repository.listGuildStorefronts).toHaveBeenLastCalledWith(
      "Convoy escorts",
    );
  });

  it("renders a useful empty state with a clear-search action", async () => {
    repository.listGuildStorefronts.mockResolvedValue([]);
    renderStorefronts("/guilds/storefront?search=Ghost");

    expect(
      await screen.findByRole("heading", {
        name: "No guild storefronts match",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 storefronts for “Ghost”")).toBeInTheDocument();
    expect(
      screen.getByText(/No guild identities, mottos, ports, or specialties/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear search" })).toHaveAttribute(
      "href",
      "/guilds/storefront",
    );
  });

  it("shows a clear repository error state", async () => {
    repository.listGuildStorefronts.mockRejectedValue(
      new Error("Guild registry unavailable."),
    );
    renderStorefronts();

    expect(
      await screen.findByRole("heading", {
        name: "Guild storefronts could not load",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Guild registry unavailable.",
    );
  });
});
