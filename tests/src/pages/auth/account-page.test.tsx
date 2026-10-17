import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountPage } from "../../../../src/pages/auth/account-page";

const useAuthMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/lib/auth-context", () => ({
  AuthProvider: ({ children }: { children?: ReactNode }) => children,
  useAuth: useAuthMock,
}));

const baseAuth = {
  email: null,
  isInitializing: false,
  isSupabaseEnabled: true,
  isSupabaseUnreachable: false,
  session: null,
  userId: null,
};

function renderAccountPage(path = "/account") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AccountPage />} path="/account" />
        <Route element={<main>posted destination</main>} path="/post" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("account page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      ...baseAuth,
      register: vi.fn(),
      requestPasswordReset: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      updatePassword: vi.fn(),
    });
  });

  afterEach(cleanup);

  it("signs in and returns to the requested route", async () => {
    const user = userEvent.setup({ delay: null });
    const signIn = vi.fn().mockResolvedValue({ requiresConfirmation: false });
    useAuthMock.mockReturnValue({ ...baseAuth, signIn });
    renderAccountPage("/account?next=/post");

    await user.type(screen.getByLabelText("Email"), "captain@example.com");
    await user.type(screen.getByLabelText("Password"), "secret6");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("posted destination")).toBeInTheDocument();
    expect(signIn).toHaveBeenCalledWith("captain@example.com", "secret6");
  });

  it("registers and explains email confirmation when needed", async () => {
    const user = userEvent.setup({ delay: null });
    const register = vi.fn().mockResolvedValue({ requiresConfirmation: true });
    useAuthMock.mockReturnValue({ ...baseAuth, register });
    renderAccountPage("/account?mode=register");

    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "secret6");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText(
        "Check your email to confirm your account before signing in.",
      ),
    ).toBeInTheDocument();
    expect(register).toHaveBeenCalledWith("new@example.com", "secret6");
  });

  it("links sign-in users to password recovery", () => {
    renderAccountPage();

    expect(
      screen.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/account/forgot");
  });

  it("does not show password recovery on the register form", () => {
    renderAccountPage("/account?mode=register");

    expect(
      screen.queryByRole("link", { name: "Forgot password?" }),
    ).not.toBeInTheDocument();
  });
});
