import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ListingCard } from "../../../../src/components/listings/listing-card";
import { ShipArt } from "../../../../src/components/ships/ship-visuals";
import type { Listing, ShipType } from "../../../../src/types/listing";
import { testShipDetails } from "../../fixtures/ship-details";
import { testShipDetailsWithSkills } from "../../fixtures/ship-details";

const listing: Listing = {
  id: "adventurer-frigate",
  title: "Adventurer Frigate",
  category: "ships",
  price: 48_000_000,
  currency: "ducats",
  description: "A dependable adventure frigate.",
  seller: "PortRoyalShipwright",
  location: "Port Royal",
  server: "Maris",
  contactNote: "",
  imageEmoji: "🚢",
  createdAt: "2026-10-04T14:00:00Z",
  expiresAt: "2026-10-18T14:00:00Z",
};

describe("ListingCard", () => {
  afterEach(cleanup);

  it("renders listing details with a link to the listing", () => {
    const { container } = render(
      <MemoryRouter>
        <ListingCard listing={listing} />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /adventurer frigate/i });
    expect(link).toHaveAttribute("href", "/listings/adventurer-frigate");
    expect(link).toHaveTextContent("Adventurer Frigate");
    expect(link).toHaveTextContent("ships");
    expect(link).toHaveTextContent("48,000,000 ducats");
    expect(link).toHaveTextContent("PortRoyalShipwright");
    expect(link).toHaveTextContent("Port Royal");
    expect(link).toHaveTextContent("🚢");
    expect(container.querySelector("[data-ship-art]")).toBeNull();
    expect(container.querySelector("img[src^='/ship-stat-icons/']")).toBeNull();
  });

  it("marks legacy listings", () => {
    render(
      <MemoryRouter>
        <ListingCard listing={{ ...listing, collection: "legacy" }} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Legacy")).toBeInTheDocument();
  });

  it.each([
    {
      type: "battle" as ShipType,
      label: "Battle",
      source: "battle.webp",
      fit: "object-cover",
    },
    {
      type: "trade" as ShipType,
      label: "Trade",
      source: "trade.webp",
      fit: "object-cover",
    },
    {
      type: "adventure" as ShipType,
      label: "Adventure",
      source: "adventure.webp",
      fit: "object-cover",
    },
  ])(
    "uses the approved $type art treatment and summary for ship listings",
    ({ type, label, source, fit }) => {
      const { container } = render(
        <MemoryRouter>
          <ListingCard
            listing={{
              ...listing,
              shipDetails: {
                ...testShipDetails,
                type,
                performance: { ...testShipDetails.performance, rowPower: 0 },
              },
            }}
          />
        </MemoryRouter>,
      );

      const art = container.querySelector<HTMLElement>(
        `[data-ship-art='${type}']`,
      );
      expect(art).toBeInTheDocument();
      expect(screen.getByText(`${label} · Heavy`)).toBeInTheDocument();
      expect(container.querySelector("img[src$='galley.webp']")).toBeNull();
      expect(art).toHaveAttribute("src", `/ship-art/${source}`);
      expect(art).toHaveClass(fit);
    },
  );

  it("renders galley art full-bleed like the rest of the fleet", () => {
    const { container } = render(<ShipArt name="galley" />);
    const art = container.querySelector<HTMLImageElement>(
      "[data-ship-art='galley']",
    );

    expect(art).toHaveAttribute("src", "/ship-art/galley.webp");
    expect(art).toHaveClass("object-cover", "object-center");
    expect(art).not.toHaveClass("object-contain");
  });

  it("shows the rowing art when the ship has row power, whatever its type", () => {
    const { container } = render(
      <MemoryRouter>
        <ListingCard
          listing={{
            ...listing,
            shipDetails: {
              ...testShipDetails,
              type: "battle",
              performance: { ...testShipDetails.performance, rowPower: 130 },
            },
          }}
        />
      </MemoryRouter>,
    );

    const art = container.querySelector<HTMLImageElement>(
      "[data-ship-art='galley']",
    );
    expect(art).toHaveAttribute("src", "/ship-art/galley.webp");
    expect(art).toHaveClass("object-cover");
    expect(container.querySelector("img[src$='battle.webp']")).toBeNull();
  });

  it("renders every ship stat as a supplied icon and value without visible labels", () => {
    const { container } = render(
      <MemoryRouter>
        <ListingCard listing={{ ...listing, shipDetails: testShipDetails }} />
      </MemoryRouter>,
    );

    const expectedStats = [
      { label: "Vertical sail", value: "180", source: "vertical-sail.png" },
      {
        label: "Horizontal sail",
        value: "420",
        source: "horizontal-sail.png",
      },
      { label: "Row power", value: "40", source: "row-power.png" },
      { label: "Turn speed", value: "18", source: "turn-speed.png" },
      {
        label: "Wave resistance",
        value: "72",
        source: "wave-resistance.png",
      },
      { label: "Armour", value: "96", source: "armour.png" },
      { label: "Durability", value: "500", source: "durability.png" },
      { label: "Improvements", value: "28 / 5", source: "improvements.png" },
      { label: "Crew", value: "180", source: "crew.png" },
      { label: "Cannons", value: "120", source: "cannons.png" },
      { label: "Cargo", value: "950", source: "cargo.png" },
      {
        label: "Sailors required",
        value: "45",
        source: "sailors-required.png",
      },
      { label: "Adventure Lv", value: "42", source: "req-adventure.png" },
      { label: "Trade Lv", value: "61", source: "req-trade.png" },
      { label: "Battle Lv", value: "27", source: "req-battle.png" },
    ];

    expect(screen.getAllByRole("listitem")).toHaveLength(expectedStats.length);

    for (const expected of expectedStats) {
      const stat = screen.getByRole("listitem", {
        name: `${expected.label}: ${expected.value}`,
      });
      const icon = within(stat).getByText(expected.value);
      const crop = stat.querySelector("img");

      expect(icon).toBeInTheDocument();
      expect(crop).toHaveAttribute(
        "src",
        `/ship-stat-icons/${expected.source}`,
      );
      expect(crop).toHaveClass("object-contain");
    }

    const visibleText = container.textContent ?? "";
    for (const expected of expectedStats) {
      expect(visibleText).not.toContain(expected.label);
    }
  });

  it("shows selected skills as accessible icons with name-only hover and focus tooltips", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ListingCard
          listing={{ ...listing, shipDetails: testShipDetailsWithSkills }}
        />
      </MemoryRouter>,
    );

    const selectedSkills = [
      testShipDetailsWithSkills.originalSkill,
      ...(testShipDetailsWithSkills.optionalSkills ?? []),
    ].filter((skill): skill is NonNullable<typeof skill> => skill != null);
    expect(screen.getAllByRole("listitem")).toHaveLength(
      15 + selectedSkills.length,
    );

    for (const skill of selectedSkills) {
      const icon = screen.getByRole("img", { name: skill.name });
      expect(icon.querySelector("img")).toHaveAttribute(
        "src",
        `/ship-skill-icons/${skill.iconId}.png`,
      );
      expect(screen.queryByText(skill.name)).not.toBeInTheDocument();
    }

    const firstSkill = selectedSkills[0];
    const firstIcon = screen.getByRole("img", { name: firstSkill.name });

    await user.hover(firstIcon);
    const hoverTooltip = screen.getByText(firstSkill.name);
    expect(hoverTooltip).toBeVisible();
    expect(hoverTooltip.textContent).toBe(firstSkill.name);
    expect(hoverTooltip).toHaveClass("bottom-[calc(100%+0.375rem)]");
    expect(hoverTooltip).not.toHaveClass("top-[calc(100%+0.375rem)]");

    await user.unhover(firstIcon);
    expect(screen.queryByText(firstSkill.name)).not.toBeInTheDocument();

    fireEvent.focus(firstIcon);
    expect(screen.getByText(firstSkill.name)).toBeVisible();
    fireEvent.blur(firstIcon);
    expect(screen.queryByText(firstSkill.name)).not.toBeInTheDocument();
  });

  it("shows a name-only tooltip for stat chips on hover and focus", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ListingCard listing={{ ...listing, shipDetails: testShipDetails }} />
      </MemoryRouter>,
    );

    const chip = screen.getByRole("listitem", { name: "Row power: 40" });
    expect(screen.queryByText("Row power")).not.toBeInTheDocument();

    await user.hover(chip);
    const tooltip = screen.getByText("Row power");
    expect(tooltip).toBeVisible();
    expect(tooltip.textContent).toBe("Row power");
    expect(tooltip).toHaveClass("bottom-[calc(100%+0.375rem)]");
    expect(tooltip).not.toHaveClass("top-[calc(100%+0.375rem)]");

    await user.unhover(chip);
    expect(screen.queryByText("Row power")).not.toBeInTheDocument();

    fireEvent.focus(chip);
    expect(screen.getByText("Row power")).toBeVisible();
    fireEvent.blur(chip);
    expect(screen.queryByText("Row power")).not.toBeInTheDocument();
  });

  it("renders a ticket card with the gold badge and no stat chips", () => {
    const { container } = render(
      <MemoryRouter>
        <ListingCard
          listing={{
            ...listing,
            shipDetails: {
              type: "battle",
              isTicket: true,
              ticketNumber: 407,
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("SHIP TICKET")).toBeInTheDocument();
    expect(
      screen.getByText("Ship Exchange Ticket (No.407)"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Ship specifications and skills" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("listitem", { name: /Row power/ }),
    ).not.toBeInTheDocument();
    const art = container.querySelector<HTMLImageElement>(
      "img[src='/ship-art/battle.webp']",
    );
    expect(art).not.toBeNull();
  });

  it("renders only the stats a partial listing provides, never zero-filled", () => {
    render(
      <MemoryRouter>
        <ListingCard
          listing={{
            ...listing,
            shipDetails: {
              type: "trade",
              shipClass: "heavy",
              performance: { rowPower: 40 },
              hold: { cargo: 950 },
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("listitem", { name: "Row power: 40" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "Cargo: 950" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("listitem", { name: /Vertical sail/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("listitem", { name: /: 0$/ }),
    ).not.toBeInTheDocument();
  });

  it("shows a stat name tooltip after a touch long press", () => {
    vi.useFakeTimers();

    try {
      render(
        <MemoryRouter>
          <ListingCard listing={{ ...listing, shipDetails: testShipDetails }} />
        </MemoryRouter>,
      );

      const chip = screen.getByRole("listitem", { name: "Cargo: 950" });
      fireEvent.pointerDown(chip, { pointerType: "touch" });
      act(() => {
        vi.advanceTimersByTime(449);
      });
      expect(screen.queryByText("Cargo")).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      const tooltip = screen.getByText("Cargo");
      expect(tooltip).toBeVisible();
      expect(tooltip.textContent).toBe("Cargo");

      fireEvent.pointerUp(chip);
      expect(screen.queryByText("Cargo")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a name-only tooltip after a touch long press", () => {
    vi.useFakeTimers();

    try {
      render(
        <MemoryRouter>
          <ListingCard
            listing={{ ...listing, shipDetails: testShipDetailsWithSkills }}
          />
        </MemoryRouter>,
      );

      const skill = testShipDetailsWithSkills.originalSkill;
      if (!skill) throw new Error("Expected an original ship skill fixture");
      const icon = screen.getByRole("img", { name: skill.name });

      fireEvent.pointerDown(icon, { pointerType: "touch" });
      act(() => {
        vi.advanceTimersByTime(449);
      });
      expect(screen.queryByText(skill.name)).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      const tooltip = screen.getByText(skill.name);
      expect(tooltip).toBeVisible();
      expect(tooltip.textContent).toBe(skill.name);

      fireEvent.pointerUp(icon);
      expect(screen.queryByText(skill.name)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a SOLD badge when the listing has sold", () => {
    render(
      <MemoryRouter>
        <ListingCard
          listing={{
            ...listing,
            soldAt: "2026-10-05T10:00:00Z",
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("SOLD")).toBeInTheDocument();
  });

  it("formats every supported listing currency without inventing numeric prices", () => {
    const cases = [
      {
        currency: "UWC" as const,
        price: 1_250.5,
        expected: "1,250.5 UWC",
      },
      { currency: "CT" as const, price: 7, expected: "7 CT" },
      { currency: "trade" as const, price: null, expected: "Trade" },
      {
        currency: "negotiable" as const,
        price: null,
        expected: "Negotiable",
      },
    ];

    for (const testCase of cases) {
      cleanup();
      render(
        <MemoryRouter>
          <ListingCard
            listing={{ ...listing, ...testCase, price: testCase.price }}
          />
        </MemoryRouter>,
      );
      expect(screen.getByText(testCase.expected)).toBeInTheDocument();
      expect(screen.queryByText(/nan/i)).not.toBeInTheDocument();
    }
  });
});
