import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "../../src/app";

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("application routes", () => {
  it("renders the home route", () => {
    renderApp("/");
    expect(
      screen.getByRole("heading", { name: /open-sea marketplace/i }),
    ).toBeInTheDocument();
  });

  it("renders the browse route", () => {
    renderApp("/browse");
    expect(
      screen.getByRole("heading", { name: /browse listings/i }),
    ).toBeInTheDocument();
  });

  it("renders the post listing route", () => {
    renderApp("/post");
    expect(
      screen.getByRole("heading", { name: /post a listing/i }),
    ).toBeInTheDocument();
  });

  it("renders a known listing detail route", async () => {
    renderApp("/listings/adventurer-frigate");
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /adventurer frigate/i }),
      ).toBeInTheDocument(),
    );
  });
});
