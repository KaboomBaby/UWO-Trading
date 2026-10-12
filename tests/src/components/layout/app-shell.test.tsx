import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "../../../../src/components/layout/app-shell";

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children?: ReactNode }) => children,
  useAuth: useAuthMock,
}));

function renderShell() {
  return render(
    <MemoryRouter>
      <AppShell>
        <p>Page content</p>
      </AppShell>
    </MemoryRouter>,
  );
}

describe("app shell account controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("shows the signed-in email and sign-out control at small widths", () => {
    useAuthMock.mockReturnValue({
      email: "captain@example.com",
      isInitializing: false,
      isSupabaseEnabled: true,
      register: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      userId: "player-account-1",
    });
    const { container } = renderShell();

    expect(screen.getByText("captain@example.com")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();

    const accountControls = screen.getByRole("button", {
      name: "Sign out",
    }).parentElement;
    expect(accountControls).toHaveClass("flex");
    expect(accountControls).not.toHaveClass("hidden");

    const navigation = container.querySelector("nav");
    expect(navigation).toHaveClass("order-3", "w-full");
    expect(navigation).toHaveClass("lg:order-2", "lg:w-auto");
  });

  it("shows the sign-in control at small widths", () => {
    useAuthMock.mockReturnValue({
      email: null,
      isInitializing: false,
      isSupabaseEnabled: true,
      register: vi.fn(),
      session: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      userId: null,
    });
    renderShell();

    const signIn = screen.getByRole("link", { name: "Sign in" });
    expect(signIn).toBeVisible();
    expect(signIn.parentElement).toHaveClass("flex");
    expect(signIn.parentElement).not.toHaveClass("hidden");
  });
});
