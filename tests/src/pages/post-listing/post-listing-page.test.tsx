import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

import { App } from "../../../../src/app";
import {
  uploadListingImage,
  validateListingImage,
} from "../../../../src/lib/listing-images";
import type { CreatedListing } from "../../../../src/types/listing";

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

vi.mock("../../../../src/lib/listing-images", () => ({
  LISTING_IMAGE_MIME_TYPES: ["image/png", "image/jpeg", "image/webp"],
  validateListingImage: vi.fn(),
  uploadListingImage: vi.fn(),
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

let revokeObjectURL: Mock;
const imageFile = new File(["image-bytes"], "schooner.png", {
  type: "image/png",
});

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
  beforeEach(() => {
    vi.clearAllMocks();
    repository.create.mockResolvedValue(createdListing);
    repository.get.mockResolvedValue(createdListing);
    repository.countOffers.mockResolvedValue(0);
    repository.createOffer.mockResolvedValue(undefined);
    repository.report.mockResolvedValue(undefined);
    vi.mocked(validateListingImage).mockReturnValue(null);
    vi.mocked(uploadListingImage).mockResolvedValue("blob:listing-image");
    revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(URL, "revokeObjectURL");
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

  it("validates and previews an image selected with the file picker", async () => {
    const user = userEvent.setup();
    renderPostPage();

    const input = screen.getByLabelText(/listing image/i);
    expect(input).toHaveAttribute("accept", "image/png,image/jpeg,image/webp");
    await user.upload(input, imageFile);

    expect(validateListingImage).toHaveBeenCalledWith(imageFile);
    expect(uploadListingImage).toHaveBeenCalledWith(imageFile);
    expect(input).toHaveValue("");
    expect(
      await screen.findByRole("img", {
        name: "Selected listing image for a new listing: schooner.png",
      }),
    ).toHaveAttribute("src", "blob:listing-image");
  });

  it("shows a picker validation error without uploading", async () => {
    const user = userEvent.setup();
    vi.mocked(validateListingImage).mockReturnValue(
      "Images must be PNG, JPEG, or WebP.",
    );
    renderPostPage();

    await user.upload(
      screen.getByLabelText(/listing image/i),
      new File(["not-an-image"], "listing.png", { type: "image/png" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Images must be PNG, JPEG, or WebP.",
    );
    expect(screen.getByLabelText(/listing image/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(uploadListingImage).not.toHaveBeenCalled();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("tracks an in-flight upload and blocks publishing until it finishes", async () => {
    const user = userEvent.setup();
    let resolveUpload!: (url: string) => void;
    vi.mocked(uploadListingImage).mockReturnValue(
      new Promise<string>((resolve) => {
        resolveUpload = resolve;
      }),
    );
    renderPostPage();

    await user.upload(screen.getByLabelText(/listing image/i), imageFile);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Uploading schooner.png…",
    );
    const publishButton = screen.getByRole("button", {
      name: "Uploading image…",
    });
    expect(publishButton).toBeDisabled();

    resolveUpload("blob:listing-image");
    expect(
      await screen.findByRole("img", {
        name: "Selected listing image for a new listing: schooner.png",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Publish listing" }),
    ).toBeEnabled();
  });

  it("accepts an image dropped anywhere on the form", async () => {
    const { container } = renderPostPage();
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    if (!form) return;

    fireEvent.drop(form, { dataTransfer: { files: [imageFile] } });

    expect(validateListingImage).toHaveBeenCalledWith(imageFile);
    expect(await screen.findByRole("img")).toHaveAttribute(
      "src",
      "blob:listing-image",
    );
  });

  it("accepts a pasted image from anywhere in the form", async () => {
    renderPostPage();

    fireEvent.paste(screen.getByLabelText("Title"), {
      clipboardData: { files: [imageFile] },
    });

    expect(validateListingImage).toHaveBeenCalledWith(imageFile);
    expect(await screen.findByRole("img")).toHaveAttribute(
      "src",
      "blob:listing-image",
    );
  });

  it("removes a pending image, clears the picker, and revokes blob URLs", async () => {
    const user = userEvent.setup();
    renderPostPage();

    await user.upload(screen.getByLabelText(/listing image/i), imageFile);
    expect(
      await screen.findByRole("img", {
        name: "Selected listing image for a new listing: schooner.png",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove image" }));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/listing image/i)).toHaveValue("");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:listing-image");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("includes the uploaded image URL and keeps emoji as fallback input", async () => {
    const user = userEvent.setup();
    renderPostPage();
    await fillValidForm(user);
    await user.type(screen.getByLabelText(/emoji visual/i), "⛵");
    await user.upload(screen.getByLabelText(/listing image/i), imageFile);
    expect(await screen.findByRole("img")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Publish listing" }));

    expect(await screen.findByRole("status")).toBeInTheDocument();
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
      imageUrl: "blob:listing-image",
      imageEmoji: "⛵",
    });
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
