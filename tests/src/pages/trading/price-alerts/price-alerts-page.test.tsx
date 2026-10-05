import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TradingRepository } from "../../../../../src/services/trading-service";
import type { PriceAlert } from "../../../../../src/types/trading";

const { mockRepository } = vi.hoisted(() => ({
  mockRepository: {
    listAlerts: vi.fn<TradingRepository["listAlerts"]>(async () => []),
    createAlert: vi.fn<TradingRepository["createAlert"]>(async () => {
      throw new Error("Not configured");
    }),
    setAlertStatus: vi.fn<TradingRepository["setAlertStatus"]>(async () => {
      throw new Error("Not configured");
    }),
  },
}));

vi.mock("../../../../../src/lib/trading-repository-context", () => ({
  useTradingRepository: () => mockRepository,
}));

const { PriceAlertsPage } =
  await import("../../../../../src/pages/trading/price-alerts/price-alerts-page");

const activeAlert: PriceAlert = {
  id: "pepper-below-4k",
  itemName: "Pepper",
  targetPrice: 4_000,
  direction: "below",
  status: "active",
  note: "Buy for the Lisbon export run.",
  createdAt: "2026-10-03T10:00:00Z",
};

const triggeredAlert: PriceAlert = {
  ...activeAlert,
  id: "cinnamon-above-5k",
  itemName: "Cinnamon",
  targetPrice: 5_000,
  direction: "above",
  status: "triggered",
  note: "Sell remaining Amsterdam inventory.",
};

const pausedAlert: PriceAlert = {
  ...activeAlert,
  id: "culverin-below-12m",
  itemName: "Master Culverin",
  targetPrice: 12_000_000,
  status: "paused",
  note: "Wait for the next Genoa refit cycle.",
};

function renderAlerts(path = "/trading/price-alerts") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <>
        <Routes>
          <Route path="/trading/price-alerts" element={<PriceAlertsPage />} />
        </Routes>
        <output>
          <TestLocation />
        </output>
      </>
    </MemoryRouter>,
  );
}

function TestLocation() {
  const location = useLocation();
  return <span>{location.pathname + location.search}</span>;
}

describe("PriceAlertsPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockRepository.listAlerts.mockReset();
    mockRepository.listAlerts.mockResolvedValue([]);
    mockRepository.createAlert.mockReset();
    mockRepository.setAlertStatus.mockReset();
  });

  it("initializes a valid status from the URL and passes it to the repository", async () => {
    mockRepository.listAlerts.mockResolvedValue([pausedAlert]);
    renderAlerts("/trading/price-alerts?status=paused");

    expect(mockRepository.listAlerts).toHaveBeenCalledWith({
      status: "paused",
    });
    expect(
      await screen.findByRole("heading", { name: "Master Culverin" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Paused" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByText("1 paused alert")).toBeInTheDocument();
    expect(
      screen.getByText("/trading/price-alerts?status=paused"),
    ).toBeInTheDocument();
  });

  it("canonicalizes explicit all and invalid status values to no status param", async () => {
    mockRepository.listAlerts.mockResolvedValue([]);
    renderAlerts("/trading/price-alerts?status=all");

    await waitFor(() =>
      expect(screen.getByText("/trading/price-alerts")).toBeInTheDocument(),
    );
    expect(mockRepository.listAlerts).toHaveBeenCalledWith({ status: "all" });
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    cleanup();
    mockRepository.listAlerts.mockClear();
    renderAlerts("/trading/price-alerts?status=unknown");
    await waitFor(() =>
      expect(screen.getByText("/trading/price-alerts")).toBeInTheDocument(),
    );
    expect(mockRepository.listAlerts).toHaveBeenCalledWith({ status: "all" });
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("updates the repository query when a status filter link is selected", async () => {
    const user = userEvent.setup();
    mockRepository.listAlerts.mockResolvedValue([]);
    renderAlerts();
    await screen.findByText("0 alerts");

    await user.click(screen.getByRole("link", { name: "Triggered" }));
    await waitFor(() =>
      expect(mockRepository.listAlerts).toHaveBeenLastCalledWith({
        status: "triggered",
      }),
    );
    expect(
      screen.getByText("/trading/price-alerts?status=triggered"),
    ).toBeInTheDocument();
    expect(screen.getByText("0 triggered alerts")).toBeInTheDocument();
  });

  it("shows validation errors without calling createAlert", async () => {
    const user = userEvent.setup();
    mockRepository.listAlerts.mockResolvedValue([]);
    renderAlerts();
    await screen.findByText("0 alerts");

    await user.click(screen.getByRole("button", { name: "Create alert" }));

    expect(
      screen.getByText("Item name must be at least 2 characters."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Target price must be a valid number."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Item name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(mockRepository.createAlert).not.toHaveBeenCalled();
  });

  it("creates a valid alert, resets the form, and refreshes the list", async () => {
    const user = userEvent.setup();
    const createdAlert: PriceAlert = {
      ...activeAlert,
      id: "silk-above-8k",
      itemName: "Silk",
      targetPrice: 8_000,
      direction: "above",
      note: "Sell at the Asian export peak.",
    };
    mockRepository.listAlerts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createdAlert]);
    mockRepository.createAlert.mockResolvedValue(createdAlert);
    renderAlerts();
    await screen.findByText("0 alerts");

    await user.type(screen.getByLabelText("Item name"), "Silk");
    await user.type(screen.getByLabelText("Target price (gold)"), "8000");
    await user.click(screen.getByLabelText("Above target"));
    await user.type(screen.getByLabelText("Note"), "Sell at the peak.");
    await user.click(screen.getByRole("button", { name: "Create alert" }));

    expect(await screen.findByText(/alert created/i)).toBeInTheDocument();
    expect(mockRepository.createAlert).toHaveBeenCalledWith({
      itemName: "Silk",
      targetPrice: 8000,
      direction: "above",
      note: "Sell at the peak.",
    });
    expect(mockRepository.listAlerts).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByRole("heading", { name: "Silk" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Item name")).toHaveValue("");
  });

  it("updates alert status and refreshes the filtered list", async () => {
    const user = userEvent.setup();
    const pausedByAction = { ...activeAlert, status: "paused" as const };
    mockRepository.listAlerts
      .mockResolvedValueOnce([activeAlert])
      .mockResolvedValueOnce([pausedByAction]);
    mockRepository.setAlertStatus.mockResolvedValue(pausedByAction);
    renderAlerts();
    expect(
      await screen.findByRole("heading", { name: "Pepper" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pause" }));

    await waitFor(() =>
      expect(mockRepository.setAlertStatus).toHaveBeenCalledWith(
        activeAlert.id,
        "paused",
      ),
    );
    expect(
      await screen.findByRole("button", { name: "Resume" }),
    ).toBeInTheDocument();
    expect(mockRepository.listAlerts).toHaveBeenCalledTimes(2);
  });

  it("renders alert targets, directions, notes, statuses, and controls", async () => {
    mockRepository.listAlerts.mockResolvedValue([
      activeAlert,
      triggeredAlert,
      pausedAlert,
    ]);
    renderAlerts();

    expect(
      await screen.findByRole("heading", { name: "Pepper" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cinnamon" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Master Culverin" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("4,000 gold")).toHaveLength(1);
    expect(screen.getAllByText("5,000 gold")).toHaveLength(1);
    expect(screen.getAllByText("12,000,000 gold")).toHaveLength(1);
    expect(screen.getAllByText("Below target")).toHaveLength(3);
    expect(screen.getAllByText("Above target")).toHaveLength(2);
    expect(
      screen.getByText("Buy for the Lisbon export run."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sell remaining Amsterdam inventory."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Wait for the next Genoa refit cycle."),
    ).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("triggered")).toBeInTheDocument();
    expect(screen.getByText("paused")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Resume" })).toHaveLength(2);
    expect(screen.getByText("3 alerts")).toBeInTheDocument();
  });

  it("renders a clear filtered empty state", async () => {
    mockRepository.listAlerts.mockResolvedValue([]);
    renderAlerts("/trading/price-alerts?status=triggered");

    expect(
      await screen.findByRole("heading", { name: "No triggered alerts" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/see triggered alerts/i)).toBeInTheDocument();
    expect(screen.getByText("0 triggered alerts")).toBeInTheDocument();
  });

  it("renders a strong loading state while alerts are pending", () => {
    mockRepository.listAlerts.mockImplementation(
      () => new Promise<PriceAlert[]>(() => undefined),
    );
    renderAlerts();

    expect(screen.getAllByText("Loading alerts…")).toHaveLength(2);
    expect(screen.getAllByRole("list")).toHaveLength(1);
  });

  it("recovers from a load error", async () => {
    const user = userEvent.setup();
    mockRepository.listAlerts
      .mockRejectedValueOnce(new Error("Unable to load alerts"))
      .mockResolvedValueOnce([activeAlert]);
    renderAlerts();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /alerts could not be loaded/i,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: "Pepper" }),
    ).toBeInTheDocument();
  });
});
