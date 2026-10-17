import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../lib/auth-context";

const inputClassName =
  "mt-2 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30";
const primaryButtonClassName =
  "rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryLinkClassName =
  "inline-block rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10";

function messageForError(error: unknown) {
  if (error instanceof Error) {
    if (/failed to fetch|network|fetch/i.test(error.message)) {
      return "We couldn't reach the account service. Check your connection and try again.";
    }
    return error.message;
  }
  return "We couldn't send the reset link. Try again.";
}

export function ForgotPasswordPage() {
  const {
    isInitializing,
    isSupabaseEnabled,
    isSupabaseUnreachable,
    requestPasswordReset,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const isUnavailable = !isSupabaseEnabled || isSupabaseUnreachable;

  useEffect(() => {
    if (sentEmail) successRef.current?.focus();
  }, [sentEmail]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isUnavailable) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSentEmail(email);
    } catch (submittedError) {
      setError(messageForError(submittedError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing) {
    return (
      <section className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <p className="text-slate-300" role="status">
          Loading password reset…
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
          Reset your password
        </h1>
        <p className="mt-3 text-slate-300">
          Enter your account email and we’ll send you a link to set a new
          password.
        </p>

        {sentEmail ? (
          <div
            className="mt-6 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-4 text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300/50"
            ref={successRef}
            role="status"
            tabIndex={-1}
          >
            <h2 className="text-lg font-semibold text-white">
              Check your email
            </h2>
            <p className="mt-2 text-sm">
              If an account exists for {sentEmail}, a reset link is on its way.
              Open it and set a new password.
            </p>
            <Link className={`${secondaryLinkClassName} mt-4`} to="/account">
              Return to sign in
            </Link>
          </div>
        ) : (
          <>
            {isUnavailable ? (
              <div
                className="mt-4 rounded-lg border border-amber-glow/40 bg-amber-glow/10 p-3 text-sm text-amber-100"
                role="note"
              >
                {!isSupabaseEnabled
                  ? "Password reset is unavailable in this local preview because Supabase is not configured. The form is disabled until the account service is configured."
                  : "We couldn't reach the account service just now. The form is disabled until it responds."}
              </div>
            ) : null}

            <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
              <div>
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor="forgot-email"
                >
                  Email
                </label>
                <input
                  autoComplete="email"
                  className={inputClassName}
                  disabled={isUnavailable}
                  id="forgot-email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
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
                disabled={isSubmitting || isUnavailable}
                type="submit"
              >
                {isSubmitting ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <Link
              className="mt-5 inline-block text-sm font-semibold text-amber-glow transition hover:text-amber-100"
              to="/account"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
