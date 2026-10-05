import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useTradingRepository } from "../../../lib/trading-repository-context";
import type {
  PriceAlert,
  PriceAlertDirection,
  PriceAlertStatus,
} from "../../../types/trading";

type AlertStatusFilter = PriceAlertStatus | "all";
type AlertResult =
  | {
      query: { status: AlertStatusFilter };
      reloadToken: number;
      status: "success";
      alerts: PriceAlert[];
    }
  | {
      query: { status: AlertStatusFilter };
      reloadToken: number;
      status: "error";
    };

type CreateForm = {
  itemName: string;
  targetPrice: string;
  direction: PriceAlertDirection;
  note: string;
};

const STATUS_FILTERS: Array<{
  value: AlertStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "triggered", label: "Triggered" },
];

const EMPTY_FORM: CreateForm = {
  itemName: "",
  targetPrice: "",
  direction: "above",
  note: "",
};

const priceFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function isAlertStatus(value: string): value is PriceAlertStatus {
  return value === "active" || value === "paused" || value === "triggered";
}

function parseStatus(value: string | null): AlertStatusFilter {
  return value !== null && isAlertStatus(value) ? value : "all";
}

function validateForm(form: CreateForm) {
  const errors: Partial<Record<keyof CreateForm, string>> = {};
  if (form.itemName.trim().length < 2) {
    errors.itemName = "Item name must be at least 2 characters.";
  }

  const targetPrice = Number(form.targetPrice);
  if (!form.targetPrice.trim() || !Number.isFinite(targetPrice)) {
    errors.targetPrice = "Target price must be a valid number.";
  } else if (targetPrice <= 0) {
    errors.targetPrice = "Target price must be greater than zero.";
  }

  if (form.direction !== "above" && form.direction !== "below") {
    errors.direction = "Choose an alert direction.";
  }

  return errors;
}

function statusClassName(status: PriceAlertStatus) {
  if (status === "active") {
    return "bg-sea-blue/25 text-slate-100";
  }
  if (status === "paused") {
    return "bg-white/10 text-slate-300";
  }
  return "bg-amber-glow/20 text-amber-glow";
}

export function PriceAlertsPage() {
  const repository = useTradingRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get("status");
  const status = parseStatus(rawStatus);
  const [result, setResult] = useState<AlertResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CreateForm, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionErrorScope, setActionErrorScope] =
    useState<AlertStatusFilter | null>(null);
  const mutationsActiveRef = useRef(true);

  const query = useMemo(() => ({ status }), [status]);
  const currentResult =
    result?.query === query && result.reloadToken === reloadToken
      ? result
      : null;
  const alerts =
    currentResult?.status === "success" ? currentResult.alerts : [];
  const isLoading = !currentResult;
  const error = currentResult?.status === "error";
  const alertLabel = alerts.length === 1 ? "alert" : "alerts";
  const statusQualifier = status === "all" ? "" : ` ${status}`;

  useEffect(() => {
    const canonicalParams = new URLSearchParams();
    if (status !== "all") canonicalParams.set("status", status);
    if (searchParams.toString() !== canonicalParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
  }, [searchParams, setSearchParams, status]);

  useEffect(() => {
    mutationsActiveRef.current = true;

    return () => {
      mutationsActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    repository
      .listAlerts(query)
      .then((nextAlerts) => {
        if (isActive) {
          setResult({
            query,
            reloadToken,
            status: "success",
            alerts: nextAlerts,
          });
        }
      })
      .catch(() => {
        if (isActive) {
          setResult({ query, reloadToken, status: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, [query, reloadToken, repository]);

  const statusPath = useCallback((nextStatus: AlertStatusFilter) => {
    const nextParams = new URLSearchParams();
    if (nextStatus === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", nextStatus);
    }
    const nextSearch = nextParams.toString();
    return nextSearch
      ? `/trading/price-alerts?${nextSearch}`
      : "/trading/price-alerts";
  }, []);

  const updateField = (field: keyof CreateForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
    setFormSuccess(null);
  };

  const submitAlert = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(form);
    setFieldErrors(errors);
    setFormError(null);
    setFormSuccess(null);
    if (Object.values(errors).some(Boolean)) return;

    setIsCreating(true);
    try {
      await repository.createAlert({
        itemName: form.itemName.trim(),
        targetPrice: Number(form.targetPrice),
        direction: form.direction,
        note: form.note.trim(),
      });
      if (!mutationsActiveRef.current) return;
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setFormSuccess(
        "Alert created. New alerts start active and are stored in local memory.",
      );
      setReloadToken((token) => token + 1);
    } catch {
      if (!mutationsActiveRef.current) return;
      setFormError("The alert could not be created. Please try again.");
    } finally {
      if (mutationsActiveRef.current) setIsCreating(false);
    }
  };

  const updateAlertStatus = async (
    id: string,
    nextStatus: PriceAlertStatus,
  ) => {
    setUpdatingId(id);
    setActionError(null);
    setActionErrorScope(null);
    try {
      await repository.setAlertStatus(id, nextStatus);
      if (!mutationsActiveRef.current) return;
      setReloadToken((token) => token + 1);
    } catch {
      if (!mutationsActiveRef.current) return;
      setActionError("The alert status could not be changed. Try again.");
      setActionErrorScope(status);
    } finally {
      if (mutationsActiveRef.current) setUpdatingId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Price alerts</h1>
          <p className="mt-2 text-slate-300">
            Watch target prices and act when the market moves.
          </p>
        </div>
        <p
          className="text-sm text-slate-300"
          aria-live="polite"
          data-testid="alert-count"
        >
          {error
            ? "Alerts unavailable"
            : isLoading
              ? "Loading alerts…"
              : `${alerts.length}${statusQualifier} ${alertLabel}`}
        </p>
      </div>

      <p className="mt-4 rounded-xl border border-sea-blue/30 bg-sea-blue/10 px-4 py-3 text-sm text-slate-200">
        Alerts use local-memory persistence for this milestone. They remain in
        this preview session but reset when the page reloads.
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[380px_1fr]">
        <form
          onSubmit={submitAlert}
          noValidate
          className="h-fit rounded-2xl border border-white/10 bg-ink/60 p-5"
          aria-labelledby="create-alert-heading"
        >
          <h2
            id="create-alert-heading"
            className="text-xl font-semibold text-white"
          >
            Create an alert
          </h2>
          <div className="mt-5 grid gap-4">
            <label
              htmlFor="alert-item-name"
              className="grid gap-2 text-sm font-medium text-slate-200"
            >
              Item name
              <input
                id="alert-item-name"
                type="text"
                value={form.itemName}
                onChange={(event) =>
                  updateField("itemName", event.target.value)
                }
                aria-invalid={Boolean(fieldErrors.itemName)}
                aria-describedby={
                  fieldErrors.itemName ? "alert-item-name-error" : undefined
                }
                placeholder="Pepper"
                className="rounded-xl border border-white/15 bg-ink/70 px-4 py-2.5 text-base text-white placeholder:text-slate-400 focus:border-amber-glow focus:outline-none"
              />
            </label>
            {fieldErrors.itemName && (
              <p
                id="alert-item-name-error"
                className="-mt-2 text-sm text-red-300"
              >
                {fieldErrors.itemName}
              </p>
            )}

            <label
              htmlFor="alert-target-price"
              className="grid gap-2 text-sm font-medium text-slate-200"
            >
              Target price (gold)
              <input
                id="alert-target-price"
                type="number"
                min="1"
                step="any"
                value={form.targetPrice}
                onChange={(event) =>
                  updateField("targetPrice", event.target.value)
                }
                aria-invalid={Boolean(fieldErrors.targetPrice)}
                aria-describedby={
                  fieldErrors.targetPrice
                    ? "alert-target-price-error"
                    : undefined
                }
                placeholder="4000"
                className="rounded-xl border border-white/15 bg-ink/70 px-4 py-2.5 text-base text-white placeholder:text-slate-400 focus:border-amber-glow focus:outline-none"
              />
            </label>
            {fieldErrors.targetPrice && (
              <p
                id="alert-target-price-error"
                className="-mt-2 text-sm text-red-300"
              >
                {fieldErrors.targetPrice}
              </p>
            )}

            <fieldset
              aria-describedby={
                fieldErrors.direction ? "alert-direction-error" : undefined
              }
              className="grid gap-2 border-0 p-0"
              role="radiogroup"
            >
              <legend className="text-sm font-medium text-slate-200">
                Direction
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["above", "below"] as const).map((direction) => (
                  <label
                    key={direction}
                    className="flex items-center gap-2 rounded-xl border border-white/15 bg-ink/70 px-4 py-2.5 text-sm text-slate-200"
                  >
                    <input
                      type="radio"
                      name="alert-direction"
                      value={direction}
                      checked={form.direction === direction}
                      onChange={() => updateField("direction", direction)}
                      aria-describedby={
                        fieldErrors.direction
                          ? "alert-direction-error"
                          : undefined
                      }
                      aria-invalid={Boolean(fieldErrors.direction)}
                    />
                    {direction === "above" ? "Above target" : "Below target"}
                  </label>
                ))}
              </div>
              {fieldErrors.direction && (
                <p className="text-sm text-red-300" id="alert-direction-error">
                  {fieldErrors.direction}
                </p>
              )}
            </fieldset>

            <label
              htmlFor="alert-note"
              className="grid gap-2 text-sm font-medium text-slate-200"
            >
              Note
              <textarea
                id="alert-note"
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                rows={3}
                placeholder="Why does this price matter?"
                className="rounded-xl border border-white/15 bg-ink/70 px-4 py-2.5 text-base text-white placeholder:text-slate-400 focus:border-amber-glow focus:outline-none"
              />
            </label>

            {formError && (
              <p role="alert" className="text-sm text-red-300">
                {formError}
              </p>
            )}
            {formSuccess && (
              <p role="status" className="text-sm text-emerald-300">
                {formSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={isCreating}
              className="rounded-xl bg-amber-glow px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
            >
              {isCreating ? "Creating…" : "Create alert"}
            </button>
          </div>
        </form>

        <div>
          <div
            className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-ink/60 p-4"
            role="group"
            aria-label="Filter alerts by status"
          >
            {STATUS_FILTERS.map((filter) => (
              <Link
                key={filter.value}
                to={statusPath(filter.value)}
                aria-current={status === filter.value ? "true" : undefined}
                className={
                  status === filter.value
                    ? "rounded-full bg-amber-glow px-4 py-2 text-sm font-semibold text-ink"
                    : "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/10"
                }
              >
                {filter.label}
              </Link>
            ))}
          </div>

          {actionError && actionErrorScope === status && (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {actionError}
            </p>
          )}

          <div className="mt-5">
            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-400/40 bg-red-500/10 p-8 text-center"
              >
                <p className="text-4xl" aria-hidden="true">
                  🌊
                </p>
                <h2 className="mt-3 text-xl font-semibold text-white">
                  Alerts could not be loaded. Please try again.
                </h2>
                <button
                  type="button"
                  onClick={() => setReloadToken((token) => token + 1)}
                  className="mt-5 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Try again
                </button>
              </div>
            ) : isLoading ? (
              <div aria-busy="true">
                <p className="sr-only">Loading alerts…</p>
                <ul className="grid gap-4">
                  {Array.from({ length: 3 }, (_, index) => (
                    <li
                      key={index}
                      className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                    />
                  ))}
                </ul>
              </div>
            ) : alerts.length > 0 ? (
              <ul className="grid gap-4">
                {alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {alert.itemName}
                        </h3>
                        <dl className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                          <div>
                            <dt className="text-slate-400">Target price</dt>
                            <dd className="mt-1 text-base font-semibold text-amber-glow">
                              {priceFormatter.format(alert.targetPrice)} gold
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Direction</dt>
                            <dd className="mt-1 text-base text-white">
                              {alert.direction === "above"
                                ? "Above target"
                                : "Below target"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClassName(alert.status)}`}
                        >
                          {alert.status}
                        </span>
                        <button
                          type="button"
                          disabled={updatingId === alert.id}
                          onClick={() =>
                            updateAlertStatus(
                              alert.id,
                              alert.status === "active" ? "paused" : "active",
                            )
                          }
                          className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                        >
                          {updatingId === alert.id
                            ? "Updating…"
                            : alert.status === "active"
                              ? "Pause"
                              : "Resume"}
                        </button>
                      </div>
                    </div>
                    {alert.note && (
                      <p className="mt-4 border-l-2 border-white/20 pl-3 text-sm text-slate-300">
                        {alert.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
                <p className="text-5xl" aria-hidden="true">
                  🔔
                </p>
                <h2 className="mt-4 text-xl font-semibold text-white">
                  No {status === "all" ? "" : `${status} `}
                  alerts
                </h2>
                <p className="mx-auto mt-2 max-w-md text-slate-300">
                  {status === "all"
                    ? "Create your first target to follow prices across ports."
                    : `Switch filters or create a new target to see ${status} alerts.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
