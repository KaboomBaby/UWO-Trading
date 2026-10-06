import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../../../src/app";
import type { Listing } from "../../../../src/types/listing";

const repository = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../../../../src/services/listing-service", () => ({
  createLocalListingRepository: () => repository,
}));

const createdListing: Listing = {
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
  createdAt: "2026-10-05T00:00:00Z",
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
  await user.selectOptions(screen.getByLabelText("Currency"), "ducats");
  await user.type(screen.getByLabelText("Price (Ducats)"), "32000000");
}

describe("post listing page", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    repository.create.mockResolvedValue(createdListing);
    repository.get.mockResolvedValue(createdListing);
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
    });

    await user.click(screen.getByRole("link", { name: "View posted listing" }));
    expect(repository.get).toHaveBeenCalledWith("new-trading-schooner");
    expect(
      await screen.findByRole("heading", { name: "Trading Schooner" }),
    ).toBeInTheDocument();
  });

  it("hides the price field and sends null for trade listings", async () => {
    const user = userEvent.setup();
    renderPostPage();
    await fillCommonFields(user);
    await user.selectOptions(screen.getByLabelText("Currency"), "ducats");
    await user.type(screen.getByLabelText("Price (Ducats)"), "32000000");
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
