import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ListingGrid } from "../../components/listings/listing-grid";
import { useListingRepository } from "../../lib/listing-repository-context";
import type { Listing } from "../../types/listing";

type SearchResult =
  | {
      query: string;
      reloadToken: number;
      status: "success";
      listings: Listing[];
    }
  | { query: string; reloadToken: number; status: "error" };

export function SearchPage() {
  const repository = useListingRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const hasQuery = query.length > 0;
  const [draft, setDraft] = useState(query);
  const lastExternalQueryRef = useRef(query);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  if (query !== lastExternalQueryRef.current) {
    lastExternalQueryRef.current = query;
    if (query !== draft.trim()) {
      setDraft(query);
    }
  }

  const currentResult =
    result?.query === query && result.reloadToken === reloadToken
      ? result
      : null;
  const listings =
    currentResult?.status === "success" ? currentResult.listings : [];
  const isLoading = hasQuery && !currentResult;
  const error = currentResult?.status === "error";
  const resultLabel = listings.length === 1 ? "result" : "results";

  useEffect(() => {
    if (!hasQuery) return;
    let isActive = true;

    repository
      .list({ search: query })
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
  }, [hasQuery, query, reloadToken, repository]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = draft.trim();
    const nextParams = new URLSearchParams();
    if (nextQuery) {
      nextParams.set("q", nextQuery);
    } else {
      nextParams.delete("q");
    }
    setSearchParams(nextParams);
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Search results</h1>
          <p className="mt-2 text-slate-300">
            Search ships, property, equipment, resources, and services.
          </p>
        </div>
        <p
          className="text-sm text-slate-300"
          aria-live="polite"
          data-testid="search-result-count"
        >
          {error
            ? "Search unavailable"
            : !hasQuery
              ? "Enter a search term"
              : isLoading
                ? "Loading results…"
                : `${listings.length} ${resultLabel} for “${query}”`}
        </p>
      </div>

      <form
        onSubmit={submitSearch}
        className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-ink/60 p-4 sm:flex-row sm:items-end sm:p-5"
        role="search"
      >
        <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-slate-200">
          Search listings
          <input
            type="search"
            name="q"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search title, seller, or location"
            className="w-full rounded-xl border border-white/15 bg-ink/70 px-4 py-2.5 text-base text-white placeholder:text-slate-400 focus:border-amber-glow focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-amber-glow px-5 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
        >
          Search
        </button>
      </form>

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
              Search could not be completed. Please try again.
            </h2>
            <button
              type="button"
              onClick={() => setReloadToken((token) => token + 1)}
              className="mt-5 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Try again
            </button>
          </div>
        ) : !hasQuery ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
            <p className="text-5xl" aria-hidden="true">
              🔍
            </p>
            <h2 className="mt-4 text-xl font-semibold text-white">
              Start your search
            </h2>
            <p className="mx-auto mt-2 max-w-md text-slate-300">
              Enter a keyword to find listings by title, description, seller, or
              location.
            </p>
          </div>
        ) : isLoading ? (
          <div aria-busy="true" aria-live="polite">
            <p className="sr-only">Loading results…</p>
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
              No results for “{query}”
            </h2>
            <p className="mx-auto mt-2 max-w-md text-slate-300">
              Try a shorter keyword, check the spelling, or search by seller or
              port.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
