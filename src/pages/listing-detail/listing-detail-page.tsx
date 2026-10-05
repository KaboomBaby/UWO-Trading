import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useListingRepository } from "../../lib/listing-repository-context";
import type { Listing } from "../../types/listing";

type DetailState =
  | { status: "ready"; requestedId: string; listing: Listing }
  | { status: "missing"; requestedId: string }
  | { status: "error"; requestedId: string; message: string };

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatCategory(category: Listing["category"]) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function ListingDetailPage() {
  const { listingId } = useParams();
  const repository = useListingRepository();
  const [state, setState] = useState<DetailState | null>(null);
  const requestedId = listingId ?? "";

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
            This listing is not in the current local marketplace session. It may
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

  return (
    <section
      aria-labelledby="listing-title"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6"
    >
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
            {numberFormatter.format(listing.price)} {listing.currency}
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
          </dl>
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
