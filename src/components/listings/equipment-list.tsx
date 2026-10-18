import { Link } from "react-router-dom";

import {
  formatWearer,
  equipmentSummaryParts,
} from "../equipment/equipment-panel";
import { formatListingPrice, type Listing } from "../../types/listing";

export function EquipmentList({ listings }: { listings: Listing[] }) {
  return (
    <section aria-label="Equipment listings">
      <ul className="grid gap-3">
        {listings.map((listing) => {
          const parts = listing.equipmentDetails
            ? equipmentSummaryParts(listing.equipmentDetails)
            : [];
          return (
            <li key={listing.id}>
              <Link
                className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-amber-glow/70 hover:bg-white/10 sm:p-5"
                to={`/listings/${listing.id}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    {listing.title}
                    {listing.equipmentDetails?.wearer ? (
                      <span className="ml-2 text-sm font-medium text-slate-300">
                        {formatWearer(listing.equipmentDetails.wearer)}
                      </span>
                    ) : null}
                  </h3>
                  <span className="flex flex-wrap items-center gap-2">
                    {listing.soldAt ? (
                      <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-100">
                        SOLD
                      </span>
                    ) : null}
                    <span className="text-lg font-semibold text-amber-glow">
                      {formatListingPrice(listing.price, listing.currency)}
                    </span>
                  </span>
                </div>
                {parts.length > 0 ? (
                  <p className="text-sm leading-relaxed text-slate-200">
                    {parts.join(" · ")}
                  </p>
                ) : null}
                <p className="text-sm text-slate-400">
                  Seller: {listing.seller} · Location: {listing.location}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
