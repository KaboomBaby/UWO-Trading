import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { CategoryShortcuts } from "../../components/marketplace/category-shortcuts";
import { FeaturedListings } from "../../components/marketplace/featured-listings";
import { useListingRepository } from "../../lib/listing-repository-context";
import type { Listing } from "../../types/listing";

type FeaturedStatus = "loading" | "ready" | "error";

const explorationPoints = [
  {
    title: "Compare real offers",
    description:
      "Review prices, locations, and sellers before you commit your gold.",
    symbol: "⚖️",
  },
  {
    title: "Trade across categories",
    description:
      "Move between ships, property, equipment, resources, and services in one marketplace.",
    symbol: "🗺️",
  },
  {
    title: "List in minutes",
    description:
      "Turn surplus cargo or unused property into a discoverable offer.",
    symbol: "✍️",
  },
];

export function HomePage() {
  const repository = useListingRepository();
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [status, setStatus] = useState<FeaturedStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    repository
      .list({ sort: "newest" })
      .then((listings) => {
        if (!isActive) return;
        setFeaturedListings(listings.slice(0, 3));
        setStatus("ready");
      })
      .catch(() => {
        if (!isActive) return;
        setFeaturedListings([]);
        setStatus("error");
        setError("We could not load the latest listings. Please try again.");
      });

    return () => {
      isActive = false;
    };
  }, [repository]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <section
        aria-labelledby="home-hero-heading"
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-sea-blue/25 via-ink to-ink p-6 sm:p-10 lg:p-14"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-glow/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-sea-blue/20 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <p className="inline-flex items-center rounded-full border border-amber-glow/40 bg-amber-glow/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-glow">
            UWO Market
          </p>
          <h1
            id="home-hero-heading"
            className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
          >
            The open-sea marketplace for ambitious captains
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
            Discover ships, property, equipment, resources, and services from
            players across the UWO economy. Compare fresh offers, make smart
            trades, and put your own surplus to work.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/browse"
              className="inline-flex items-center justify-center rounded-xl bg-amber-glow px-6 py-3 text-base font-semibold text-ink shadow-lg shadow-amber-glow/20 transition hover:bg-amber-glow/90"
            >
              Browse marketplace
            </Link>
            <Link
              to="/post"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 px-6 py-3 text-base font-semibold text-white transition hover:border-amber-glow/70 hover:text-amber-glow"
            >
              Post a listing
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-12 space-y-14">
        <CategoryShortcuts />

        <FeaturedListings
          listings={featuredListings}
          loading={status === "loading"}
          error={status === "error" ? error : null}
        />

        <section aria-labelledby="marketplace-exploration-heading">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-10">
            <div className="max-w-2xl">
              <h2
                id="marketplace-exploration-heading"
                className="text-2xl font-semibold text-white sm:text-3xl"
              >
                Navigate the marketplace with confidence
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                UWO Market brings the important details together—category,
                price, seller, and location—so you can evaluate opportunities
                without hunting through port chat.
              </p>
            </div>
            <ul className="mt-8 grid gap-5 md:grid-cols-3">
              {explorationPoints.map((point) => (
                <li
                  key={point.title}
                  className="rounded-2xl border border-white/10 bg-ink/60 p-5"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 place-items-center rounded-xl bg-sea-blue/20 text-xl"
                  >
                    {point.symbol}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {point.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
