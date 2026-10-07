import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../../../src/app";
import type { CreatedListing } from "../../../../src/types/listing";
import { testShipDetails } from "../../fixtures/ship-details";

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  createOffer: vi.fn(),
  listOffers: vi.fn(),
  countOffers: vi.fn(),
  report: vi.fn(),
}));

vi.mock("../../../../src/services/listing-service", () => ({
  createLocalListingRepository: () => repository,
}));

const createdListing: CreatedListing = {
  id: "new-trading-schooner",
  title: "Trading Schooner",
  category: "ships",
  price: 32_000_000,
  currency: "ducats",
  description: "A swift schooner suitable for regional trade routes.",
  seller: "AmsterdamShipyard",
  location: "Amsterdam",
  server: "Maris",
  contactNote: "In-game mail preferred.",
  imageEmoji: "🚢",
  shipDetails: testShipDetails,
  createdAt: "2026-10-05T00:00:00Z",
  expiresAt: "2026-10-19T00:00:00Z",
  editCode: "UWO-EDIT-7F2K",
};

function renderPostPage() {
  return render(
    <MemoryRouter initialEntries={["/post"]}>
      <App />
    </MemoryRouter>,
  );
}

async function fillCommonFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Title"), "Trading Schooner");
  await user.selectOptions(screen.getByLabelText("Category"), "ships");
  await user.type(
    screen.getByLabelText("Description"),
    "A swift schooner suitable for regional trade routes.",
  );
  await user.type(screen.getByLabelText("Seller"), "AmsterdamShipyard");
  await user.type(screen.getByLabelText("Location"), "Amsterdam");
  await user.type(screen.getByLabelText("Server"), "Maris");
  await user.type(
    screen.getByLabelText(/contact note/i),
    "In-game mail preferred.",
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await fillCommonFields(user);
  await fillShipSpecifications(user);
  await user.selectOptions(screen.getByLabelText("Currency"), "ducats");
  await user.type(screen.getByLabelText("Price (Ducats)"), "32000000");
}

async function fillShipSpecifications(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.selectOptions(screen.getByLabelText("Ship type"), "trade");
  await user.selectOptions(screen.getByLabelText("Ship class"), "heavy");
  await user.type(screen.getByLabelText("Grade"), "7");
  await user.type(screen.getByLabelText("Ship role"), "High Speed Cargo Ship");
  await user.type(screen.getByLabelText("Vertical sail"), "180");
  await user.type(screen.getByLabelText("Horizontal sail"), "420");
  await user.type(screen.getByLabelText("Row power"), "40");
  await user.type(screen.getByLabelText("Turn speed"), "18");
  await user.type(screen.getByLabelText("Wave resistance"), "72");
  await user.type(screen.getByLabelText("Armour"), "96");
  await user.type(screen.getByLabelText("Improvements"), "28");
  await user.type(screen.getByLabelText("Durability"), "500");
  await user.type(screen.getByLabelText("Crew capacity"), "180");
  await user.type(screen.getByLabelText("Cannon capacity"), "120");
  await user.type(screen.getByLabelText("Cargo capacity"), "950");
  await user.type(screen.getByLabelText("Sailors required"), "45");
  await user.type(screen.getByLabelText("Adventure Lv"), "42");
  await user.type(screen.getByLabelText("Trade Lv"), "61");
  await user.type(screen.getByLabelText("Battle Lv"), "27");
  await user.type(screen.getByLabelText("Req. building days"), "28");
  await user.type(
    screen.getByLabelText("Required ship hull"),
    "Large Flush Deck Style Hull",
  );
}

describe("post listing page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.create.mockResolvedValue(createdListing);
    repository.get.mockResolvedValue(createdListing);
    repository.countOffers.mockResolvedValue(0);
    repository.createOffer.mockResolvedValue(undefined);
    repository.report.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("describes the active repository persistence behavior accurately", () => {
    renderPostPage();

    expect(
      screen.getByText(
        /supabase when environment credentials are present, or this browser session’s in-memory marketplace otherwise/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/supabase integration pending/i),
    ).not.toBeInTheDocument();
  });

  it("offers every supported currency with human-readable labels", () => {
    renderPostPage();

    const currencySelect = screen.getByLabelText("Currency");
    const options = within(currencySelect).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Select a currency",
      "Ducats",
      "UWC",
      "CT (Captain Tickets)",
      "Trade / Barter",
      "Negotiable",
    ]);
  });

  it("shows inline errors and does not create when fields are invalid", async () => {
    const user = userEvent.setup();
    renderPostPage();

    await user.type(screen.getByLabelText("Title"), "ab");
    await user.type(screen.getByLabelText("Description"), "Too short");
    await user.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(
      screen.getByText("Title must be at least 3 characters."),
    ).toBeInTheDocument();
    expect(screen.getByText("Category is required.")).toBeInTheDocument();
    expect(screen.getByText("Currency is required.")).toBeInTheDocument();
    expect(
      screen.getByText("Description must be at least 10 characters."),
    ).toBeInTheDocument();
    expect(screen.getByText("Seller is required.")).toBeInTheDocument();
    expect(screen.getByText("Location is required.")).toBeInTheDocument();
    expect(screen.getByText("Server is required.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/price/i)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(repository.create).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("requires a positive numeric price for numeric currencies", async () => {
    const user = userEvent.setup();
    renderPostPage();
    await fillCommonFields(user);
    await user.selectOptions(screen.getByLabelText("Currency"), "ducats");
    await user.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(screen.getByText("Price is required.")).toBeInTheDocument();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("validates Captain Tickets as whole numbers", async () => {
    const user = userEvent.setup();
    renderPostPage();
    await fillCommonFields(user);
    await user.selectOptions(
      screen.getByLabelText("Currency"),
      "CT (Captain Tickets)",
    );
    await user.type(
      screen.getByLabelText("Price (CT (Captain Tickets))"),
      "2.5",
    );
    await user.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(
      screen.getByText("Captain Tickets must be a whole number."),
    ).toBeInTheDocument();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("shows the game-style ship specification panel only for Ships", async () => {
    const user = userEvent.setup();
    renderPostPage();

    await user.selectOptions(screen.getByLabelText("Category"), "property");
    expect(screen.queryByLabelText("Ship type")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Sailing requirements"),
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Category"), "ships");
    expect(screen.getByLabelText("Ship type")).toBeInTheDocument();
    expect(screen.getByLabelText("Ship class")).toBeInTheDocument();
    expect(screen.getByLabelText("Sailors required")).toBeInTheDocument();
    expect(screen.getByLabelText("Req. building days")).toBeInTheDocument();
    expect(screen.getByLabelText("Required ship hull")).toBeInTheDocument();
  });

  it("requires complete ship specifications before creating a Ships listing", async () => {
    const user = userEvent.setup();
    renderPostPage();
    await fillValidForm(user);
    await user.clear(screen.getByLabelText("Grade"));

    await user.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(screen.getByText("Grade is required.")).toBeInTheDocument();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates a valid listing with the full repository input", async () => {
    const user = userEvent.setup();
    renderPostPage();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Trading Schooner is ready" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Trading Schooner is ready" }),
    ).toHaveFocus();
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith({
      title: "Trading Schooner",
      category: "ships",
      currency: "ducats",
      price: 32_000_000,
      description: "A swift schooner suitable for regional trade routes.",
      seller: "AmsterdamShipyard",
      location: "Amsterdam",
      server: "Maris",
      contactNote: "In-game mail preferred.",
      shipDetails: testShipDetails,
    });

    await user.click(screen.getByRole("link", { name: "View posted listing" }));
    expect(repository.get).toHaveBeenCalledWith("new-trading-schooner");
    expect(
      await screen.findByRole("heading", {
        name: /Trading Schooner \(Heavy\)/,
      }),
    ).toBeInTheDocument();
  });

  it("shows the edit code once with a recovery warning and copy support", async () => {
    const user = userEvent.setup();
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });

    try {
      renderPostPage();
      await fillValidForm(user);
      await user.click(screen.getByRole("button", { name: "Publish listing" }));

      expect(screen.getAllByText("UWO-EDIT-7F2K")).toHaveLength(1);
      expect(screen.getByRole("alert")).toHaveTextContent(
        /cannot be recovered.*manage, renew, or delete/i,
      );
      expect(
        screen.getByRole("button", { name: "Copy code" }),
      ).toBeInTheDocument();
      expect(
        Array.from(localStorage).some(
          ([key, value]) =>
            key.includes("UWO-EDIT-7F2K") || value.includes("UWO-EDIT-7F2K"),
        ),
      ).toBe(false);
      expect(
        Array.from(sessionStorage).some(
          ([key, value]) =>
            key.includes("UWO-EDIT-7F2K") || value.includes("UWO-EDIT-7F2K"),
        ),
      ).toBe(false);

      await user.click(screen.getByRole("button", { name: "Copy code" }));

      expect(clipboardWriteText).toHaveBeenCalledWith("UWO-EDIT-7F2K");
      expect(await screen.findByText("Edit code copied.")).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Post another listing" }),
      );
      expect(screen.queryByText("UWO-EDIT-7F2K")).not.toBeInTheDocument();
    } finally {
      Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("does not expose any listing image upload control", async () => {
    const user = userEvent.setup();
    renderPostPage();
    await fillValidForm(user);

    expect(screen.queryByLabelText(/listing image/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /upload/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /choose a png|drag it onto|paste it from your clipboard/i,
      ),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(repository.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ imageUrl: expect.anything() }),
    );
  });

  it("hides the price field and sends null for trade listings", async () => {
    const user = userEvent.setup();
    renderPostPage();
    await fillValidForm(user);
    await user.selectOptions(screen.getByLabelText("Currency"), "ducats");
    await user.selectOptions(
      screen.getByLabelText("Currency"),
      "Trade / Barter",
    );

    expect(screen.queryByLabelText(/price/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: "trade",
        price: null,
        server: "Maris",
        contactNote: "In-game mail preferred.",
      }),
    );
  });

  it("returns focus to the form heading after starting another post", async () => {
    const user = userEvent.setup();
    renderPostPage();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Publish listing" }));

    await user.click(
      screen.getByRole("button", { name: "Post another listing" }),
    );
    expect(
      screen.getByRole("heading", { name: "Post a listing" }),
    ).toHaveFocus();
  });
});
