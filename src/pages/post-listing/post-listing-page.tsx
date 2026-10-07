import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useListingRepository } from "../../lib/listing-repository-context";
import {
  ShipDetailsForm,
  emptyShipForm,
  shipDetailsFromForm,
  validateShipForm,
  type ShipFormErrors,
  type ShipFormState,
} from "../../components/ships/ship-details-form";
import {
  LISTING_CATEGORIES,
  LISTING_CURRENCIES,
  isNumericListingCurrency,
  type CreatedListing,
  type Listing,
  type ListingCategory,
} from "../../types/listing";

type FormState = {
  title: string;
  category: ListingCategory | "";
  currency: Listing["currency"] | "";
  price: string;
  description: string;
  seller: string;
  location: string;
  server: string;
  contactNote: string;
  emoji: string;
  ship: ShipFormState;
};

type ListingFormErrors = Partial<Record<keyof FormState, string>> &
  ShipFormErrors;

function clearShipErrors(): ListingFormErrors {
  return Object.fromEntries(
    Object.keys(emptyShipForm).map((field) => [field, undefined]),
  ) as ListingFormErrors;
}

const emptyForm: FormState = {
  title: "",
  category: "",
  currency: "",
  price: "",
  description: "",
  seller: "",
  location: "",
  server: "",
  contactNote: "",
  emoji: "",
  ship: emptyShipForm,
};

type EditCodeCopyState = "idle" | "copied" | "error";

const currencyLabels = {
  ducats: "Ducats",
  UWC: "UWC",
  CT: "CT (Captain Tickets)",
  trade: "Trade / Barter",
  negotiable: "Negotiable",
} as const;

function formatCategory(category: ListingCategory) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function validate(form: FormState): ListingFormErrors {
  const errors: ListingFormErrors = {};
  const title = form.title.trim();
  const description = form.description.trim();
  const seller = form.seller.trim();
  const location = form.location.trim();
  const server = form.server.trim();
  const numericCurrency =
    form.currency !== "" && isNumericListingCurrency(form.currency);

  if (title.length < 3) {
    errors.title = "Title must be at least 3 characters.";
  }
  if (!form.category) {
    errors.category = "Category is required.";
  }
  if (!form.currency) {
    errors.currency = "Currency is required.";
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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-2 text-sm text-red-200" id={id}>
      {message}
    </p>
  );
}

const inputClassName =
  "mt-2 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30";

export function PostListingPage() {
  const repository = useListingRepository();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<ListingFormErrors>({});
  const [errorAnnouncementId, setErrorAnnouncementId] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdListing, setCreatedListing] = useState<CreatedListing | null>(
    null,
  );
  const [editCodeCopyState, setEditCodeCopyState] =
    useState<EditCodeCopyState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLParagraphElement | null>(null);
  const successHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const formHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const shouldFocusFormRef = useRef(false);
  const errorCount = Object.values(errors).filter(Boolean).length;
  const numericCurrency =
    form.currency !== "" && isNumericListingCurrency(form.currency);

  useEffect(() => {
    if (errorAnnouncementId > 0) {
      errorSummaryRef.current?.focus();
    }
  }, [errorAnnouncementId]);

  useEffect(() => {
    if (createdListing) {
      successHeadingRef.current?.focus();
      return;
    }

    if (shouldFocusFormRef.current) {
      shouldFocusFormRef.current = false;
      formHeadingRef.current?.focus();
    }
  }, [createdListing]);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateCurrency(currency: FormState["currency"]) {
    setForm((current) => ({
      ...current,
      currency,
      price:
        currency === "" || isNumericListingCurrency(currency)
          ? current.price
          : "",
    }));
    setErrors((current) => ({
      ...current,
      currency: undefined,
      price: undefined,
    }));
  }

  function updateCategory(category: ListingCategory | "") {
    setForm((current) => ({
      ...current,
      category,
      ship: category === "ships" ? current.ship : { ...emptyShipForm },
    }));
    setErrors((current) => ({
      ...current,
      ...clearShipErrors(),
      category: undefined,
    }));
  }

  function updateShipField<K extends keyof ShipFormState>(
    field: K,
    value: ShipFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      ship: { ...current.ship, [field]: value },
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate(form);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.values(nextErrors).some(Boolean)) {
      setErrorAnnouncementId((id) => id + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      const emoji = form.emoji.trim();
      const listing = await repository.create({
        title: form.title.trim(),
        category: form.category as ListingCategory,
        currency: form.currency as Listing["currency"],
        price: numericCurrency ? Number(form.price.trim()) : null,
        description: form.description.trim(),
        seller: form.seller.trim(),
        location: form.location.trim(),
        server: form.server.trim(),
        contactNote: form.contactNote.trim(),
        shipDetails:
          form.category === "ships" ? shipDetailsFromForm(form.ship) : null,
        ...(emoji ? { imageEmoji: emoji } : {}),
      });
      setCreatedListing(listing);
      setEditCodeCopyState("idle");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to create this listing.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    shouldFocusFormRef.current = true;
    setCreatedListing(null);
    setEditCodeCopyState("idle");
    setForm(emptyForm);
    setErrors({});
    setSubmitError(null);
  }

  async function copyEditCode() {
    if (!createdListing) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is unavailable.");
      }
      await navigator.clipboard.writeText(createdListing.editCode);
      setEditCodeCopyState("copied");
    } catch {
      setEditCodeCopyState("error");
    }
  }

  if (createdListing) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <div
          className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-6 sm:p-8"
          role="status"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">
            Listing posted
          </p>
          <h1
            className="mt-3 text-3xl font-semibold text-white"
            ref={successHeadingRef}
            tabIndex={-1}
          >
            {createdListing.title} is ready
          </h1>
          <p className="mt-3 text-slate-200">
            It was saved through the active listing repository and is ready to
            browse.
          </p>
          <div className="mt-6 rounded-xl border border-amber-glow/60 bg-amber-glow/10 p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-glow">
              Save this edit code now
            </p>
            <p className="mt-2 text-sm text-amber-100" role="alert">
              This code is shown only here and cannot be recovered. Keep a safe
              copy because it is required to manage, renew, or delete this
              listing.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <code className="rounded-lg border border-white/20 bg-ink px-3 py-2 font-mono text-lg tracking-wider text-white">
                {createdListing.editCode}
              </code>
              <button
                className="rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90"
                onClick={copyEditCode}
                type="button"
              >
                Copy code
              </button>
            </div>
            {editCodeCopyState !== "idle" ? (
              <p className="mt-3 text-sm" role="status">
                {editCodeCopyState === "copied"
                  ? "Edit code copied."
                  : "Unable to copy the edit code. Select and copy it manually."}
              </p>
            ) : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={`/listings/${createdListing.id}`}
              className="rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90"
            >
              View posted listing
            </Link>
            <button
              className="rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
              onClick={resetForm}
              type="button"
            >
              Post another listing
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-glow">
          Marketplace listing
        </p>
        <h1
          className="mt-4 text-3xl font-semibold text-white"
          ref={formHeadingRef}
          tabIndex={-1}
        >
          Post a listing
        </h1>
        <p className="mt-3 text-slate-300">
          Listings are saved through the active repository: Supabase when
          environment credentials are present, or this browser session’s
          in-memory marketplace otherwise.
        </p>

        <form
          aria-label="Post listing form"
          className="mt-8 space-y-6"
          noValidate
          onSubmit={handleSubmit}
        >
          {errorCount > 0 ? (
            <p
              className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
              ref={errorSummaryRef}
              role="alert"
              tabIndex={-1}
            >
              Please fix {errorCount} {errorCount === 1 ? "field" : "fields"}{" "}
              below before publishing this listing.
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
              placeholder="Adventurer Frigate"
              required
              type="text"
              value={form.title}
            />
            <FieldError id="title-error" message={errors.title} />
          </div>

          <div>
            <label
              className="text-sm font-semibold text-slate-200"
              htmlFor="category"
            >
              Category
            </label>
            <select
              aria-describedby={errors.category ? "category-error" : undefined}
              aria-invalid={Boolean(errors.category)}
              className={inputClassName}
              id="category"
              name="category"
              onChange={(event) =>
                updateCategory(event.target.value as ListingCategory | "")
              }
              required
              value={form.category}
            >
              <option value="">Select a category</option>
              {LISTING_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
            <FieldError id="category-error" message={errors.category} />
          </div>

          {form.category === "ships" ? (
            <ShipDetailsForm
              errors={errors}
              form={form.ship}
              onChange={updateShipField}
            />
          ) : null}

          <div>
            <label
              className="text-sm font-semibold text-slate-200"
              htmlFor="currency"
            >
              Currency
            </label>
            <select
              aria-describedby={errors.currency ? "currency-error" : undefined}
              aria-invalid={Boolean(errors.currency)}
              className={inputClassName}
              id="currency"
              name="currency"
              onChange={(event) =>
                updateCurrency(event.target.value as FormState["currency"])
              }
              required
              value={form.currency}
            >
              <option value="">Select a currency</option>
              {LISTING_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currencyLabels[currency]}
                </option>
              ))}
            </select>
            <FieldError id="currency-error" message={errors.currency} />
          </div>

          {numericCurrency ? (
            <div>
              <label
                className="text-sm font-semibold text-slate-200"
                htmlFor="price"
              >
                Price ({currencyLabels[form.currency as Listing["currency"]]})
              </label>
              <input
                aria-describedby={errors.price ? "price-error" : undefined}
                aria-invalid={Boolean(errors.price)}
                className={inputClassName}
                id="price"
                inputMode={form.currency === "CT" ? "numeric" : "decimal"}
                min={form.currency === "CT" ? "1" : "0.01"}
                name="price"
                onChange={(event) => updateField("price", event.target.value)}
                placeholder="48000000"
                required
                step={form.currency === "CT" ? "1" : "any"}
                type="number"
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
              placeholder="Describe the ship, cargo, property, or service."
              required
              rows={5}
              value={form.description}
            />
            <FieldError id="description-error" message={errors.description} />
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
                aria-describedby={errors.seller ? "seller-error" : undefined}
                aria-invalid={Boolean(errors.seller)}
                className={inputClassName}
                id="seller"
                name="seller"
                onChange={(event) => updateField("seller", event.target.value)}
                placeholder="PortRoyalShipwright"
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
                placeholder="Port Royal"
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
              onChange={(event) => updateField("server", event.target.value)}
              placeholder="Maris"
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
              placeholder="How and when buyers should reach you."
              rows={3}
              value={form.contactNote}
            />
          </div>

          <div>
            <label
              className="text-sm font-semibold text-slate-200"
              htmlFor="emoji"
            >
              Emoji visual{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              className={inputClassName}
              id="emoji"
              maxLength={8}
              name="emoji"
              onChange={(event) => updateField("emoji", event.target.value)}
              placeholder="🚢"
              type="text"
              value={form.emoji}
            />
          </div>

          {submitError ? (
            <p
              className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <button
              className="rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Posting…" : "Publish listing"}
            </button>
            <Link
              className="text-sm font-semibold text-slate-300 transition hover:text-white"
              to="/browse"
            >
              Browse instead
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
