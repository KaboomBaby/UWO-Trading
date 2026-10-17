import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordPage } from "../../../../src/pages/auth/forgot-password-page";
import { ResetPasswordPage } from "../../../../src/pages/auth/reset-password-page";

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

const recoverySession = {
  user: { id: "user-1", email: "captain@example.com" },
};

function renderRecoveryPage(kind: "forgot" | "reset", path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          element={
            kind === "forgot" ? <ForgotPasswordPage /> : <ResetPasswordPage />
          }
          path={kind === "forgot" ? "/account/forgot" : "/account/reset"}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("password recovery pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      ...baseAuth,
      register: vi.fn(),
      requestPasswordReset: vi.fn().mockResolvedValue(undefined),
      signIn: vi.fn(),
      signOut: vi.fn().mockResolvedValue(undefined),
      updatePassword: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(cleanup);

  it("sends a reset link and moves focus to the announced success state", async () => {
    const user = userEvent.setup({ delay: null });
    const requestPasswordReset = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({ ...baseAuth, requestPasswordReset });
    renderRecoveryPage("forgot", "/account/forgot");

    await user.type(screen.getByLabelText("Email"), "captain@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Check your email");
    expect(status).toHaveTextContent("captain@example.com");
    expect(status).toHaveFocus();
    expect(requestPasswordReset).toHaveBeenCalledWith("captain@example.com");
  });

  it("explains why the forgot-password form is disabled when Supabase is not configured", () => {
    useAuthMock.mockReturnValue({ ...baseAuth, isSupabaseEnabled: false });
    renderRecoveryPage("forgot", "/account/forgot");

    expect(screen.getByText(/Supabase is not configured/)).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Send reset link" }),
    ).toBeDisabled();
  });

  it("explains why the forgot-password form is disabled when the service is unreachable", () => {
    useAuthMock.mockReturnValue({ ...baseAuth, isSupabaseUnreachable: true });
    renderRecoveryPage("forgot", "/account/forgot");

    expect(
      screen.getByText(/couldn't reach the account service/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Send reset link" }),
    ).toBeDisabled();
  });

  it("announces a reset request error and moves focus to it", async () => {
    const user = userEvent.setup({ delay: null });
    const requestPasswordReset = vi
      .fn()
      .mockRejectedValue(new Error("Reset request failed"));
    useAuthMock.mockReturnValue({ ...baseAuth, requestPasswordReset });
    renderRecoveryPage("forgot", "/account/forgot");

    await user.type(screen.getByLabelText("Email"), "captain@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Reset request failed");
    expect(alert).toHaveFocus();
  });

  it("updates the password, announces success with focus, and signs out", async () => {
    const user = userEvent.setup({ delay: null });
    const signOut = vi.fn().mockResolvedValue(undefined);
    const updatePassword = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      ...baseAuth,
      session: recoverySession,
      signOut,
      updatePassword,
    });
    renderRecoveryPage("reset", "/account/reset");

    await user.type(screen.getByLabelText("New password"), "new-secret6");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "new-secret6",
    );
    await user.click(screen.getByRole("button", { name: "Update password" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Password updated");
    expect(status).toHaveFocus();
    expect(updatePassword).toHaveBeenCalledWith("new-secret6");
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute(
      "href",
      "/account",
    );
  });

  it("shows an invalid-link state with a path to a new link when there is no recovery session", async () => {
    renderRecoveryPage("reset", "/account/reset");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "This reset link is invalid or has expired",
    );
    expect(alert).toHaveFocus();
    expect(
      screen.getByRole("link", { name: "Request a new link" }),
    ).toHaveAttribute("href", "/account/forgot");
  });

  it("treats an error in the recovery link as invalid even with a session", async () => {
    useAuthMock.mockReturnValue({ ...baseAuth, session: recoverySession });
    renderRecoveryPage(
      "reset",
      "/account/reset#error=access_denied&error_code=otp_expired",
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "This reset link is invalid or has expired",
    );
  });

  it("does not call a link invalid when the account service is unreachable", async () => {
    useAuthMock.mockReturnValue({ ...baseAuth, isSupabaseUnreachable: true });
    renderRecoveryPage(
      "reset",
      "/account/reset#error=access_denied&error_code=otp_expired",
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Password reset is unavailable");
    expect(alert).toHaveTextContent("not a problem with your link");
    expect(
      screen.queryByText("This reset link is invalid or has expired"),
    ).not.toBeInTheDocument();
  });

  it("reports a sign-out failure truthfully after the password update", async () => {
    const user = userEvent.setup({ delay: null });
    const signOut = vi.fn().mockRejectedValue(new Error("Sign out failed"));
    const updatePassword = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      ...baseAuth,
      session: recoverySession,
      signOut,
      updatePassword,
    });
    renderRecoveryPage("reset", "/account/reset");

    await user.type(screen.getByLabelText("New password"), "new-secret6");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "new-secret6",
    );
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Password updated",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your password was updated, but we couldn't sign you out.",
    );
    expect(
      screen.getByRole("button", { name: "Try signing out again" }),
    ).toBeInTheDocument();
  });

  it("turns a missing-session update failure into the invalid-link state", async () => {
    const user = userEvent.setup({ delay: null });
    const updatePassword = vi
      .fn()
      .mockRejectedValue(new Error("Auth session missing"));
    useAuthMock.mockReturnValue({
      ...baseAuth,
      session: recoverySession,
      updatePassword,
    });
    renderRecoveryPage("reset", "/account/reset");

    await user.type(screen.getByLabelText("New password"), "new-secret6");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "new-secret6",
    );
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This reset link is invalid or has expired",
    );
    expect(updatePassword).toHaveBeenCalledWith("new-secret6");
  });

  it("rejects mismatched passwords before calling Supabase", async () => {
    const user = userEvent.setup({ delay: null });
    const updatePassword = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      ...baseAuth,
      session: recoverySession,
      updatePassword,
    });
    renderRecoveryPage("reset", "/account/reset");

    await user.type(screen.getByLabelText("New password"), "new-secret6");
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "other-secret6",
    );
    await user.click(screen.getByRole("button", { name: "Update password" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The passwords do not match.");
    expect(alert).toHaveFocus();
    expect(updatePassword).not.toHaveBeenCalled();
  });
});
