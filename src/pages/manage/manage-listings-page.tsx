import { useEffect, useRef, useState } from "react";

import { useListingRepository } from "../../lib/listing-repository-context";
import { isExpiredAt, useCurrentTime } from "../../lib/use-current-time";
import { shipSkillIconUrl } from "../../data/ship-skills";
import {
  ShipDetailsForm,
  emptyShipForm,
  shipDetailsFromForm,
  shipFormFromDetails,
  validateShipForm,
  type ShipFormErrors,
  type ShipFormState,
} from "../../components/ships/ship-details-form";
import {
  LISTING_CATEGORIES,
  LISTING_CURRENCIES,
  formatListingPrice,
  isNumericListingCurrency,
  type Listing,
  type ListingCategory,
  type ListingCollection,
  type ListingCurrency,
  type Offer,
  type ShipDetails,
  type UpdateListingInput,
} from "../../types/listing";

type FormState = {
  title: string;
  category: ListingCategory;
  currency: ListingCurrency;
  price: string;
  description: string;
  seller: string;
  location: string;
  server: string;
  contactNote: string;
  emoji: string;
  collection: ListingCollection;
  ship: ShipFormState;
};

type ManageFormErrors = Partial<Record<keyof FormState, string>> &
  ShipFormErrors;

type PendingAction = "save" | "mark-sold" | "renew" | "delete";

type PendingOfferAction = {
  offerId: string;
  action: "accept" | "decline";
};

const currencyLabels = {
  ducats: "Ducats",
  UWC: "UWC",
  CT: "CT (Captain Tickets)",
  trade: "Trade / Barter",
  negotiable: "Negotiable",
} as const;

const collectionLabels = {
  current: "Current collection",
  legacy: "Legacy collection",
} as const;

const inputClassName =
  "mt-2 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30";

const primaryButtonClassName =
  "rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClassName =
  "rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60";

const dangerButtonClassName =
  "rounded-lg border border-red-400/50 bg-red-500/10 px-4 py-2 font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60";

function formatCategory(category: ListingCategory) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formStateFromListing(listing: Listing): FormState {
  return {
    title: listing.title,
    category: listing.category,
    currency: listing.currency,
    price: listing.price === null ? "" : String(listing.price),
    description: listing.description,
    seller: listing.seller,
    location: listing.location,
    server: listing.server,
    contactNote: listing.contactNote,
    emoji: listing.imageEmoji,
    collection: listing.collection ?? "current",
    ship: shipFormFromDetails(listing.shipDetails),
  };
}

function validate(form: FormState): ManageFormErrors {
  const errors: ManageFormErrors = {};
  const title = form.title.trim();
  const description = form.description.trim();
  const seller = form.seller.trim();
  const location = form.location.trim();
  const server = form.server.trim();
  const numericCurrency = isNumericListingCurrency(form.currency);

  if (title.length < 3) {
    errors.title = "Title must be at least 3 characters.";
  }
  if (numericCurrency) {
    const price = Number(form.price.trim());
    if (!form.price.trim()) {
      errors.price = "Price is required.";
    } else if (!Number.isFinite(price) || price <= 0) {
      errors.price = "Price must be a number greater than zero.";
    } else if (form.currency === "CT" && !Number.isInteger(price)) {
      errors.price = "Captain Tickets must be a whole number.";
    }
  }
  if (description.length < 10) {
    errors.description = "Description must be at least 10 characters.";
  }
  if (!seller) {
    errors.seller = "Seller is required.";
  }
  if (!location) {
    errors.location = "Location is required.";
  }
  if (!server) {
    errors.server = "Server is required.";
  }
  if (form.category === "ships") {
    Object.assign(errors, validateShipForm(form.ship));
  }

  return errors;
}

function updateInputFromForm(form: FormState): UpdateListingInput {
  const emoji = form.emoji.trim();
  return {
    title: form.title.trim(),
    category: form.category,
    currency: form.currency,
    price: isNumericListingCurrency(form.currency)
      ? Number(form.price.trim())
      : null,
    description: form.description.trim(),
    seller: form.seller.trim(),
    location: form.location.trim(),
    server: form.server.trim(),
    contactNote: form.contactNote.trim(),
    imageEmoji: emoji || "📦",
    collection: form.collection,
    shipDetails:
      form.category === "ships" ? shipDetailsFromForm(form.ship) : null,
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-2 text-sm text-red-200" id={id}>
      {message}
    </p>
  );
}

function formatListingDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
}

function ShipSkillsSummary({
  shipDetails,
}: {
  shipDetails: ShipDetails | null | undefined;
}) {
  if (!shipDetails) return null;

  const skills = [
    ...(shipDetails.originalSkill
      ? [{ ...shipDetails.originalSkill, isOriginal: true }]
      : []),
    ...shipDetails.optionalSkills.map((skill) => ({
      ...skill,
      isOriginal: false,
    })),
  ];

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Ship skills
      </h4>
      {skills.length === 0 ? (
        <p className="mt-2 text-sm text-slate-300">No ship skills selected.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-3">
          {skills.map((skill) => (
            <li
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              key={`${skill.isOriginal ? "original" : "optional"}-${skill.iconId}`}
            >
              <img
                alt=""
                className="h-8 w-8 rounded border border-white/15 bg-black/30 object-contain"
                src={shipSkillIconUrl(skill.iconId)}
              />
              <div>
                <p className="text-sm font-medium text-white">{skill.name}</p>
                <p className="text-xs uppercase tracking-wide text-amber-glow">
                  {skill.isOriginal ? "Original" : "Optional"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatOfferStatus(status: Offer["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function errorMessage(error: unknown, action: string) {
  return error instanceof Error
    ? `Unable to ${action}: ${error.message}`
    : `Unable to ${action}.`;
}

export function ManageListingsPage() {
  const repository = useListingRepository();
  const currentTime = useCurrentTime();
  const [editCode, setEditCode] = useState("");
  const [activeEditCode, setActiveEditCode] = useState("");
  const [listing, setListing] = useState<Listing | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [offerFeedback, setOfferFeedback] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [errors, setErrors] = useState<ManageFormErrors>({});
  const [errorAnnouncementId, setErrorAnnouncementId] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [pendingOfferAction, setPendingOfferAction] =
    useState<PendingOfferAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deletedEditCode, setDeletedEditCode] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLParagraphElement | null>(null);
  const summaryHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const shouldFocusSummaryRef = useRef(false);
  const errorCount = Object.values(errors).filter(Boolean).length;

  useEffect(() => {
    if (errorAnnouncementId > 0) {
      errorSummaryRef.current?.focus();
    }
  }, [errorAnnouncementId]);

  useEffect(() => {
    if (shouldFocusSummaryRef.current) {
      shouldFocusSummaryRef.current = false;
      summaryHeadingRef.current?.focus();
    }
  }, [listing?.id]);

  async function handleLookup(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (isLookingUp) return;

    const nextEditCode = editCode.trim();
    if (!nextEditCode) {
      setLookupError("Enter the edit code from your listing confirmation.");
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    setDeletedEditCode(null);
    setOffers([]);
    setOffersError(null);
    setOfferFeedback(null);
    setIsLoadingOffers(false);
    setPendingOfferAction(null);
    try {
      const nextListing = await repository.findByEditCode(nextEditCode);
      if (!nextListing) {
        setLookupError(
          "No listing was found for that edit code. Check the code and try again.",
        );
        return;
      }

      shouldFocusSummaryRef.current = true;
      setActiveEditCode(nextEditCode);
      setListing(nextListing);
      setForm(formStateFromListing(nextListing));
      setErrors({});
      setActionError(null);
      setActionFeedback(null);
      setIsConfirmingDelete(false);

      setIsLoadingOffers(true);
      try {
        setOffers(await repository.listOffers(nextEditCode));
      } catch (error) {
        setOffersError(errorMessage(error, "load offers"));
      } finally {
        setIsLoadingOffers(false);
      }
    } catch (error) {
      setLookupError(errorMessage(error, "load this listing"));
    } finally {
      setIsLookingUp(false);
    }
  }

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    if (!form) return;

    setForm({ ...form, [field]: value });
    setErrors((current) => ({ ...current, [field]: undefined }));
    setActionError(null);
    setActionFeedback(null);
  }

  function updateCurrency(currency: ListingCurrency) {
    if (!form) return;

    setForm({
      ...form,
      currency,
      price: isNumericListingCurrency(currency) ? form.price : "",
    });
    setErrors((current) => ({
      ...current,
      currency: undefined,
      price: undefined,
    }));
    setActionError(null);
    setActionFeedback(null);
  }

  function updateCategory(category: ListingCategory) {
    if (!form) return;

    setForm({
      ...form,
      category,
      ship: category === "ships" ? form.ship : { ...emptyShipForm },
    });
    setErrors((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.keys(emptyShipForm).map((field) => [field, undefined]),
      ),
    }));
    setActionError(null);
    setActionFeedback(null);
  }

  function updateShipField<K extends keyof ShipFormState>(
    field: K,
    value: ShipFormState[K],
  ) {
    if (!form) return;

    setForm({ ...form, ship: { ...form.ship, [field]: value } });
    setErrors((current) => ({ ...current, [field]: undefined }));
    setActionError(null);
    setActionFeedback(null);
  }

  function listingActionDidSucceed(listing: Listing, message: string) {
    setListing(listing);
    setForm(formStateFromListing(listing));
    setActionError(null);
    setActionFeedback(message);
  }

  async function refreshOffers(): Promise<void> {
    if (!activeEditCode || isLoadingOffers || pendingOfferAction) return;

    setIsLoadingOffers(true);
    setOffersError(null);
    setOfferFeedback(null);
    try {
      setOffers(await repository.listOffers(activeEditCode));
    } catch (error) {
      setOffersError(errorMessage(error, "load offers"));
    } finally {
      setIsLoadingOffers(false);
    }
  }

  async function updateOfferStatus(
    offer: Offer,
    action: PendingOfferAction["action"],
  ): Promise<void> {
    if (!activeEditCode || isLoadingOffers || pendingOfferAction) return;

    setPendingOfferAction({ offerId: offer.id, action });
    setOffersError(null);
    setOfferFeedback(null);
    try {
      const updatedOffer =
        action === "accept"
          ? await repository.acceptOffer(activeEditCode, offer.id)
          : await repository.declineOffer(activeEditCode, offer.id);
      setOffers((current) =>
        current.map((item) =>
          item.id === updatedOffer.id ? updatedOffer : item,
        ),
      );
      setOfferFeedback(
        `Offer from ${updatedOffer.offererName} ${updatedOffer.status}.`,
      );
    } catch (error) {
      setOffersError(errorMessage(error, `${action} this offer`));
    } finally {
      setPendingOfferAction(null);
    }
  }

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (!form || !listing || pendingAction) return;

    const nextErrors = validate(form);
    setErrors(nextErrors);
    setActionError(null);
    setActionFeedback(null);
    if (Object.values(nextErrors).some(Boolean)) {
      setErrorAnnouncementId((id) => id + 1);
      return;
    }

    setPendingAction("save");
    try {
      const updatedListing = await repository.update(
        activeEditCode,
        updateInputFromForm(form),
      );
      listingActionDidSucceed(updatedListing, "Changes saved.");
    } catch (error) {
      setActionError(errorMessage(error, "save this listing"));
    } finally {
      setPendingAction(null);
    }
  }

  async function markListingSold(): Promise<void> {
    if (pendingAction) return;

    setPendingAction("mark-sold");
    setActionError(null);
    setActionFeedback(null);
    try {
      const updatedListing = await repository.markSold(activeEditCode);
      listingActionDidSucceed(updatedListing, "Listing marked as SOLD.");
    } catch (error) {
      setActionError(errorMessage(error, "mark this listing sold"));
    } finally {
      setPendingAction(null);
    }
  }

  async function renewListing(): Promise<void> {
    if (pendingAction) return;

    setPendingAction("renew");
    setActionError(null);
    setActionFeedback(null);
    try {
      const updatedListing = await repository.renew(activeEditCode);
      listingActionDidSucceed(
        updatedListing,
        "Listing renewed for 14 more days.",
      );
    } catch (error) {
      setActionError(errorMessage(error, "renew this listing"));
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteListing(): Promise<void> {
    if (pendingAction) return;

    setPendingAction("delete");
    setActionError(null);
    try {
      await repository.delete(activeEditCode);
      setListing(null);
      setForm(null);
      setOffers([]);
      setOffersError(null);
      setOfferFeedback(null);
      setActiveEditCode("");
      setEditCode("");
      setErrors({});
      setIsConfirmingDelete(false);
      setDeletedEditCode(activeEditCode);
    } catch (error) {
      setActionError(errorMessage(error, "delete this listing"));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-glow">
          Listing management
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white">My listings</h1>
        <p className="mt-3 text-slate-300">
          Enter the edit code saved when your listing was posted. Expired
          listings remain available here so they can be renewed.
        </p>

        <form
          aria-label="Find listing by edit code"
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
          noValidate
          onSubmit={handleLookup}
        >
          <div className="flex-1">
            <label
              className="text-sm font-semibold text-slate-200"
              htmlFor="edit-code"
            >
              Edit code
            </label>
            <input
              aria-describedby={lookupError ? "edit-code-error" : undefined}
              aria-invalid={Boolean(lookupError)}
              autoComplete="off"
              className={inputClassName}
              id="edit-code"
              name="editCode"
              onChange={(event) => {
                setEditCode(event.target.value);
                setLookupError(null);
              }}
              placeholder="Paste your edit code"
              type="text"
              value={editCode}
            />
          </div>
          <button
            className={primaryButtonClassName}
            disabled={isLookingUp}
            type="submit"
          >
            {isLookingUp ? "Finding…" : "Find listing"}
          </button>
        </form>

        {isLookingUp && !listing ? (
          <p className="mt-3 text-sm text-slate-300" role="status">
            Finding your listing…
          </p>
        ) : null}

        {lookupError ? (
          <p
            className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
            id="edit-code-error"
            role="alert"
          >
            {lookupError}
          </p>
        ) : null}

        {deletedEditCode ? (
          <div
            className="mt-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-6"
            role="status"
          >
            <h2 className="text-xl font-semibold text-white">
              Listing deleted
            </h2>
            <p className="mt-2 text-slate-200">
              The listing managed with edit code {deletedEditCode} was
              permanently deleted.
            </p>
          </div>
        ) : null}

        {listing && form ? (
          <>
            <section
              aria-labelledby="managed-listing-summary"
              className="mt-8 rounded-2xl border border-white/10 bg-ink/70 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2
                    className="text-2xl font-semibold text-white"
                    id="managed-listing-summary"
                    ref={summaryHeadingRef}
                    tabIndex={-1}
                  >
                    {listing.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    {formatListingPrice(listing.price, listing.currency)} ·{" "}
                    {formatCategory(listing.category)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    listing.soldAt
                      ? "bg-sky-500/20 text-sky-100"
                      : isExpiredAt(listing.expiresAt, currentTime)
                        ? "bg-red-500/20 text-red-100"
                        : "bg-emerald-500/20 text-emerald-100"
                  }`}
                >
                  {listing.soldAt
                    ? "Sold"
                    : isExpiredAt(listing.expiresAt, currentTime)
                      ? "Expired"
                      : "Active"}
                </span>
              </div>

              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-400">Seller</dt>
                  <dd className="mt-1 font-medium text-white">
                    {listing.seller}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Location and server</dt>
                  <dd className="mt-1 font-medium text-white">
                    {listing.location} · {listing.server}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Expires</dt>
                  <dd className="mt-1 font-medium text-white">
                    {formatListingDate(listing.expiresAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Sold</dt>
                  <dd className="mt-1 font-medium text-white">
                    {listing.soldAt
                      ? formatListingDate(listing.soldAt)
                      : "Not sold"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Contact note</dt>
                  <dd className="mt-1 font-medium text-white">
                    {listing.contactNote || "No contact note"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Visual</dt>
                  <dd className="mt-1 font-medium text-white">
                    {listing.imageEmoji}
                  </dd>
                </div>
              </dl>
              <ShipSkillsSummary shipDetails={listing.shipDetails} />
            </section>

            <section
              aria-labelledby="listing-offers-heading"
              className="mt-6 rounded-2xl border border-white/10 bg-ink/70 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3
                  className="text-xl font-semibold text-white"
                  id="listing-offers-heading"
                >
                  Offers
                </h3>
                <button
                  className={secondaryButtonClassName}
                  disabled={isLoadingOffers || pendingOfferAction !== null}
                  onClick={() => void refreshOffers()}
                  type="button"
                >
                  {isLoadingOffers ? "Refreshing offers…" : "Refresh offers"}
                </button>
              </div>

              {isLoadingOffers ? (
                <p className="mt-4 text-sm text-slate-300" role="status">
                  Loading offers…
                </p>
              ) : null}

              {offersError ? (
                <p
                  className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
                  role="alert"
                >
                  {offersError}
                </p>
              ) : null}

              {offerFeedback ? (
                <p
                  className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-100"
                  role="status"
                >
                  {offerFeedback}
                </p>
              ) : null}

              {!isLoadingOffers && !offersError && offers.length === 0 ? (
                <p className="mt-4 text-sm text-slate-300">
                  No offers have been made on this listing yet.
                </p>
              ) : null}

              {offers.length > 0 ? (
                <ul className="mt-4 space-y-4">
                  {offers.map((offer) => {
                    const isAccepting =
                      pendingOfferAction?.offerId === offer.id &&
                      pendingOfferAction.action === "accept";
                    const isDeclining =
                      pendingOfferAction?.offerId === offer.id &&
                      pendingOfferAction.action === "decline";

                    return (
                      <li
                        aria-labelledby={`${offer.id}-offerer`}
                        className="rounded-xl border border-white/10 bg-white/5 p-4"
                        key={offer.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h4
                            className="text-lg font-semibold text-white"
                            id={`${offer.id}-offerer`}
                          >
                            {offer.offererName}
                          </h4>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              offer.status === "pending"
                                ? "bg-amber-500/20 text-amber-100"
                                : offer.status === "accepted"
                                  ? "bg-emerald-500/20 text-emerald-100"
                                  : "bg-red-500/20 text-red-100"
                            }`}
                          >
                            {formatOfferStatus(offer.status)}
                          </span>
                        </div>

                        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-slate-400">Contact</dt>
                            <dd className="mt-1 font-medium text-white">
                              {offer.contact}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Offer amount</dt>
                            <dd className="mt-1 font-medium text-white">
                              {formatListingPrice(offer.amount, offer.currency)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Offer text</dt>
                            <dd className="mt-1 font-medium text-white">
                              {offer.offerText}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Created</dt>
                            <dd className="mt-1 font-medium text-white">
                              {formatListingDate(offer.createdAt)}
                            </dd>
                          </div>
                        </dl>

                        {offer.status === "pending" ? (
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              className={primaryButtonClassName}
                              disabled={
                                isLoadingOffers || pendingOfferAction !== null
                              }
                              onClick={() =>
                                void updateOfferStatus(offer, "accept")
                              }
                              type="button"
                            >
                              {isAccepting
                                ? "Accepting…"
                                : `Accept offer from ${offer.offererName}`}
                            </button>
                            <button
                              className={dangerButtonClassName}
                              disabled={
                                isLoadingOffers || pendingOfferAction !== null
                              }
                              onClick={() =>
                                void updateOfferStatus(offer, "decline")
                              }
                              type="button"
                            >
                              {isDeclining
                                ? "Declining…"
                                : `Decline offer from ${offer.offererName}`}
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>

            <form
              aria-label="Edit listing form"
              className="mt-6 space-y-6"
              noValidate
              onSubmit={handleSave}
            >
              {errorCount > 0 ? (
                <p
                  className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
                  ref={errorSummaryRef}
                  role="alert"
                  tabIndex={-1}
                >
                  Please fix {errorCount}{" "}
                  {errorCount === 1 ? "field" : "fields"} below before saving
                  this listing.
                </p>
              ) : null}

              <div>
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor="title"
                >
                  Title
                </label>
                <input
                  aria-describedby={errors.title ? "title-error" : undefined}
                  aria-invalid={Boolean(errors.title)}
                  className={inputClassName}
                  id="title"
                  name="title"
                  onChange={(event) => updateField("title", event.target.value)}
                  required
                  type="text"
                  value={form.title}
                />
                <FieldError id="title-error" message={errors.title} />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-semibold text-slate-200"
                    htmlFor="category"
                  >
                    Category
                  </label>
                  <select
                    className={inputClassName}
                    id="category"
                    name="category"
                    onChange={(event) =>
                      updateCategory(event.target.value as ListingCategory)
                    }
                    value={form.category}
                  >
                    {LISTING_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {formatCategory(category)}
                      </option>
                    ))}
                  </select>
                </div>
                {form.category === "ships" ? (
                  <div className="sm:col-span-2">
                    <ShipDetailsForm
                      errors={errors}
                      form={form.ship}
                      onChange={updateShipField}
                    />
                  </div>
                ) : null}
                <div>
                  <label
                    className="text-sm font-semibold text-slate-200"
                    htmlFor="currency"
                  >
                    Currency
                  </label>
                  <select
                    className={inputClassName}
                    id="currency"
                    name="currency"
                    onChange={(event) =>
                      updateCurrency(event.target.value as ListingCurrency)
                    }
                    value={form.currency}
                  >
                    {LISTING_CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currencyLabels[currency]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isNumericListingCurrency(form.currency) ? (
                <div>
                  <label
                    className="text-sm font-semibold text-slate-200"
                    htmlFor="price"
                  >
                    Price ({currencyLabels[form.currency]})
                  </label>
                  <input
                    aria-describedby={errors.price ? "price-error" : undefined}
                    aria-invalid={Boolean(errors.price)}
                    className={inputClassName}
                    id="price"
                    inputMode="decimal"
                    name="price"
                    onChange={(event) =>
                      updateField("price", event.target.value)
                    }
                    required
                    type="number"
                    step={form.currency === "CT" ? "1" : "0.01"}
                    value={form.price}
                  />
                  <FieldError id="price-error" message={errors.price} />
                </div>
              ) : null}

              <div>
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor="description"
                >
                  Description
                </label>
                <textarea
                  aria-describedby={
                    errors.description ? "description-error" : undefined
                  }
                  aria-invalid={Boolean(errors.description)}
                  className={`${inputClassName} min-h-32 resize-y`}
                  id="description"
                  name="description"
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  required
                  rows={5}
                  value={form.description}
                />
                <FieldError
                  id="description-error"
                  message={errors.description}
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-semibold text-slate-200"
                    htmlFor="seller"
                  >
                    Seller
                  </label>
                  <input
                    aria-describedby={
                      errors.seller ? "seller-error" : undefined
                    }
                    aria-invalid={Boolean(errors.seller)}
                    className={inputClassName}
                    id="seller"
                    name="seller"
                    onChange={(event) =>
                      updateField("seller", event.target.value)
                    }
                    required
                    type="text"
                    value={form.seller}
                  />
                  <FieldError id="seller-error" message={errors.seller} />
                </div>
                <div>
                  <label
                    className="text-sm font-semibold text-slate-200"
                    htmlFor="location"
                  >
                    Location
                  </label>
                  <input
                    aria-describedby={
                      errors.location ? "location-error" : undefined
                    }
                    aria-invalid={Boolean(errors.location)}
                    className={inputClassName}
                    id="location"
                    name="location"
                    onChange={(event) =>
                      updateField("location", event.target.value)
                    }
                    required
                    type="text"
                    value={form.location}
                  />
                  <FieldError id="location-error" message={errors.location} />
                </div>
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor="server"
                >
                  Server
                </label>
                <input
                  aria-describedby={errors.server ? "server-error" : undefined}
                  aria-invalid={Boolean(errors.server)}
                  className={inputClassName}
                  id="server"
                  name="server"
                  onChange={(event) =>
                    updateField("server", event.target.value)
                  }
                  required
                  type="text"
                  value={form.server}
                />
                <FieldError id="server-error" message={errors.server} />
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-slate-200"
                  htmlFor="contact-note"
                >
                  Contact note{" "}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  className={`${inputClassName} min-h-24 resize-y`}
                  id="contact-note"
                  name="contactNote"
                  onChange={(event) =>
                    updateField("contactNote", event.target.value)
                  }
                  rows={3}
                  value={form.contactNote}
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-semibold text-slate-200"
                    htmlFor="emoji"
                  >
                    Emoji visual{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>
                  <input
                    className={inputClassName}
                    id="emoji"
                    maxLength={8}
                    name="emoji"
                    onChange={(event) =>
                      updateField("emoji", event.target.value)
                    }
                    type="text"
                    value={form.emoji}
                  />
                </div>
                <div>
                  <label
                    className="text-sm font-semibold text-slate-200"
                    htmlFor="collection"
                  >
                    Collection
                  </label>
                  <select
                    className={inputClassName}
                    id="collection"
                    name="collection"
                    onChange={(event) =>
                      updateField(
                        "collection",
                        event.target.value as ListingCollection,
                      )
                    }
                    value={form.collection}
                  >
                    <option value="current">{collectionLabels.current}</option>
                    <option value="legacy">{collectionLabels.legacy}</option>
                  </select>
                </div>
              </div>

              {actionFeedback ? (
                <p
                  className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-100"
                  role="status"
                >
                  {actionFeedback}
                </p>
              ) : null}

              {actionError ? (
                <p
                  className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
                  role="alert"
                >
                  {actionError}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  className={primaryButtonClassName}
                  disabled={pendingAction !== null}
                  type="submit"
                >
                  {pendingAction === "save"
                    ? "Saving changes…"
                    : "Save changes"}
                </button>
                <button
                  className={secondaryButtonClassName}
                  disabled={pendingAction !== null}
                  onClick={() => {
                    setIsConfirmingDelete(false);
                    setActionError(null);
                    setActionFeedback(null);
                    void markListingSold();
                  }}
                  type="button"
                >
                  {pendingAction === "mark-sold"
                    ? "Marking SOLD…"
                    : "Mark SOLD"}
                </button>
                <button
                  className={secondaryButtonClassName}
                  disabled={pendingAction !== null}
                  onClick={() => {
                    setIsConfirmingDelete(false);
                    setActionError(null);
                    setActionFeedback(null);
                    void renewListing();
                  }}
                  type="button"
                >
                  {pendingAction === "renew" ? "Renewing…" : "Renew (+14 days)"}
                </button>
                <button
                  className={dangerButtonClassName}
                  disabled={pendingAction !== null}
                  onClick={() => {
                    setActionError(null);
                    setActionFeedback(null);
                    setIsConfirmingDelete(true);
                  }}
                  type="button"
                >
                  Delete listing
                </button>
              </div>

              {isConfirmingDelete ? (
                <div
                  aria-labelledby="delete-confirmation-heading"
                  className="rounded-xl border border-red-400/40 bg-red-500/10 p-4"
                  role="group"
                >
                  <h3
                    className="text-lg font-semibold text-red-50"
                    id="delete-confirmation-heading"
                  >
                    Delete this listing permanently?
                  </h3>
                  <p className="mt-2 text-sm text-red-100">
                    This cannot be undone. The listing will disappear from the
                    marketplace and this edit code will no longer manage it.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className={dangerButtonClassName}
                      disabled={pendingAction !== null}
                      onClick={() => void deleteListing()}
                      type="button"
                    >
                      {pendingAction === "delete"
                        ? "Deleting…"
                        : "Yes, delete this listing"}
                    </button>
                    <button
                      className={secondaryButtonClassName}
                      disabled={pendingAction !== null}
                      onClick={() => setIsConfirmingDelete(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </form>
          </>
        ) : null}
      </div>
    </section>
  );
}
