import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../../../src/app";
import type { Listing, Offer } from "../../../../src/types/listing";
import {
  testShipDetails,
  testShipDetailsWithSkills,
} from "../../fixtures/ship-details";

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  listOwned: vi.fn(),
  updateOwned: vi.fn(),
  markSoldOwned: vi.fn(),
  renewOwned: vi.fn(),
  deleteOwned: vi.fn(),
  findByEditCode: vi.fn(),
  update: vi.fn(),
  markSold: vi.fn(),
  renew: vi.fn(),
  delete: vi.fn(),
  listOffers: vi.fn(),
  acceptOffer: vi.fn(),
  declineOffer: vi.fn(),
  listOffersOwned: vi.fn(),
  acceptOwnedOffer: vi.fn(),
  declineOwnedOffer: vi.fn(),
}));

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/services/listing-service", () => ({
  createLocalListingRepository: () => repository,
  createSupabaseListingRepository: () => repository,
}));

vi.mock("../../../../src/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children?: ReactNode }) => children,
  useAuth: useAuthMock,
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
  imageEmoji: "🚢",
  shipDetails: testShipDetails,
  createdAt: "2026-09-20T12:00:00Z",
  expiresAt: "2026-10-04T12:00:00Z",
  soldAt: null,
  collection: "current",
};

const pendingDucatOffer: Offer = {
  id: "offer-ducat",
  listingId: expiredListing.id,
  offererName: "Captain Silver",
  contact: "In-game mail to Captain Silver",
  currency: "ducats",
  amount: 45_500_000,
  offerText: "I can pay immediately after the Lisbon inspection.",
  status: "pending",
  createdAt: "2026-10-05T09:30:00Z",
};

const acceptedTradeOffer: Offer = {
  id: "offer-trade",
  listingId: expiredListing.id,
  offererName: "Harbor Trader",
  contact: "Maris port office, berth 12",
  currency: "trade",
  amount: null,
  offerText: "A fitted cannon set and two navigation charts.",
  status: "accepted",
  createdAt: "2026-10-04T15:00:00Z",
};

const declinedNegotiableOffer: Offer = {
  id: "offer-negotiable",
  listingId: expiredListing.id,
  offererName: "Port Broker",
  contact: "Message through the market office",
  currency: "negotiable",
  amount: null,
  offerText: "Let me know what flexibility you have on timing.",
  status: "declined",
  createdAt: "2026-10-03T18:45:00Z",
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

describe("manage listings page", { timeout: 10_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      email: "owner@example.com",
      isInitializing: false,
      isSupabaseEnabled: true,
      register: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      userId: "player-account-1",
    });
    repository.listOwned.mockResolvedValue([]);
    repository.findByEditCode.mockResolvedValue(expiredListing);
    repository.update.mockResolvedValue(expiredListing);
    repository.markSold.mockResolvedValue(expiredListing);
    repository.renew.mockResolvedValue(expiredListing);
    repository.delete.mockResolvedValue(undefined);
    repository.listOffers.mockResolvedValue([]);
    repository.updateOwned.mockResolvedValue(expiredListing);
    repository.markSoldOwned.mockResolvedValue(expiredListing);
    repository.renewOwned.mockResolvedValue(expiredListing);
    repository.deleteOwned.mockResolvedValue(undefined);
    repository.listOffersOwned.mockResolvedValue([]);
    repository.acceptOffer.mockResolvedValue(pendingDucatOffer);
    repository.declineOffer.mockResolvedValue(pendingDucatOffer);
    repository.acceptOwnedOffer.mockResolvedValue(pendingDucatOffer);
    repository.declineOwnedOffer.mockResolvedValue(pendingDucatOffer);
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
    expect(screen.getByText("Your account listings")).toBeInTheDocument();
    expect(screen.getByText("Legacy edit-code lookup")).toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  it("automatically lists owner listings and loads offers through owner paths", async () => {
    const user = userEvent.setup({ delay: null });
    repository.listOwned.mockResolvedValueOnce([
      { ...expiredListing, ownerId: "player-account-1" },
    ]);
    repository.listOffersOwned.mockResolvedValueOnce([pendingDucatOffer]);
    renderManagePage();

    expect(
      await screen.findByRole("heading", { name: "Adventurer Frigate" }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Expired/)).toBeInTheDocument();
    expect(repository.listOwned).toHaveBeenCalledWith("player-account-1");

    await user.click(screen.getByRole("button", { name: "Manage listing" }));
    expect(await screen.findByText("Captain Silver")).toBeInTheDocument();
    expect(repository.listOffersOwned).toHaveBeenCalledWith(
      "player-account-1",
      expiredListing.id,
    );
    expect(repository.findByEditCode).not.toHaveBeenCalled();
  });

  it("manages an owner listing without an edit code", async () => {
    const user = userEvent.setup({ delay: null });
    const ownedListing = { ...expiredListing, ownerId: "player-account-1" };
    repository.listOwned.mockResolvedValue([ownedListing]);
    repository.updateOwned.mockResolvedValueOnce({
      ...ownedListing,
      title: "Updated Adventurer Frigate",
    });
    repository.markSoldOwned.mockResolvedValueOnce({
      ...ownedListing,
      soldAt: "2026-10-06T12:00:00Z",
    });
    repository.renewOwned.mockResolvedValueOnce({
      ...ownedListing,
      expiresAt: "2026-10-20T12:00:00Z",
    });
    repository.deleteOwned.mockResolvedValueOnce(undefined);
    renderManagePage();

    await user.click(
      await screen.findByRole("button", { name: "Manage listing" }),
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    // The summary loads from the repository without a legacy code lookup.
    expect(repository.findByEditCode).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Mark SOLD" }));
    expect(
      await screen.findByText("Listing marked as SOLD."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Renew (+14 days)" }));
    expect(
      await screen.findByText("Listing renewed for 14 more days."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete listing" }));
    await user.click(
      screen.getByRole("button", { name: "Yes, delete this listing" }),
    );
    expect(repository.updateOwned).toHaveBeenCalledWith(
      expiredListing.id,
      "player-account-1",
      expect.objectContaining({ title: expiredListing.title }),
    );
    expect(repository.markSoldOwned).toHaveBeenCalledWith(
      expiredListing.id,
      "player-account-1",
    );
    expect(repository.renewOwned).toHaveBeenCalledWith(
      expiredListing.id,
      "player-account-1",
    );
    expect(repository.deleteOwned).toHaveBeenCalledWith(
      expiredListing.id,
      "player-account-1",
    );
  });

  it("accepts and declines owner-path offers", async () => {
    const user = userEvent.setup({ delay: null });
    const ownedListing = { ...expiredListing, ownerId: "player-account-1" };
    const secondOffer: Offer = {
      ...pendingDucatOffer,
      id: "offer-second",
      offererName: "Second Mate",
    };
    repository.listOwned.mockResolvedValue([ownedListing]);
    repository.listOffersOwned.mockResolvedValue([
      pendingDucatOffer,
      secondOffer,
    ]);
    repository.acceptOwnedOffer.mockResolvedValueOnce({
      ...pendingDucatOffer,
      status: "accepted",
    });
    repository.declineOwnedOffer.mockResolvedValueOnce({
      ...secondOffer,
      status: "declined",
    });
    renderManagePage();

    await user.click(
      await screen.findByRole("button", { name: "Manage listing" }),
    );
    expect(await screen.findByText("Captain Silver")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Accept offer from Captain Silver" }),
    );
    expect(
      await screen.findByText("Offer from Captain Silver accepted."),
    ).toBeInTheDocument();
    expect(repository.acceptOwnedOffer).toHaveBeenCalledWith(
      "player-account-1",
      expiredListing.id,
      pendingDucatOffer.id,
    );

    await user.click(
      screen.getByRole("button", { name: "Decline offer from Second Mate" }),
    );
    expect(
      await screen.findByText("Offer from Second Mate declined."),
    ).toBeInTheDocument();
    expect(repository.declineOwnedOffer).toHaveBeenCalledWith(
      "player-account-1",
      expiredListing.id,
      secondOffer.id,
    );
  });

  it("shows loading and a clear error for a missing or invalid edit code", async () => {
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
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
      imageEmoji: "⛵",
      collection: "legacy",
      shipDetails: testShipDetails,
    });
    expect(
      await screen.findByText("Updated Adventurer Frigate"),
    ).toBeInTheDocument();
  });

  it("edits a ship ticket listing without demanding stats", async () => {
    const user = userEvent.setup({ delay: null });
    const ticketListing: Listing = {
      ...expiredListing,
      title: "Galleon Ticket",
      shipDetails: { type: "battle", isTicket: true, ticketNumber: 407 },
    };
    repository.findByEditCode.mockResolvedValueOnce(ticketListing);
    repository.update.mockResolvedValueOnce({
      ...ticketListing,
      shipDetails: { type: "battle", isTicket: true, ticketNumber: 512 },
    });
    renderManagePage();
    await user.type(screen.getByLabelText("Edit code"), editCode);
    await user.click(screen.getByRole("button", { name: "Find listing" }));
    expect(await screen.findByText("Galleon Ticket")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Ship ticket" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByLabelText("Grade")).not.toBeInTheDocument();
    const ticketNumberField = screen.getByLabelText(/Ticket No\./);
    expect(ticketNumberField).toHaveValue(407);

    await user.clear(ticketNumberField);
    await user.type(ticketNumberField, "512");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    expect(repository.update).toHaveBeenCalledWith(
      editCode,
      expect.objectContaining({
        shipDetails: { type: "battle", isTicket: true, ticketNumber: 512 },
      }),
    );
  });

  it("reflects repository errors from an attempted save", async () => {
    const user = userEvent.setup({ delay: null });
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

  it("loads and displays private offers for the managed listing", async () => {
    const user = userEvent.setup({ delay: null });
    repository.listOffers.mockResolvedValueOnce([
      pendingDucatOffer,
      acceptedTradeOffer,
      { ...declinedNegotiableOffer, contact: "" },
    ]);
    renderManagePage();
    await loadListing(user);

    expect(repository.listOffers).toHaveBeenCalledWith(editCode);
    expect(await screen.findByText("Captain Silver")).toBeInTheDocument();
    expect(
      screen.getByText("In-game mail to Captain Silver"),
    ).toBeInTheDocument();
    expect(screen.getByText("45,500,000 ducats")).toBeInTheDocument();
    expect(
      screen.getByText("I can pay immediately after the Lisbon inspection."),
    ).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("October 5, 2026")).toBeInTheDocument();

    expect(screen.getByText("Harbor Trader")).toBeInTheDocument();
    expect(screen.getAllByText("Trade").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Accepted")).toBeInTheDocument();

    expect(screen.getByText("Port Broker")).toBeInTheDocument();
    expect(screen.getByText("In-game name only")).toBeInTheDocument();
    expect(screen.getAllByText("Negotiable").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Declined")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept offer from Captain Silver" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Decline offer from Captain Silver" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Accept offer from Harbor Trader/ }),
    ).not.toBeInTheDocument();
  });

  it("shows selected ship skills with their game icons and Original marker", async () => {
    const user = userEvent.setup({ delay: null });
    repository.findByEditCode.mockResolvedValueOnce({
      ...expiredListing,
      shipDetails: testShipDetailsWithSkills,
    });
    renderManagePage();
    await user.type(screen.getByLabelText("Edit code"), editCode);
    await user.click(screen.getByRole("button", { name: "Find listing" }));

    expect(
      (await screen.findAllByText("Enhance Ship Handling")).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Emergency Acceleration").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Original").length).toBeGreaterThanOrEqual(1);
    expect(document.querySelectorAll("img").length).toBeGreaterThanOrEqual(6);
  });

  it("shows accessible offer loading and load-error states, then refreshes offers", async () => {
    const user = userEvent.setup({ delay: null });
    let rejectOffers!: (reason?: unknown) => void;
    repository.listOffers.mockReturnValueOnce(
      new Promise<Offer[]>((_resolve, reject) => {
        rejectOffers = reject;
      }),
    );
    renderManagePage();
    await user.type(screen.getByLabelText("Edit code"), editCode);
    await user.click(screen.getByRole("button", { name: "Find listing" }));

    expect(await screen.findByText("Adventurer Frigate")).toBeInTheDocument();
    expect(
      screen.getAllByRole("status").map((element) => element.textContent),
    ).toContain("Loading offers…");

    rejectOffers(new Error("Offer permissions expired."));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load offers: Offer permissions expired.",
    );

    repository.listOffers.mockResolvedValueOnce([pendingDucatOffer]);
    await user.click(screen.getByRole("button", { name: "Refresh offers" }));

    expect(await screen.findByText("Captain Silver")).toBeInTheDocument();
    expect(repository.listOffers).toHaveBeenCalledTimes(2);
    expect(repository.listOffers).toHaveBeenNthCalledWith(1, editCode);
    expect(repository.listOffers).toHaveBeenNthCalledWith(2, editCode);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("accepts and declines pending offers with returned statuses", async () => {
    const user = userEvent.setup({ delay: null });
    const pendingSecondOffer: Offer = {
      ...pendingDucatOffer,
      id: "offer-second",
      offererName: "Second Mate",
      contact: "Second Mate's market mailbox",
      offerText: "I can gather the remainder by tomorrow.",
    };
    repository.listOffers.mockResolvedValueOnce([
      pendingDucatOffer,
      pendingSecondOffer,
    ]);
    repository.acceptOffer.mockResolvedValueOnce({
      ...pendingDucatOffer,
      status: "accepted",
    });
    repository.declineOffer.mockResolvedValueOnce({
      ...pendingSecondOffer,
      status: "declined",
    });
    renderManagePage();
    await loadListing(user);

    await user.click(
      screen.getByRole("button", { name: "Accept offer from Captain Silver" }),
    );
    expect(repository.acceptOffer).toHaveBeenCalledWith(
      editCode,
      pendingDucatOffer.id,
    );
    expect(
      await screen.findByText("Offer from Captain Silver accepted."),
    ).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Accept offer from Captain Silver",
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Decline offer from Second Mate" }),
    );
    expect(repository.declineOffer).toHaveBeenCalledWith(
      editCode,
      pendingSecondOffer.id,
    );
    expect(
      await screen.findByText("Offer from Second Mate declined."),
    ).toBeInTheDocument();
    expect(screen.getByText("Declined")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /offer from (Captain Silver|Second Mate)/,
      }),
    ).not.toBeInTheDocument();
  });

  it("reflects offer-action errors without losing pending controls", async () => {
    const user = userEvent.setup({ delay: null });
    repository.listOffers.mockResolvedValueOnce([pendingDucatOffer]);
    repository.acceptOffer.mockRejectedValueOnce(
      new Error("Only pending offers can be accepted."),
    );
    renderManagePage();
    await loadListing(user);

    await user.click(
      screen.getByRole("button", { name: "Accept offer from Captain Silver" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to accept this offer: Only pending offers can be accepted.",
    );
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept offer from Captain Silver" }),
    ).toBeInTheDocument();
    expect(repository.declineOffer).not.toHaveBeenCalled();
  });

  it("marks an expired listing sold and renews it for fourteen days", async () => {
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
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
