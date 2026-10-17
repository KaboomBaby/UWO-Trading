import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../lib/auth-context";

const inputClassName =
  "mt-2 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30";
const primaryButtonClassName =
  "rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const primaryLinkClassName =
  "inline-block rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90";
const secondaryButtonClassName =
  "rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryLinkClassName =
  "inline-block rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10";

function isNetworkError(error: unknown) {
  return (
    error instanceof Error &&
    /failed to fetch|network|fetch/i.test(error.message)
  );
}

function isInvalidRecoveryError(error: unknown) {
  return (
    error instanceof Error &&
    /auth session missing|session.*expired|invalid.*token|otp_expired|link.*expired|invalid.*link/i.test(
      error.message,
    )
  );
}

function messageForError(error: unknown) {
  if (isNetworkError(error)) {
    return "We couldn't reach the account service. Check your connection and try again.";
  }
  if (error instanceof Error) return error.message;
  return "We couldn't update your password. Try again.";
}

export function ResetPasswordPage() {
  const {
    isInitializing,
    isSupabaseEnabled,
    isSupabaseUnreachable,
    session,
    signOut,
    updatePassword,
  } = useAuth();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdated, setIsUpdated] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [hasInvalidUpdateError, setHasInvalidUpdateError] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);
  const invalidRef = useRef<HTMLDivElement>(null);
  const unavailableRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
  const hasLinkError = ["error", "error_code", "error_description"].some(
    (key) => searchParams.has(key) || hashParams.has(key),
  );
  const isUnavailable = !isSupabaseEnabled || isSupabaseUnreachable;
  const isInvalid =
    !isUpdated &&
    !isInitializing &&
    !isUnavailable &&
    (hasInvalidUpdateError || hasLinkError || session === null);

  useEffect(() => {
    if (isUpdated) successRef.current?.focus();
  }, [isUpdated]);

  useEffect(() => {
    if (isInvalid) invalidRef.current?.focus();
  }, [isInvalid]);

  useEffect(() => {
    if (!isInitializing && isUnavailable && !isUpdated) {
      unavailableRef.current?.focus();
    }
  }, [isInitializing, isUnavailable, isUpdated]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function signOutAfterUpdate() {
    try {
      await signOut();
      setSignOutError(null);
    } catch {
      setSignOutError(
        "Your password was updated, but we couldn't sign you out. Try again before leaving this page.",
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await updatePassword(password);
      setIsUpdated(true);
      void signOutAfterUpdate();
    } catch (submittedError) {
      if (isInvalidRecoveryError(submittedError)) {
        setHasInvalidUpdateError(true);
      } else {
        setError(messageForError(submittedError));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing && !isUpdated) {
    return (
      <section className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <p className="text-slate-300" role="status">
          Checking your reset link…
        </p>
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
          Set a new password
        </h1>

        {isUpdated ? (
          <div
            className="mt-6 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-4 text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300/50"
            ref={successRef}
            role="status"
            tabIndex={-1}
          >
            <h2 className="text-lg font-semibold text-white">
              Password updated
            </h2>
            <p className="mt-2 text-sm">
              Your password has been changed. Use it the next time you sign in.
            </p>
            {signOutError ? (
              <>
                <p
                  className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
                  role="alert"
                >
                  {signOutError}
                </p>
                <button
                  className={`${secondaryButtonClassName} mt-4`}
                  onClick={() => void signOutAfterUpdate()}
                  type="button"
                >
                  Try signing out again
                </button>
              </>
            ) : (
              <Link className={`${primaryLinkClassName} mt-4`} to="/account">
                Go to sign in
              </Link>
            )}
          </div>
        ) : isUnavailable ? (
          <div
            className="mt-6 rounded-lg border border-amber-glow/40 bg-amber-glow/10 p-4 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300/50"
            ref={unavailableRef}
            role="alert"
            tabIndex={-1}
          >
            <h2 className="text-lg font-semibold text-white">
              Password reset is unavailable
            </h2>
            <p className="mt-2 text-sm">
              {!isSupabaseEnabled
                ? "The account service is not configured in this preview, so this link can't be checked. This is not a problem with your link."
                : "We couldn't reach the account service, so this link can't be checked right now. This is not a problem with your link. Try again later."}
            </p>
            <Link className={`${secondaryLinkClassName} mt-4`} to="/account">
              Back to sign in
            </Link>
          </div>
        ) : isInvalid ? (
          <div
            className="mt-6 rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-red-100 focus:outline-none focus:ring-2 focus:ring-red-300/50"
            ref={invalidRef}
            role="alert"
            tabIndex={-1}
          >
            <h2 className="text-lg font-semibold text-white">
              This reset link is invalid or has expired
            </h2>
            <p className="mt-2 text-sm">
              Request a new link and use it soon after it arrives.
            </p>
            <Link
              className={`${primaryLinkClassName} mt-4`}
              to="/account/forgot"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-slate-300">
              Choose a new password for your account.
            </p>
            <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
              <div>
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor="new-password"
                >
                  New password
                </label>
                <input
                  autoComplete="new-password"
                  className={inputClassName}
                  id="new-password"
                  minLength={6}
                  name="new-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </div>
              <div>
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor="confirm-password"
                >
                  Confirm new password
                </label>
                <input
                  autoComplete="new-password"
                  className={inputClassName}
                  id="confirm-password"
                  minLength={6}
                  name="confirm-password"
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  type="password"
                  value={confirmation}
                />
              </div>

              {error ? (
                <div
                  className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100 focus:outline-none focus:ring-2 focus:ring-red-300/50"
                  ref={errorRef}
                  role="alert"
                  tabIndex={-1}
                >
                  {error}
                </div>
              ) : null}

              <button
                className={primaryButtonClassName}
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
