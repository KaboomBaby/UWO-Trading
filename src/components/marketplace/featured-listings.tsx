import { Link } from "react-router-dom";

import type { Listing } from "../../types/listing";
import { formatListingPrice } from "../../types/listing";

type FeaturedListingsProps = {
  listings: Listing[];
  loading: boolean;
  error?: string | null;
};

const categoryLabels: Record<Listing["category"], string> = {
  ships: "Ships",
  property: "Property",
  equipment: "Equipment",
  resources: "Resources",
  services: "Services",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function FeaturedListings({
  listings,
  loading,
  error,
}: FeaturedListingsProps) {
  return (
    <section aria-labelledby="featured-listings-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="featured-listings-heading"
            className="text-2xl font-semibold text-white sm:text-3xl"
          >
            Fresh on the exchange
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            The three newest listings across every UWO Market category.
          </p>
        </div>
        <Link
          to="/browse"
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-amber-glow/60 hover:text-amber-glow"
        >
          Browse all listings
        </Link>
      </div>

      <div className="mt-6" aria-live="polite" aria-busy={loading}>
        {error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6">
            <h3 className="text-lg font-semibold text-white">
              Listings are unavailable
            </h3>
            <p className="mt-2 text-sm text-red-100">{error}</p>
          </div>
        ) : loading ? (
          <>
            <p className="sr-only">Loading featured listings…</p>
            <div className="grid gap-5 md:grid-cols-3" aria-hidden="true">
              {[0, 1, 2].map((card) => (
                <div
                  key={card}
                  className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/5"
                />
              ))}
            </div>
          </>
        ) : listings.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <p
              aria-hidden="true"
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-glow/15 text-2xl"
            >
              ⚓
            </p>
            <h3 className="mt-4 text-xl font-semibold text-white">
              No listings are ready yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
              The marketplace is quiet right now. Check back soon or be the
              first captain to list something for trade.
            </p>
            <Link
              to="/post"
              className="mt-6 inline-flex rounded-xl bg-amber-glow px-5 py-3 text-sm font-semibold text-ink transition hover:bg-amber-glow/90"
            >
              Post the first listing
            </Link>
          </div>
        ) : (
          <ul className="grid gap-5 md:grid-cols-3">
            {listings.map((listing) => (
              <li key={listing.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-amber-glow/50">
                  <div className="flex h-36 items-center justify-center bg-gradient-to-br from-sea-blue/25 via-ink to-amber-glow/15 text-5xl">
                    <span aria-hidden="true">{listing.imageEmoji}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                      <span className="rounded-full bg-sea-blue/20 px-3 py-1 text-sky-200">
                        {categoryLabels[listing.category]}
                      </span>
                      <span className="text-slate-400">
                        {dateFormatter.format(new Date(listing.createdAt))}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      <Link
                        to={`/listings/${listing.id}`}
                        className="transition hover:text-amber-glow"
                      >
                        {listing.title}
                      </Link>
                    </h3>
                    <p className="line-clamp-3 text-sm text-slate-300">
                      {listing.description}
                    </p>
                    <dl className="mt-auto space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-slate-400">Price</dt>
                        <dd className="font-semibold text-amber-glow">
                          {formatListingPrice(listing.price, listing.currency)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-slate-400">Location</dt>
                        <dd className="text-right text-slate-200">
                          {listing.location}
                        </dd>
                      </div>
                    </dl>
                    <Link
                      to={`/listings/${listing.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-amber-glow/60 hover:text-amber-glow"
                    >
                      View listing details
                      <span className="sr-only"> for {listing.title}</span>
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
