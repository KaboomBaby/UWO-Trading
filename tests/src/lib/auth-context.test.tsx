import { act, cleanup, render, screen } from "@testing-library/react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "../../../src/lib/auth-context";
import { getSupabaseClient } from "../../../src/lib/supabase-client";

const getSupabaseClientMock = vi.mocked(getSupabaseClient);

vi.mock("../../../src/lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(),
}));

function sessionFor(email: string, userId: string) {
  return {
    user: { id: userId, email },
    access_token: `${userId}-access-token`,
  } as unknown as Session;
}

function AuthState() {
  const auth = useAuth();
  return (
    <div>
      <span>{auth.email ?? "signed-out"}</span>
      <span>{auth.userId ?? "no-user"}</span>
      <span>{auth.isInitializing ? "loading" : "ready"}</span>
      <button
        onClick={() => void auth.signIn("owner@example.com", "secret6")}
        type="button"
      >
        sign in
      </button>
      <button onClick={() => void auth.signOut()} type="button">
        sign out
      </button>
    </div>
  );
}

describe("auth context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("loads and exposes a persistent Supabase session", async () => {
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: sessionFor("persistent@example.com", "user-1") },
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signInWithPassword: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn(),
      },
    };
    getSupabaseClientMock.mockReturnValue(client as unknown as SupabaseClient);

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    expect(
      await screen.findByText("persistent@example.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(client.auth.getSession).toHaveBeenCalledTimes(1);
  });

  it("signs in, clears the session on auth change, and signs out", async () => {
    let emitAuthChange: (event: string, session: Session | null) => void = () =>
      undefined;
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockImplementation((listener) => {
          emitAuthChange = listener as typeof emitAuthChange;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: sessionFor("signed-in@example.com", "user-2") },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn(),
      },
    };
    getSupabaseClientMock.mockReturnValue(client as unknown as SupabaseClient);
    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    expect(await screen.findByText("signed-out")).toBeInTheDocument();
    await act(async () => {
      emitAuthChange("SIGNED_IN", sessionFor("changed@example.com", "user-3"));
    });
    expect(screen.getByText("changed@example.com")).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: "sign in" }).click();
    });
    expect(
      await screen.findByText("signed-in@example.com"),
    ).toBeInTheDocument();
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "secret6",
    });

    await act(async () => {
      screen.getByRole("button", { name: "sign out" }).click();
    });
    expect(await screen.findByText("signed-out")).toBeInTheDocument();
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it("is immediately ready and disabled without Supabase credentials", () => {
    getSupabaseClientMock.mockReturnValue(null);
    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    expect(screen.getByText("signed-out")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
  });
});
