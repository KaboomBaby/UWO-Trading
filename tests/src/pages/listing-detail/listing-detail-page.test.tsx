import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ListingRepositoryProvider } from "../../../../src/lib/listing-repository-context";
import { ListingDetailPage } from "../../../../src/pages/listing-detail/listing-detail-page";
import type { Listing } from "../../../../src/types/listing";
import { testShipDetailsWithSkills } from "../../fixtures/ship-details";
import { testEquipmentDetails } from "../../fixtures/equipment-details";

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  createOffer: vi.fn(),
  listOffers: vi.fn(),
  countOffers: vi.fn(),
  report: vi.fn(),
}));

vi.mock("../../../../src/services/listing-service", async () => ({
  ...(await vi.importActual<object>(
    "../../../../src/services/listing-service",
  )),
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

async function fillValidOffer(
  user: ReturnType<typeof userEvent.setup>,
  options: { currency?: string; includeContact?: boolean } = {},
) {
  await user.type(screen.getByLabelText("Your in-game name"), "HarborTrader");
  if (options.includeContact ?? true) {
    await user.type(
      screen.getByLabelText(/contact details \(optional\)/i),
      "In-game mail: HarborTrader",
    );
  }
  if (options.currency) {
    await user.selectOptions(
      screen.getByLabelText("Offer currency"),
      options.currency,
    );
  }
  const amount = screen.queryByLabelText(/Amount \(/);
  if (amount) {
    await user.type(amount, "45000000");
  }
  await user.type(
    screen.getByLabelText("Your offer"),
    "Ready to purchase immediately at the harbor.",
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
    repository.countOffers.mockResolvedValue(0);
    repository.createOffer.mockResolvedValue(undefined);
    repository.report.mockResolvedValue(undefined);
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

  it("renders the complete game-style ship specification panel", async () => {
    repository.get.mockResolvedValueOnce({
      ...knownListing,
      shipDetails: testShipDetailsWithSkills,
    });
    const { container } = renderApp("/listings/adventurer-frigate");

    expect(
      await screen.findByRole("heading", {
        name: "Adventurer Frigate (Heavy)",
      }),
    ).toBeInTheDocument();
    const art = container.querySelector<HTMLImageElement>(
      "[data-ship-art='galley']",
    );
    expect(art).toHaveAttribute("src", "/ship-art/galley.webp");
    expect(art).toHaveClass("object-cover");
    expect(
      screen.getByText("Grade 7 (High Speed Cargo Ship)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Vertical sail")).toBeInTheDocument();
    expect(screen.getAllByText("180").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Horizontal sail")).toBeInTheDocument();
    expect(screen.getByText("420")).toBeInTheDocument();
    expect(screen.getByText("28 / 5")).toBeInTheDocument();
    expect(screen.getByText("Sailors required")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.queryByText("Req. building days")).not.toBeInTheDocument();
    expect(screen.queryByText("Required hull")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Large Flush Deck Style Hull"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Enhance Ship Handling")).toBeInTheDocument();
    expect(screen.getByText("Emergency Acceleration")).toBeInTheDocument();
    expect(screen.getAllByText("Original").length).toBeGreaterThanOrEqual(1);
  });

  it("renders a ship ticket with its badge and explanation instead of the stat panel", async () => {
    repository.get.mockResolvedValueOnce({
      ...knownListing,
      title: "Galleon Ticket",
      shipDetails: { type: "battle", isTicket: true, ticketNumber: 407 },
    });
    renderApp("/listings/adventurer-frigate");

    expect(
      await screen.findByRole("heading", { name: "Galleon Ticket" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SHIP TICKET")).toBeInTheDocument();
    expect(
      screen.getByText("Ship Exchange Ticket (No.407)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "An unopened ship ticket — a consumable that gives this ship when opened.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Ship specifications"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Vertical sail")).not.toBeInTheDocument();
  });

  it("renders only the provided stats for a partial listing and hides a blank description", async () => {
    repository.get.mockResolvedValueOnce({
      ...knownListing,
      description: "",
      shipDetails: {
        type: "trade",
        shipClass: "heavy",
        performance: { verticalSail: 180 },
      },
    });
    renderApp("/listings/adventurer-frigate");

    expect(
      await screen.findByRole("heading", {
        name: "Adventurer Frigate (Heavy)",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Vertical sail")).toBeInTheDocument();
    expect(screen.getByText("180")).toBeInTheDocument();
    expect(screen.queryByText("Row power")).not.toBeInTheDocument();
    expect(screen.queryByText("Ship hold")).not.toBeInTheDocument();
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
  });

  it("renders the equipment panel with the game's tooltip stats", async () => {
    repository.get.mockResolvedValueOnce({
      ...knownListing,
      id: "celestial-purple-changpao",
      title: "Celestial Purple Changpao",
      category: "equipment",
      shipDetails: null,
      equipmentDetails: testEquipmentDetails,
    });
    renderApp("/listings/celestial-purple-changpao");

    expect(
      await screen.findByRole("heading", {
        name: "Celestial Purple Changpao",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Equipment specifications"),
    ).toBeInTheDocument();
    expect(screen.getByText("Worn by: ♂ Male")).toBeInTheDocument();
    expect(screen.getByText("102/100")).toBeInTheDocument();
    expect(screen.getByText("Formality")).toBeInTheDocument();
    expect(screen.getByText("Attack Power")).toBeInTheDocument();
    expect(screen.getByText("55")).toBeInTheDocument();
    expect(screen.getByText("Defence Power")).toBeInTheDocument();
    expect(screen.getByText("110")).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Management Technique")).toBeInTheDocument();
    expect(screen.getAllByText("+3")).toHaveLength(3);
    expect(screen.getByText("Reduce Supply Consumption")).toBeInTheDocument();
    expect(screen.getByText("Rank 8")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Ship specifications"),
    ).not.toBeInTheDocument();
  });

  it("renders only the provided stats for a partial equipment listing", async () => {
    repository.get.mockResolvedValueOnce({
      ...knownListing,
      id: "battle-hardened-horn-bow",
      title: "Battle-Hardened Horn Bow",
      category: "equipment",
      shipDetails: null,
      equipmentDetails: { attackPower: 142, weaponCategory: "Bow" },
    });
    renderApp("/listings/battle-hardened-horn-bow");

    expect(
      await screen.findByRole("heading", {
        name: "Battle-Hardened Horn Bow",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Weapon Category: Bow")).toBeInTheDocument();
    expect(screen.getByText("Attack Power")).toBeInTheDocument();
    expect(screen.getByText("142")).toBeInTheDocument();
    expect(screen.queryByText("Durability")).not.toBeInTheDocument();
    expect(screen.queryByText("Formality")).not.toBeInTheDocument();
    expect(screen.queryByText("Skill bonuses")).not.toBeInTheDocument();
  });

  it("renders legacy rows while ignoring retired shipbuilding fields", async () => {
    const legacyShipDetails = {
      ...testShipDetailsWithSkills,
      buildingDays: 99,
      requiredHull: "Legacy Flush Deck Style Hull",
    };
    repository.get.mockResolvedValueOnce({
      ...knownListing,
      shipDetails: legacyShipDetails,
    });
    renderApp("/listings/adventurer-frigate");

    expect(
      await screen.findByRole("heading", {
        name: "Adventurer Frigate (Heavy)",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Durability")).toBeInTheDocument();
    expect(screen.queryByText("Req. building days")).not.toBeInTheDocument();
    expect(screen.queryByText("Required hull")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Legacy Flush Deck Style Hull"),
    ).not.toBeInTheDocument();
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
    expect(
      await screen.findByText("This listing has expired"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/It expired on October 4, 2026/),
    ).toBeInTheDocument();
    expect(screen.getByText(knownListing.description)).toBeInTheDocument();
    expect(screen.getByText("48,000,000 ducats")).toBeInTheDocument();
    expect(
      screen.getByText("This listing is no longer accepting new offers."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Make an offer form" }),
    ).not.toBeInTheDocument();
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
    expect(
      screen.getByText("This listing is no longer accepting new offers."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Make an offer form" }),
    ).not.toBeInTheDocument();
  });

  it("shows only the public aggregate offer count", async () => {
    repository.countOffers.mockResolvedValue(3);
    renderApp("/listings/adventurer-frigate");

    expect(
      await screen.findByText("3 offers received so far."),
    ).toBeInTheDocument();
    expect(repository.countOffers).toHaveBeenCalledWith("adventurer-frigate");
    expect(repository.listOffers).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Only the offer count is public. Individual offer details stay private between each buyer and the seller.",
      ),
    ).toBeInTheDocument();
  });

  it("validates required offer fields before submission without requiring contact", async () => {
    const user = userEvent.setup({ delay: null });
    renderApp("/listings/adventurer-frigate");

    await screen.findByRole("heading", { name: "Adventurer Frigate" });
    await user.click(screen.getByRole("button", { name: "Send offer" }));

    expect(
      screen.getByText("In-game name must be at least 2 characters."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Amount is required for this currency."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Describe your offer in at least 10 characters."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Please fix 3 fields below before sending this offer./,
    );
    expect(
      screen.queryByText("Contact details are required."),
    ).not.toBeInTheDocument();
    expect(repository.createOffer).not.toHaveBeenCalled();
  });

  it("submits a numeric offer with blank optional contact details", async () => {
    const user = userEvent.setup({ delay: null });
    renderApp("/listings/adventurer-frigate");

    await screen.findByRole("heading", { name: "Adventurer Frigate" });
    expect(
      screen.getByLabelText(/contact details \(optional\)/i),
    ).not.toHaveAttribute("required");
    await fillValidOffer(user, { includeContact: false });
    await user.click(screen.getByRole("button", { name: "Send offer" }));

    expect(
      await screen.findByText(/Your offer was sent to PortRoyalShipwright./),
    ).toBeInTheDocument();
    expect(repository.createOffer).toHaveBeenCalledWith("adventurer-frigate", {
      offererName: "HarborTrader",
      contact: "",
      currency: "ducats",
      amount: 45_000_000,
      offerText: "Ready to purchase immediately at the harbor.",
    });
    expect(repository.countOffers).toHaveBeenCalledTimes(2);
    expect(repository.listOffers).not.toHaveBeenCalled();
  });

  it("hides the amount field and submits null for trade offers", async () => {
    const user = userEvent.setup({ delay: null });
    renderApp("/listings/adventurer-frigate");

    await screen.findByRole("heading", { name: "Adventurer Frigate" });
    await fillValidOffer(user, { currency: "trade" });
    expect(screen.queryByLabelText(/Amount \(/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send offer" }));

    expect(
      await screen.findByText(/Your offer was sent to PortRoyalShipwright./),
    ).toBeInTheDocument();
    expect(repository.createOffer).toHaveBeenCalledWith("adventurer-frigate", {
      offererName: "HarborTrader",
      contact: "In-game mail: HarborTrader",
      currency: "trade",
      amount: null,
      offerText: "Ready to purchase immediately at the harbor.",
    });
  });

  it("requires a reporter name and reason before reporting", async () => {
    const user = userEvent.setup({ delay: null });
    renderApp("/listings/adventurer-frigate");

    await screen.findByRole("heading", { name: "Adventurer Frigate" });
    await user.click(
      screen.getByRole("button", { name: "Report this listing" }),
    );
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    expect(
      screen.getByText("Reporter name must be at least 2 characters."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose a reason for this report."),
    ).toBeInTheDocument();
    expect(repository.report).not.toHaveBeenCalled();
  });

  it("submits a report and keeps report data confidential", async () => {
    const user = userEvent.setup({ delay: null });
    renderApp("/listings/adventurer-frigate");

    await screen.findByRole("heading", { name: "Adventurer Frigate" });
    await user.click(
      screen.getByRole("button", { name: "Report this listing" }),
    );
    await user.type(screen.getByLabelText("Your name"), "Port Observer");
    await user.selectOptions(screen.getByLabelText("Reason"), "spam");
    await user.type(
      screen.getByLabelText("Details (optional)"),
      "This listing duplicates another harbor post.",
    );
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    expect(
      await screen.findByText(
        "Thank you. Your report was submitted for review.",
      ),
    ).toBeInTheDocument();
    expect(repository.report).toHaveBeenCalledWith("adventurer-frigate", {
      reporterName: "Port Observer",
      reason: "spam",
      details: "This listing duplicates another harbor post.",
    });
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/This listing duplicates another harbor post./),
    ).not.toBeInTheDocument();
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
