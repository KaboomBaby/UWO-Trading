import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { useListingRepository } from "../../lib/listing-repository-context";
import {
  validateOfferInput,
  validateReportInput,
} from "../../services/listing-service";
import { isExpiredAt, useCurrentTime } from "../../lib/use-current-time";
import {
  LISTING_CURRENCIES,
  REPORT_REASONS,
  formatListingPrice,
  isNumericListingCurrency,
  type CreateOfferInput,
  type Listing,
  type ListingCurrency,
  type ReportReason,
} from "../../types/listing";

type DetailState =
  | { status: "ready"; requestedId: string; listing: Listing }
  | { status: "missing"; requestedId: string }
  | { status: "error"; requestedId: string; message: string };

type ListingVariant = "default" | "legacy" | "equipment" | "trade";

const listingVariants: Array<{
  value: ListingVariant;
  label: string;
  description: string;
}> = [
  {
    value: "default",
    label: "Default overview",
    description: "Core listing facts",
  },
  {
    value: "legacy",
    label: "Legacy provenance",
    description: "Heritage and collection context",
  },
  {
    value: "equipment",
    label: "Equipment specifications",
    description: "Compatibility and installation",
  },
  {
    value: "trade",
    label: "Trade negotiation",
    description: "Valuation and next actions",
  },
];

const currencyLabels = {
  ducats: "Ducats",
  UWC: "UWC",
  CT: "CT (Captain Tickets)",
  trade: "Trade / Barter",
  negotiable: "Negotiable",
} as const;

const reportReasonLabels = {
  prohibited: "Prohibited item or service",
  fraud: "Fraud or scam",
  spam: "Spam or duplicate listing",
  "wrong-server": "Wrong server",
  other: "Other concern",
} as const satisfies Record<ReportReason, string>;

const formInputClassName =
  "mt-2 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-2 text-sm text-red-200" id={id}>
      {message}
    </p>
  );
}

function formatCategory(category: Listing["category"]) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatExpirationDate(value: Listing["expiresAt"]) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function parseVariant(value: string | null) {
  if (!value) {
    return { variant: "default" as ListingVariant, isValid: true };
  }

  return listingVariants.some((variant) => variant.value === value)
    ? { variant: value as ListingVariant, isValid: true }
    : { variant: "default" as ListingVariant, isValid: false };
}

function VariantNavigation({
  listingId,
  selectedVariant,
}: {
  listingId: string;
  selectedVariant: ListingVariant;
}) {
  const detailPath = `/listings/${encodeURIComponent(listingId)}`;

  return (
    <nav aria-label="Listing presentations" className="mb-8">
      <ul className="flex flex-wrap gap-2">
        {listingVariants.map((variant) => {
          const isActive = variant.value === selectedVariant;
          const target =
            variant.value === "default"
              ? detailPath
              : `${detailPath}?variant=${variant.value}`;

          return (
            <li key={variant.value}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col rounded-xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-amber-glow/70 bg-amber-glow/15 text-white"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/25 hover:bg-white/10"
                }`}
                to={target}
              >
                <span className="text-sm font-semibold">{variant.label}</span>
                <span className="mt-1 text-xs text-slate-400">
                  {variant.description}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function LegacyPresentation({ listing }: { listing: Listing }) {
  const hasNumericPrice = listing.price !== null;
  const lowerValuation =
    listing.price === null ? null : Math.round(listing.price * 0.92);
  const upperValuation =
    listing.price === null ? null : Math.round(listing.price * 1.18);

  return (
    <section
      aria-labelledby="legacy-presentation"
      className="mt-6 rounded-2xl border border-amber-glow/30 bg-amber-glow/10 p-6 sm:p-8"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-glow">
        Heritage collection
      </p>
      <h2
        className="mt-3 text-2xl font-semibold text-white"
        id="legacy-presentation"
      >
        Heritage &amp; provenance
      </h2>
      <p className="mt-3 max-w-3xl text-slate-200">
        {listing.title} is presented as part of the Legacy Ship Collection, with
        its archive record, ownership chain, and collector-market position kept
        together for review.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Collection standing
          </h3>
          <p className="mt-2 text-white">
            Legacy Ship Collection · Archive candidate
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Heritage valuation band
          </h3>
          <p className="mt-2 text-white">
            {lowerValuation !== null && upperValuation !== null
              ? `${formatListingPrice(lowerValuation, listing.currency)} – ${formatListingPrice(
                  upperValuation,
                  listing.currency,
                )}`
              : "Value established through direct negotiation"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Provenance confidence
          </h3>
          <p className="mt-2 text-white">
            Seller archive record · Port verified
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Provenance timeline
          </h3>
          <ol className="mt-3 space-y-3 text-slate-200">
            <li className="rounded-lg border border-white/10 bg-ink/70 p-4">
              <span className="font-semibold text-white">Archive origin</span> ·{" "}
              {listing.location}
            </li>
            <li className="rounded-lg border border-white/10 bg-ink/70 p-4">
              <span className="font-semibold text-white">
                Recorded custodian
              </span>{" "}
              · {listing.seller}
            </li>
            <li className="rounded-lg border border-white/10 bg-ink/70 p-4">
              <span className="font-semibold text-white">
                Collection listing
              </span>{" "}
              ·{" "}
              {new Date(listing.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </li>
          </ol>
        </div>
        <aside className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Legacy-market context
          </h3>
          <p className="mt-2 text-slate-200">
            Collector demand rewards complete provenance, stable equipment, and
            a documented port history.{" "}
            {hasNumericPrice
              ? "The displayed band frames the asking price against comparable heritage listings."
              : "For trade or negotiable terms, value is established with the seller against comparable heritage listings."}
          </p>
        </aside>
      </div>
    </section>
  );
}

function EquipmentPresentation({ listing }: { listing: Listing }) {
  const installationEstimate =
    listing.price === null ? null : Math.round(listing.price * 0.025);
  const fittedCost =
    listing.price === null || installationEstimate === null
      ? null
      : listing.price + installationEstimate;

  return (
    <section
      aria-labelledby="equipment-presentation"
      className="mt-6 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-6 sm:p-8"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200">
        Component record
      </p>
      <h2
        className="mt-3 text-2xl font-semibold text-white"
        id="equipment-presentation"
      >
        Component specifications
      </h2>
      <p className="mt-3 max-w-3xl text-slate-200">
        Use this view to inspect {listing.title} as a component package: fit
        compatibility, installation requirements, stock condition, and total
        fitted cost.
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Compatibility
          </dt>
          <dd className="mt-2 text-white">
            {formatCategory(listing.category)} platforms · standard fittings
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Stock condition
          </dt>
          <dd className="mt-2 text-white">
            Seller-confirmed inventory · inspected
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Installation
          </dt>
          <dd className="mt-2 text-white">
            Dock installation ·{" "}
            {installationEstimate === null
              ? "quoted after inspection"
              : formatListingPrice(installationEstimate, listing.currency)}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Fitted cost
          </dt>
          <dd className="mt-2 text-white">
            {fittedCost === null
              ? "Agreed with the seller"
              : formatListingPrice(fittedCost, listing.currency)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 rounded-xl border border-white/10 bg-ink/70 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Equipment pricing context
        </h3>
        <p className="mt-2 text-slate-200">
          {listing.price === null
            ? "Exchange terms cover the component package listed by "
            : "The asking price covers the component package listed by "}
          {listing.seller}. Installation is quoted separately because labor and
          dock capacity vary by port.
        </p>
      </div>
    </section>
  );
}

function TradePresentation({ listing }: { listing: Listing }) {
  const hasNumericPrice = listing.price !== null;
  const portFee =
    listing.price === null ? null : Math.round(listing.price * 0.03);
  const escrowFee =
    listing.price === null ? null : Math.round(listing.price * 0.01);
  const settlementTotal =
    listing.price === null || portFee === null || escrowFee === null
      ? null
      : listing.price + portFee + escrowFee;

  return (
    <section
      aria-labelledby="trade-presentation"
      className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 sm:p-8"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">
        Negotiation desk
      </p>
      <h2
        className="mt-3 text-2xl font-semibold text-white"
        id="trade-presentation"
      >
        Trade valuation &amp; negotiation
      </h2>
      <p className="mt-3 max-w-3xl text-slate-200">
        Prepare a structured offer for {listing.seller} with{" "}
        {hasNumericPrice
          ? "the total cost of settlement and the actions needed before exchange."
          : "the agreed exchange terms and the actions needed before exchange."}
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Seller asks
          </dt>
          <dd className="mt-2 text-white">
            {formatListingPrice(listing.price, listing.currency)}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Port fees
          </dt>
          <dd className="mt-2 text-white">
            {portFee === null
              ? "Agreed during negotiation"
              : formatListingPrice(portFee, listing.currency)}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Escrow reserve
          </dt>
          <dd className="mt-2 text-white">
            {escrowFee === null
              ? "Agreed during negotiation"
              : formatListingPrice(escrowFee, listing.currency)}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Settlement total
          </dt>
          <dd className="mt-2 text-white">
            {settlementTotal === null
              ? "Recorded in the final exchange agreement"
              : formatListingPrice(settlementTotal, listing.currency)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Trade readiness
          </h3>
          <p className="mt-2 text-slate-200">
            Listing is available from {listing.location}. Confirm cargo space,
            sailing schedule, and inspection rights before fixing{" "}
            {hasNumericPrice ? "the final price" : "the final exchange terms"}.
          </p>
        </div>
        <aside className="rounded-xl border border-white/10 bg-ink/70 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Next actions
          </h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-200">
            <li>Open terms with {listing.seller}</li>
            <li>Request inspection at {listing.location}</li>
            <li>Fund escrow and confirm departure</li>
          </ol>
        </aside>
      </div>
    </section>
  );
}

function VariantPresentation({
  listing,
  variant,
}: {
  listing: Listing;
  variant: ListingVariant;
}) {
  if (variant === "legacy") {
    return <LegacyPresentation listing={listing} />;
  }
  if (variant === "equipment") {
    return <EquipmentPresentation listing={listing} />;
  }
  if (variant === "trade") {
    return <TradePresentation listing={listing} />;
  }
  return null;
}

type OfferFormState = {
  offererName: string;
  contact: string;
  currency: ListingCurrency;
  amount: string;
  offerText: string;
};

function createOfferForm(listing: Listing): OfferFormState {
  return {
    offererName: "",
    contact: "",
    currency: listing.currency,
    amount: "",
    offerText: "",
  };
}

function OfferSection({
  listing,
  isClosed,
}: {
  listing: Listing;
  isClosed: boolean;
}) {
  const repository = useListingRepository();
  const [form, setForm] = useState<OfferFormState>(() =>
    createOfferForm(listing),
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof OfferFormState, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasSubmittedOffer, setHasSubmittedOffer] = useState(false);
  const [offerCount, setOfferCount] = useState<number | null>(null);
  const [offerCountFailed, setOfferCountFailed] = useState(false);
  const [offerCountRefreshId, setOfferCountRefreshId] = useState(0);

  useEffect(() => {
    let active = true;

    repository
      .countOffers(listing.id)
      .then((count) => {
        if (active) setOfferCount(count);
      })
      .catch(() => {
        if (active) setOfferCountFailed(true);
      });

    return () => {
      active = false;
    };
  }, [listing.id, offerCountRefreshId, repository]);

  const numericCurrency = isNumericListingCurrency(form.currency);
  const errorCount = Object.values(errors).filter(Boolean).length;
  const countMessage = offerCountFailed
    ? "Offer count is unavailable right now."
    : offerCount === null
      ? "Loading offer count…"
      : `${offerCount} ${offerCount === 1 ? "offer" : "offers"} received so far.`;

  function updateOfferField<K extends keyof OfferFormState>(
    field: K,
    value: OfferFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateOfferCurrency(currency: ListingCurrency) {
    setForm((current) => ({
      ...current,
      currency,
      amount: isNumericListingCurrency(currency) ? current.amount : "",
    }));
    setErrors((current) => ({
      ...current,
      currency: undefined,
      amount: undefined,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: CreateOfferInput = {
      offererName: form.offererName,
      contact: form.contact,
      currency: form.currency,
      amount: numericCurrency
        ? form.amount.trim()
          ? Number(form.amount.trim())
          : null
        : null,
      offerText: form.offerText,
    };
    const validationErrors = validateOfferInput(input);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitError(null);
      setHasSubmittedOffer(false);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await repository.createOffer(listing.id, input);
      setForm(createOfferForm(listing));
      setErrors({});
      setHasSubmittedOffer(true);
      setOfferCountRefreshId((current) => current + 1);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to send your offer.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="offers-heading"
      className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"
    >
      <h2 className="text-2xl font-semibold text-white" id="offers-heading">
        Offers
      </h2>
      <p className="mt-2 text-slate-300" role="status">
        {countMessage}
      </p>
      <p className="mt-2 text-sm text-slate-400">
        Only the offer count is public. Individual offer details stay private
        between each buyer and the seller.
      </p>

      {isClosed ? (
        <p className="mt-6 rounded-lg border border-amber-glow/40 bg-amber-glow/10 p-3 text-sm text-amber-100">
          This listing is no longer accepting new offers.
        </p>
      ) : (
        <>
          {hasSubmittedOffer ? (
            <p
              className="mt-6 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-100"
              role="status"
            >
              Your offer was sent to {listing.seller}. They will reply using
              your contact details.
            </p>
          ) : null}
          <form
            aria-label="Make an offer form"
            className="mt-6 space-y-6"
            noValidate
            onSubmit={handleSubmit}
          >
            {errorCount > 0 ? (
              <p
                className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
                role="alert"
              >
                Please fix {errorCount} {errorCount === 1 ? "field" : "fields"}{" "}
                below before sending this offer.
              </p>
            ) : null}
            {submitError ? (
              <p
                className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
                role="alert"
              >
                {submitError}
              </p>
            ) : null}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor="offer-offerer-name"
                >
                  Your in-game name
                </label>
                <input
                  aria-describedby={
                    errors.offererName ? "offer-offerer-name-error" : undefined
                  }
                  aria-invalid={Boolean(errors.offererName)}
                  className={formInputClassName}
                  id="offer-offerer-name"
                  name="offererName"
                  onChange={(event) =>
                    updateOfferField("offererName", event.target.value)
                  }
                  placeholder="HarborTrader"
                  required
                  type="text"
                  value={form.offererName}
                />
                <FieldError
                  id="offer-offerer-name-error"
                  message={errors.offererName}
                />
              </div>
              <div>
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor="offer-contact"
                >
                  Contact details
                </label>
                <input
                  aria-describedby={
                    errors.contact ? "offer-contact-error" : undefined
                  }
                  aria-invalid={Boolean(errors.contact)}
                  className={formInputClassName}
                  id="offer-contact"
                  name="contact"
                  onChange={(event) =>
                    updateOfferField("contact", event.target.value)
                  }
                  placeholder="In-game mail or Discord"
                  required
                  type="text"
                  value={form.contact}
                />
                <FieldError id="offer-contact-error" message={errors.contact} />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor="offer-currency"
                >
                  Offer currency
                </label>
                <select
                  aria-describedby={
                    errors.currency ? "offer-currency-error" : undefined
                  }
                  aria-invalid={Boolean(errors.currency)}
                  className={formInputClassName}
                  id="offer-currency"
                  name="currency"
                  onChange={(event) =>
                    updateOfferCurrency(event.target.value as ListingCurrency)
                  }
                  required
                  value={form.currency}
                >
                  {LISTING_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currencyLabels[currency]}
                    </option>
                  ))}
                </select>
                <FieldError
                  id="offer-currency-error"
                  message={errors.currency}
                />
              </div>
              {numericCurrency ? (
                <div>
                  <label
                    className="text-sm font-semibold text-slate-200"
                    htmlFor="offer-amount"
                  >
                    Amount ({currencyLabels[form.currency]})
                  </label>
                  <input
                    aria-describedby={
                      errors.amount ? "offer-amount-error" : undefined
                    }
                    aria-invalid={Boolean(errors.amount)}
                    className={formInputClassName}
                    id="offer-amount"
                    inputMode={form.currency === "CT" ? "numeric" : "decimal"}
                    min={form.currency === "CT" ? "1" : "0.01"}
                    name="amount"
                    onChange={(event) =>
                      updateOfferField("amount", event.target.value)
                    }
                    placeholder="45000000"
                    required
                    step={form.currency === "CT" ? "1" : "any"}
                    type="number"
                    value={form.amount}
                  />
                  <FieldError id="offer-amount-error" message={errors.amount} />
                </div>
              ) : null}
            </div>

            <div>
              <label
                className="text-sm font-semibold text-slate-200"
                htmlFor="offer-text"
              >
                Your offer
              </label>
              <textarea
                aria-describedby={
                  errors.offerText ? "offer-text-error" : undefined
                }
                aria-invalid={Boolean(errors.offerText)}
                className={`${formInputClassName} min-h-28 resize-y`}
                id="offer-text"
                name="offerText"
                onChange={(event) =>
                  updateOfferField("offerText", event.target.value)
                }
                placeholder="Describe the offer, trade terms, or questions for the seller."
                required
                rows={4}
                value={form.offerText}
              />
              <FieldError id="offer-text-error" message={errors.offerText} />
            </div>

            <button
              className="rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Sending offer…" : "Send offer"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}

type ReportFormState = {
  reporterName: string;
  reason: ReportReason | "";
  details: string;
};

function ReportSection({ listing }: { listing: Listing }) {
  const repository = useListingRepository();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [form, setForm] = useState<ReportFormState>({
    reporterName: "",
    reason: "",
    details: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof ReportFormState, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasSubmittedReport, setHasSubmittedReport] = useState(false);
  const errorCount = Object.values(errors).filter(Boolean).length;

  function updateReportField<K extends keyof ReportFormState>(
    field: K,
    value: ReportFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const reason = form.reason;
    const validationErrors: Partial<Record<keyof ReportFormState, string>> =
      validateReportInput({
        reporterName: form.reporterName,
        reason: reason === "" ? "other" : reason,
        details: form.details,
      });
    if (reason === "") {
      validationErrors.reason = "Choose a reason for this report.";
      setErrors(validationErrors);
      setSubmitError(null);
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitError(null);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await repository.report(listing.id, {
        reporterName: form.reporterName,
        reason,
        details: form.details,
      });
      setForm({ reporterName: "", reason: "", details: "" });
      setErrors({});
      setHasSubmittedReport(true);
      setIsReportOpen(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to send your report.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="report-heading"
      className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"
    >
      <h2 className="text-2xl font-semibold text-white" id="report-heading">
        Report a concern
      </h2>
      <p className="mt-2 text-slate-300">
        Report listings that violate marketplace rules. Reports are reviewed by
        moderators and are never shown on the public listing.
      </p>

      {hasSubmittedReport ? (
        <p
          className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-100"
          role="status"
        >
          Thank you. Your report was submitted for review.
        </p>
      ) : null}

      <button
        aria-controls="report-listing-form"
        aria-expanded={isReportOpen}
        className="mt-4 rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
        onClick={() => setIsReportOpen((current) => !current)}
        type="button"
      >
        {isReportOpen ? "Cancel report" : "Report this listing"}
      </button>

      {isReportOpen ? (
        <form
          aria-label="Report listing form"
          className="mt-6 space-y-6"
          id="report-listing-form"
          noValidate
          onSubmit={handleSubmit}
        >
          {errorCount > 0 ? (
            <p
              className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
              role="alert"
            >
              Please fix {errorCount} {errorCount === 1 ? "field" : "fields"}{" "}
              below before sending this report.
            </p>
          ) : null}
          {submitError ? (
            <p
              className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                className="text-sm font-semibold text-slate-200"
                htmlFor="report-reporter-name"
              >
                Your name
              </label>
              <input
                aria-describedby={
                  errors.reporterName ? "report-reporter-name-error" : undefined
                }
                aria-invalid={Boolean(errors.reporterName)}
                className={formInputClassName}
                id="report-reporter-name"
                name="reporterName"
                onChange={(event) =>
                  updateReportField("reporterName", event.target.value)
                }
                placeholder="Port Observer"
                required
                type="text"
                value={form.reporterName}
              />
              <FieldError
                id="report-reporter-name-error"
                message={errors.reporterName}
              />
            </div>
            <div>
              <label
                className="text-sm font-semibold text-slate-200"
                htmlFor="report-reason"
              >
                Reason
              </label>
              <select
                aria-describedby={
                  errors.reason ? "report-reason-error" : undefined
                }
                aria-invalid={Boolean(errors.reason)}
                className={formInputClassName}
                id="report-reason"
                name="reason"
                onChange={(event) =>
                  updateReportField(
                    "reason",
                    event.target.value as ReportReason | "",
                  )
                }
                required
                value={form.reason}
              >
                <option value="">Select a reason</option>
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reportReasonLabels[reason]}
                  </option>
                ))}
              </select>
              <FieldError id="report-reason-error" message={errors.reason} />
            </div>
          </div>

          <div>
            <label
              className="text-sm font-semibold text-slate-200"
              htmlFor="report-details"
            >
              Details (optional)
            </label>
            <textarea
              aria-describedby={
                errors.details ? "report-details-error" : undefined
              }
              aria-invalid={Boolean(errors.details)}
              className={`${formInputClassName} min-h-28 resize-y`}
              id="report-details"
              name="details"
              onChange={(event) =>
                updateReportField("details", event.target.value)
              }
              placeholder="Add any helpful context for moderators."
              rows={4}
              value={form.details}
            />
            <FieldError id="report-details-error" message={errors.details} />
          </div>

          <button
            className="rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Submitting report…" : "Submit report"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

export function ListingDetailPage() {
  const { listingId } = useParams();
  const [searchParams] = useSearchParams();
  const repository = useListingRepository();
  const [state, setState] = useState<DetailState | null>(null);
  const currentTime = useCurrentTime();
  const requestedId = listingId ?? "";
  const { variant, isValid } = parseVariant(searchParams.get("variant"));

  useEffect(() => {
    let active = true;

    repository
      .get(requestedId)
      .then((listing) => {
        if (!active) return;
        setState(
          listing
            ? { status: "ready", requestedId, listing }
            : { status: "missing", requestedId },
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          requestedId,
          message:
            error instanceof Error ? error.message : "Unable to load listing.",
        });
      });

    return () => {
      active = false;
    };
  }, [requestedId, repository]);

  if (!state || state.requestedId !== requestedId) {
    return (
      <section
        aria-busy="true"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6"
      >
        <p className="text-lg text-slate-300" role="status">
          Loading listing…
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-white">
            Listing could not load
          </h1>
          <p className="mt-3 text-red-100">{state.message}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/browse"
            className="rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90"
          >
            Browse listings
          </Link>
          <Link
            to="/post"
            className="rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
          >
            Post your own listing
          </Link>
        </div>
      </section>
    );
  }

  if (state.status === "missing") {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-glow">
            Not found
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Listing not found
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            This listing is not available from the active repository. It may
            have been removed, or the link may be outdated.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/browse"
            className="rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90"
          >
            Browse listings
          </Link>
          <Link
            to="/post"
            className="rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
          >
            Post your own listing
          </Link>
        </div>
      </section>
    );
  }

  const { listing } = state;
  const isExpired = isExpiredAt(listing.expiresAt, currentTime);

  return (
    <section
      aria-labelledby="listing-title"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6"
    >
      <VariantNavigation listingId={listing.id} selectedVariant={variant} />
      {isExpired ? (
        <div
          className="mb-6 rounded-xl border border-amber-glow/50 bg-amber-glow/10 p-4"
          role="status"
        >
          <p className="font-semibold text-amber-glow">
            This listing has expired
          </p>
          <p className="mt-2 text-amber-100">
            It expired on {formatExpirationDate(listing.expiresAt)} and is kept
            here for reference. It is no longer included in browse results.
          </p>
        </div>
      ) : null}
      {!isValid ? (
        <p
          className="mb-6 rounded-xl border border-amber-glow/40 bg-amber-glow/10 p-4 text-sm text-amber-100"
          role="alert"
        >
          Unknown listing presentation. Showing the safe Default overview
          instead.
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <span
            aria-label={`${listing.title} visual`}
            className="text-7xl sm:text-8xl"
            role="img"
          >
            {listing.imageEmoji}
          </span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {listing.soldAt ? (
              <span className="rounded-full bg-red-500/20 px-3 py-1 font-semibold uppercase tracking-wide text-red-100">
                SOLD
              </span>
            ) : null}
            <span className="rounded-full bg-amber-glow/15 px-3 py-1 font-semibold text-amber-glow">
              {formatCategory(listing.category)}
            </span>
            <span className="text-slate-400">Listed in {listing.location}</span>
          </div>
          <h1
            id="listing-title"
            className="mt-4 text-3xl font-semibold text-white sm:text-4xl"
          >
            {listing.title}
          </h1>
          <p className="mt-4 text-2xl font-semibold text-amber-glow">
            {formatListingPrice(listing.price, listing.currency)}
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Seller
              </dt>
              <dd className="mt-1 text-white">{listing.seller}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Location
              </dt>
              <dd className="mt-1 text-white">{listing.location}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Server
              </dt>
              <dd className="mt-1 text-white">{listing.server}</dd>
            </div>
          </dl>
          {listing.contactNote.trim() ? (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Contact
              </h2>
              <p className="mt-2 leading-relaxed text-slate-200">
                {listing.contactNote.trim()}
              </p>
            </div>
          ) : null}
          <div className="mt-6 border-t border-white/10 pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Description
            </h2>
            <p className="mt-2 leading-relaxed text-slate-200">
              {listing.description}
            </p>
          </div>
        </div>
      </div>

      <VariantPresentation listing={listing} variant={variant} />

      <OfferSection
        isClosed={Boolean(listing.soldAt) || isExpired}
        key={`offers-${listing.id}`}
        listing={listing}
      />
      <ReportSection key={`report-${listing.id}`} listing={listing} />

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/browse"
          className="rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90"
        >
          Browse listings
        </Link>
        <Link
          to="/post"
          className="rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
        >
          Post your own listing
        </Link>
      </div>
    </section>
  );
}
