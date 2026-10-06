import { Link } from "react-router-dom";

import type { Listing } from "../../types/listing";
import { formatListingPrice } from "../../types/listing";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-amber-glow/70 hover:bg-white/10"
    >
      <div className="flex h-36 items-center justify-center bg-gradient-to-br from-sea-blue/25 to-ink/90 text-5xl">
        <span aria-hidden="true">{listing.imageEmoji}</span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">{listing.title}</h3>
          <span className="flex flex-wrap justify-end gap-2">
            {listing.collection === "legacy" && (
              <span className="rounded-full bg-amber-glow/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-glow">
                Legacy
              </span>
            )}
            <span className="rounded-full bg-sea-blue/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
              {listing.category}
            </span>
          </span>
        </div>
        <p className="text-xl font-semibold text-amber-glow">
          {formatListingPrice(listing.price, listing.currency)}
        </p>
        <dl className="mt-auto grid gap-2 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Seller</dt>
            <dd>
              <span className="text-slate-400">Seller:</span> {listing.seller}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Location</dt>
            <dd>
              <span className="text-slate-400">Location:</span>{" "}
              {listing.location}
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
