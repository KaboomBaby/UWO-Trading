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
}));

vi.mock("../../../../src/services/listing-service", () => ({
  createLocalListingRepository: () => repository,
}));

const createdListing: Listing = {
  id: "new-trading-schooner",
  title: "Trading Schooner",
  category: "ships",
  price: 32_000_000,
  currency: "gold",
  description: "A swift schooner suitable for regional trade routes.",
  seller: "AmsterdamShipyard",
  location: "Amsterdam",
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

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Title"), "Trading Schooner");
  await user.selectOptions(screen.getByLabelText("Category"), "ships");
  await user.type(screen.getByLabelText("Price (gold)"), "32000000");
  await user.type(
    screen.getByLabelText("Description"),
    "A swift schooner suitable for regional trade routes.",
  );
  await user.type(screen.getByLabelText("Seller"), "AmsterdamShipyard");
  await user.type(screen.getByLabelText("Location"), "Amsterdam");
}

describe("post listing page", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    repository.create.mockResolvedValue(createdListing);
    repository.get.mockResolvedValue(createdListing);
  });

  it("shows inline errors and does not create when fields are invalid", async () => {
    const user = userEvent.setup();
    renderPostPage();

    await user.type(screen.getByLabelText("Title"), "ab");
    await user.type(screen.getByLabelText("Price (gold)"), "0");
    await user.type(screen.getByLabelText("Description"), "Too short");
    await user.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(
      screen.getByText("Title must be at least 3 characters."),
    ).toBeInTheDocument();
    expect(screen.getByText("Category is required.")).toBeInTheDocument();
    expect(
      screen.getByText("Price must be a number greater than zero."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Description must be at least 10 characters."),
    ).toBeInTheDocument();
    expect(screen.getByText("Seller is required.")).toBeInTheDocument();
    expect(screen.getByText("Location is required.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(repository.create).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("creates a valid listing and links to its detail page", async () => {
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
      price: 32_000_000,
      description: "A swift schooner suitable for regional trade routes.",
      seller: "AmsterdamShipyard",
      location: "Amsterdam",
    });

    await user.click(screen.getByRole("link", { name: "View posted listing" }));
    expect(repository.get).toHaveBeenCalledWith("new-trading-schooner");
    expect(
      await screen.findByRole("heading", { name: "Trading Schooner" }),
    ).toBeInTheDocument();
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
