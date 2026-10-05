import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { App } from "../../src/app";

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("application routes", () => {
  it("renders the home route", () => {
    renderApp("/");
    expect(
      screen.getByRole("heading", { name: /trade ships/i }),
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
});
