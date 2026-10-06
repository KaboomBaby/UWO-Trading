import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../../../src/app";
import type { Listing } from "../../../../src/types/listing";

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  findByEditCode: vi.fn(),
  update: vi.fn(),
  markSold: vi.fn(),
  renew: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../../../../src/services/listing-service", () => ({
  createLocalListingRepository: () => repository,
  createSupabaseListingRepository: () => repository,
}));

const editCode = "0123456789abcdef0123456789abcdef";

const expiredListing: Listing = {
  id: "adventurer-frigate",
  title: "Adventurer Frigate",
  category: "ships",
  price: 48_000_000,
  currency: "ducats",
  description: "A well-maintained frigate for profitable trade routes.",
  seller: "PortRoyalShipwright",
  location: "Port Royal",
  server: "Maris",
  contactNote: "In-game mail preferred.",
  imageUrl: "https://example.com/listings/frigate.webp",
  imageEmoji: "🚢",
  createdAt: "2026-09-20T12:00:00Z",
  expiresAt: "2026-10-04T12:00:00Z",
  soldAt: null,
  collection: "current",
};

function renderManagePage() {
  return render(
    <MemoryRouter initialEntries={["/manage"]}>
      <App />
    </MemoryRouter>,
  );
}

async function loadListing(user: ReturnType<typeof userEvent.setup>) {
  repository.findByEditCode.mockResolvedValueOnce(expiredListing);
  await user.type(screen.getByLabelText("Edit code"), editCode);
  await user.click(screen.getByRole("button", { name: "Find listing" }));
  expect(await screen.findByText("Adventurer Frigate")).toBeInTheDocument();
}

describe("manage listings page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findByEditCode.mockResolvedValue(expiredListing);
    repository.update.mockResolvedValue(expiredListing);
    repository.markSold.mockResolvedValue(expiredListing);
    repository.renew.mockResolvedValue(expiredListing);
    repository.delete.mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it("renders the manage route, navigation link, and lookup guidance", () => {
    renderManagePage();

    expect(
      screen.getByRole("heading", { name: "My listings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My listings" })).toHaveAttribute(
      "href",
      "/manage",
    );
    expect(
      screen.getByText(
        /expired listings remain available here so they can be renewed/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  it("shows loading and a clear error for a missing or invalid edit code", async () => {
    const user = userEvent.setup();
    let resolveLookup!: (listing: Listing | undefined) => void;
    repository.findByEditCode.mockReturnValueOnce(
      new Promise<Listing | undefined>((resolve) => {
        resolveLookup = resolve;
      }),
    );
    renderManagePage();

    await user.click(screen.getByRole("button", { name: "Find listing" }));
    expect(
      screen.getByText("Enter the edit code from your listing confirmation."),
    ).toBeInTheDocument();
    expect(repository.findByEditCode).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Edit code"), "not-a-real-code");
    await user.click(screen.getByRole("button", { name: "Find listing" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Finding your listing…",
    );

    resolveLookup(undefined);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No listing was found for that edit code. Check the code and try again.",
    );
    expect(repository.findByEditCode).toHaveBeenCalledWith("not-a-real-code");
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  it("keeps an expired listing editable and saves the full update payload", async () => {
    const user = userEvent.setup();
    const updatedListing: Listing = {
      ...expiredListing,
      title: "Updated Adventurer Frigate",
      currency: "UWC",
      price: 51_000_000,
      description: "A freshly maintained frigate for profitable trade routes.",
      seller: "UpdatedShipwright",
      location: "Lisbon",
      server: "Antwerp",
      contactNote: "Message before server reset.",
      imageEmoji: "⛵",
      collection: "legacy",
    };
    repository.update.mockResolvedValueOnce(updatedListing);
    renderManagePage();
    await loadListing(user);

    expect(screen.getByText("Expired")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), updatedListing.title);
    await user.selectOptions(screen.getByLabelText("Currency"), "UWC");
    await user.clear(screen.getByLabelText("Price (UWC)"));
    await user.type(screen.getByLabelText("Price (UWC)"), "51000000");
    await user.clear(screen.getByLabelText("Description"));
    await user.type(
      screen.getByLabelText("Description"),
      updatedListing.description,
    );
    await user.clear(screen.getByLabelText("Seller"));
    await user.type(screen.getByLabelText("Seller"), updatedListing.seller);
    await user.clear(screen.getByLabelText("Location"));
    await user.type(screen.getByLabelText("Location"), updatedListing.location);
    await user.clear(screen.getByLabelText("Server"));
    await user.type(screen.getByLabelText("Server"), updatedListing.server);
    await user.clear(screen.getByLabelText(/contact note/i));
    await user.type(
      screen.getByLabelText(/contact note/i),
      updatedListing.contactNote,
    );
    await user.clear(screen.getByLabelText(/emoji visual/i));
    await user.type(screen.getByLabelText(/emoji visual/i), "⛵");
    await user.selectOptions(screen.getByLabelText("Collection"), "legacy");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    expect(repository.update).toHaveBeenCalledWith(editCode, {
      title: updatedListing.title,
      category: "ships",
      currency: "UWC",
      price: 51_000_000,
      description: updatedListing.description,
      seller: updatedListing.seller,
      location: updatedListing.location,
      server: updatedListing.server,
      contactNote: updatedListing.contactNote,
      imageUrl: expiredListing.imageUrl,
      imageEmoji: "⛵",
      collection: "legacy",
    });
    expect(
      await screen.findByText("Updated Adventurer Frigate"),
    ).toBeInTheDocument();
  });

  it("reflects repository errors from an attempted save", async () => {
    const user = userEvent.setup();
    repository.update.mockRejectedValueOnce(
      new Error("Edit code is no longer valid."),
    );
    renderManagePage();
    await loadListing(user);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to save this listing: Edit code is no longer valid.",
    );
    expect(screen.queryByText("Changes saved.")).not.toBeInTheDocument();
  });

  it("marks an expired listing sold and renews it for fourteen days", async () => {
    const user = userEvent.setup();
    const soldListing: Listing = {
      ...expiredListing,
      soldAt: "2026-10-06T12:00:00Z",
    };
    const renewedListing: Listing = {
      ...soldListing,
      expiresAt: "2026-10-20T12:00:00Z",
    };
    repository.markSold.mockResolvedValueOnce(soldListing);
    repository.renew.mockResolvedValueOnce(renewedListing);
    renderManagePage();
    await loadListing(user);

    await user.click(screen.getByRole("button", { name: "Mark SOLD" }));
    expect(repository.markSold).toHaveBeenCalledWith(editCode);
    expect(
      await screen.findByText("Listing marked as SOLD."),
    ).toBeInTheDocument();
    expect(screen.getByText("October 6, 2026")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Renew (+14 days)" }));
    expect(repository.renew).toHaveBeenCalledWith(editCode);
    expect(
      await screen.findByText("Listing renewed for 14 more days."),
    ).toBeInTheDocument();
    expect(screen.getByText("October 20, 2026")).toBeInTheDocument();
  });

  it("requires explicit confirmation before deleting a listing", async () => {
    const user = userEvent.setup();
    renderManagePage();
    await loadListing(user);

    await user.click(screen.getByRole("button", { name: "Delete listing" }));
    expect(repository.delete).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", {
        name: "Delete this listing permanently?",
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Yes, delete this listing" }),
    );

    expect(repository.delete).toHaveBeenCalledWith(editCode);
    expect(
      await screen.findByRole("heading", { name: "Listing deleted" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });
});
