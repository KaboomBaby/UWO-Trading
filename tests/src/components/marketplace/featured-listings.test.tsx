import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { FeaturedListings } from "../../../../src/components/marketplace/featured-listings";

describe("FeaturedListings", () => {
  it("exposes loading state text to assistive technology", () => {
    render(
      <MemoryRouter>
        <FeaturedListings listings={[]} loading />
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading featured listings/i)).toBeInTheDocument();
  });

  it("renders a safe empty state with a posting action", () => {
    render(
      <MemoryRouter>
        <FeaturedListings listings={[]} loading={false} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /no listings are ready yet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /post the first listing/i }),
    ).toHaveAttribute("href", "/post");
  });
});
