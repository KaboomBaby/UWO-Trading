import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../../lib/auth-context";

type AccountMode = "sign-in" | "register";

const inputClassName =
  "mt-2 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30";
const primaryButtonClassName =
  "rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClassName =
  "rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60";

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function AccountPage() {
  const {
    email,
    isInitializing,
    isSupabaseEnabled,
    register,
    signIn,
    signOut,
    userId,
  } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedMode = searchParams.get("mode");
  const [mode, setMode] = useState<AccountMode>(
    requestedMode === "register" ? "register" : "sign-in",
  );
  const [formEmail, setFormEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const redirectPath = safeRedirectPath(searchParams.get("next"));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setStatus(null);
    try {
      const result =
        mode === "register"
          ? await register(formEmail, password)
          : await signIn(formEmail, password);

      if (result?.requiresConfirmation) {
        setStatus(
          "Check your email to confirm your account before signing in.",
        );
        return;
      }
      if (redirectPath) navigate(redirectPath);
    } catch (submittedError) {
      setError(
        submittedError instanceof Error
          ? submittedError.message
          : "Unable to complete this account request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing) {
    return (
      <section className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <p className="text-slate-300" role="status">
          Loading your account…
        </p>
      </section>
    );
  }

  if (userId) {
    return (
      <section className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-glow">
            Account
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            You are signed in
          </h1>
          <p className="mt-3 break-words text-slate-200">{email}</p>
          <p className="mt-3 text-sm text-slate-300">
            Your listings and offers are managed automatically from this
            account—no edit code required for account-owned listings.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className={primaryButtonClassName} to="/manage">
              Go to My listings
            </Link>
            <button
              className={secondaryButtonClassName}
              onClick={() => void signOut().catch(setError)}
              type="button"
            >
              Sign out
            </button>
          </div>
          {error ? (
            <p
              className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-glow">
          Player account
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          {mode === "register" ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-3 text-slate-300">
          An account is required to post a listing. Account-owned listings stay
          available in My listings without an edit code.
        </p>

        {isSupabaseEnabled ? null : (
          <p
            className="mt-4 rounded-lg border border-amber-glow/40 bg-amber-glow/10 p-3 text-sm text-amber-100"
            role="note"
          >
            Account sign-in is unavailable in this local preview because
            Supabase is not configured.
          </p>
        )}

        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="text-sm font-semibold text-slate-200"
              htmlFor="email"
            >
              Email
            </label>
            <input
              autoComplete="email"
              className={inputClassName}
              id="email"
              name="email"
              onChange={(event) => setFormEmail(event.target.value)}
              required
              type="email"
              value={formEmail}
            />
          </div>
          <div>
            <label
              className="text-sm font-semibold text-slate-200"
              htmlFor="password"
            >
              Password
            </label>
            <input
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              className={inputClassName}
              id="password"
              minLength={6}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {status ? (
            <p
              className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-100"
              role="status"
            >
              {status}
            </p>
          ) : null}
          {error ? (
            <p
              className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            className={primaryButtonClassName}
            disabled={isSubmitting || !isSupabaseEnabled}
            type="submit"
          >
            {isSubmitting
              ? mode === "register"
                ? "Creating account…"
                : "Signing in…"
              : mode === "register"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <button
          className="mt-5 text-sm font-semibold text-amber-glow transition hover:text-amber-100"
          onClick={() => {
            setMode(mode === "register" ? "sign-in" : "register");
            setError(null);
            setStatus(null);
          }}
          type="button"
        >
          {mode === "register"
            ? "I already have an account"
            : "Create a new account"}
        </button>
      </div>
    </section>
  );
}
