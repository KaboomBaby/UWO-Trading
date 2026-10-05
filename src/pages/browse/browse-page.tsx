import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ListingGrid } from "../../components/listings/listing-grid";
import { useListingRepository } from "../../lib/listing-repository-context";
import {
  LISTING_CATEGORIES,
  type Listing,
  type ListingCategory,
  type ListingQuery,
  type ListingSort,
} from "../../types/listing";

type BrowseCategory = ListingCategory | "all";
type ListingResult =
  | {
      query: ListingQuery;
      reloadToken: number;
      status: "success";
      listings: Listing[];
    }
  | {
      query: ListingQuery;
      reloadToken: number;
      status: "error";
    };

const CATEGORY_FILTERS = [
  { value: "all", label: "All" },
  ...LISTING_CATEGORIES.map((category) => ({
    value: category,
    label: category.charAt(0).toUpperCase() + category.slice(1),
  })),
] as const satisfies ReadonlyArray<{
  value: BrowseCategory;
  label: string;
}>;

const SORT_OPTIONS: Array<{ value: ListingSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price low-to-high" },
  { value: "price-desc", label: "Price high-to-low" },
];

function parseCategory(value: string | null): BrowseCategory {
  return LISTING_CATEGORIES.includes(value as ListingCategory)
    ? (value as ListingCategory)
    : "all";
}

export function BrowsePage() {
  const repository = useListingRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = parseCategory(searchParams.get("category"));
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ListingSort>("newest");
  const [result, setResult] = useState<ListingResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const query = useMemo(
    () => ({ category, search: search.trim() || undefined, sort }),
    [category, search, sort],
  );
  const currentResult =
    result?.query === query && result.reloadToken === reloadToken
      ? result
      : null;
  const listings =
    currentResult?.status === "success" ? currentResult.listings : [];
  const isLoading = !currentResult;
  const error = currentResult?.status === "error";

  useEffect(() => {
    let isActive = true;

    repository
      .list(query)
      .then((results) => {
        if (isActive) {
          setResult({
            query,
            reloadToken,
            status: "success",
            listings: results,
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

  const selectCategory = useCallback(
    (nextCategory: BrowseCategory) => {
      const nextParams = new URLSearchParams(searchParams);
      if (nextCategory === "all") {
        nextParams.delete("category");
      } else {
        nextParams.set("category", nextCategory);
      }
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams],
  );

  const clearFilters = () => {
    setSearch("");
    setSort("newest");
    selectCategory("all");
    setReloadToken((token) => token + 1);
  };

  const hasActiveFilters =
    category !== "all" || search.trim().length > 0 || sort !== "newest";
  const resultLabel = listings.length === 1 ? "listing" : "listings";

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Browse listings</h1>
          <p className="mt-2 text-slate-300">
            Find ships, property, equipment, and crew-ready trade deals.
          </p>
        </div>
        <p
          className="text-sm text-slate-300"
          aria-live="polite"
          data-testid="listing-count"
        >
          {error
            ? "Unable to load listings"
            : isLoading
              ? "Loading listings…"
              : `${listings.length} ${resultLabel}`}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-ink/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Category
            </h2>
            <div
              className="mt-3 flex flex-wrap gap-2"
              role="group"
              aria-label="Filter by category"
            >
              {CATEGORY_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => selectCategory(filter.value)}
                  aria-pressed={category === filter.value}
                  className={
                    category === filter.value
                      ? "rounded-full bg-amber-glow px-4 py-2 text-sm font-semibold text-ink"
                      : "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/10"
                  }
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row xl:items-end">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
              Search
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, seller, or location"
                className="w-full rounded-xl border border-white/15 bg-ink/70 px-4 py-2.5 text-base text-white placeholder:text-slate-400 focus:border-amber-glow focus:outline-none sm:w-72"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
              Sort by
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as ListingSort)}
                className="rounded-xl border border-white/15 bg-ink/70 px-4 py-2.5 text-base text-white focus:border-amber-glow focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-400/40 bg-red-500/10 p-8 text-center"
          >
            <p className="text-4xl" aria-hidden="true">
              🌊
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">
              Listings could not be loaded. Please try again.
            </h2>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Reset filters
            </button>
          </div>
        ) : isLoading ? (
          <div aria-busy="true" aria-live="polite">
            <p className="sr-only">Loading listings…</p>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <li
                  key={index}
                  className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                />
              ))}
            </ul>
          </div>
        ) : listings.length > 0 ? (
          <ListingGrid listings={listings} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-5xl" aria-hidden="true">
              🧭
            </p>
            <h2 className="mt-4 text-xl font-semibold text-white">
              No listings found
            </h2>
            <p className="mx-auto mt-2 max-w-md text-slate-300">
              Nothing matches your current filters. Try a different category,
              broaden your search, or check back soon.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-full bg-amber-glow px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
