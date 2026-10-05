import { useEffect, useState } from "react";

import { useCommerceRepository } from "../../../lib/commerce-repository-context";
import type { WatchlistItem, WishlistItem } from "../../../types/commerce";

type ListsResult =
  | {
      reloadToken: number;
      status: "success";
      wishlist: WishlistItem[];
      watchlist: WatchlistItem[];
    }
  | {
      reloadToken: number;
      status: "error";
    };

const priceFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const changeFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  signDisplay: "always",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function listCountLabel(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function WishlistWatchlistsPage() {
  const repository = useCommerceRepository();
  const [result, setResult] = useState<ListsResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const currentResult = result?.reloadToken === reloadToken ? result : null;
  const wishlist =
    currentResult?.status === "success" ? currentResult.wishlist : [];
  const watchlist =
    currentResult?.status === "success" ? currentResult.watchlist : [];
  const isLoading = !currentResult;
  const error = currentResult?.status === "error";

  useEffect(() => {
    let isActive = true;

    Promise.all([repository.listWishlist(), repository.listWatchlist()])
      .then(([nextWishlist, nextWatchlist]) => {
        if (isActive) {
          setResult({
            reloadToken,
            status: "success",
            wishlist: nextWishlist,
            watchlist: nextWatchlist,
          });
        }
      })
      .catch(() => {
        if (isActive) {
          setResult({ reloadToken, status: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, [reloadToken, repository]);

  const summary = error
    ? "Currently unavailable"
    : isLoading
      ? "Loading saved items…"
      : `${listCountLabel(wishlist.length, "wishlist item")} · ${listCountLabel(
          watchlist.length,
          "watchlist item",
        )}`;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">
            Wishlist and Watchlists
          </h1>
          <p className="mt-2 text-slate-300">
            Track purchases you want and market prices you follow.
          </p>
        </div>
        <p
          className="text-sm text-slate-300"
          aria-live="polite"
          data-testid="saved-items-summary"
        >
          {summary}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-8 rounded-2xl border border-red-400/40 bg-red-500/10 p-8 text-center"
        >
          <p className="text-4xl" aria-hidden="true">
            🌊
          </p>
          <h2 className="mt-3 text-xl font-semibold text-white">
            Saved items could not be loaded. Please try again.
          </h2>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="mt-5 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <section
            aria-labelledby="wishlist-heading"
            className="rounded-2xl border border-white/10 bg-ink/60 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="wishlist-heading"
                className="text-xl font-semibold text-white"
              >
                Wishlist
              </h2>
              <p
                className="text-sm text-slate-300"
                aria-live="polite"
                data-testid="wishlist-count"
              >
                {isLoading
                  ? "Loading…"
                  : listCountLabel(wishlist.length, "item")}
              </p>
            </div>

            {isLoading ? (
              <div aria-busy="true" aria-live="polite">
                <p className="sr-only">Loading wishlist…</p>
                <ul className="mt-5 grid gap-3">
                  {Array.from({ length: 2 }, (_, index) => (
                    <li
                      key={index}
                      className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                    />
                  ))}
                </ul>
              </div>
            ) : wishlist.length > 0 ? (
              <ul className="mt-5 grid gap-3">
                {wishlist.map((item) => (
                  <li
                    key={item.id}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <span
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sea-blue/20 text-2xl"
                      aria-hidden="true"
                    >
                      {item.imageEmoji}
                    </span>
                    <article className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold text-white">
                          {item.itemName}
                        </h3>
                        <span className="rounded-full bg-sea-blue/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
                          {item.category}
                        </span>
                      </div>
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-400">Target price</dt>
                          <dd className="mt-1 text-base font-semibold text-amber-glow">
                            {priceFormatter.format(item.targetPrice)} gold
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Note</dt>
                          <dd className="mt-1 text-slate-200">{item.note}</dd>
                        </div>
                      </dl>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <p className="text-4xl" aria-hidden="true">
                  ⚓
                </p>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  No wishlist items yet
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Save items you want to buy and set a target price to wait for.
                </p>
              </div>
            )}
          </section>

          <section
            aria-labelledby="watchlist-heading"
            className="rounded-2xl border border-white/10 bg-ink/60 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="watchlist-heading"
                className="text-xl font-semibold text-white"
              >
                Watchlists
              </h2>
              <p
                className="text-sm text-slate-300"
                aria-live="polite"
                data-testid="watchlist-count"
              >
                {isLoading
                  ? "Loading…"
                  : listCountLabel(watchlist.length, "item")}
              </p>
            </div>

            {isLoading ? (
              <div aria-busy="true" aria-live="polite">
                <p className="sr-only">Loading watchlists…</p>
                <ul className="mt-5 grid gap-3">
                  {Array.from({ length: 2 }, (_, index) => (
                    <li
                      key={index}
                      className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                    />
                  ))}
                </ul>
              </div>
            ) : watchlist.length > 0 ? (
              <ul className="mt-5 grid gap-3">
                {watchlist.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <article>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold text-white">
                          {item.itemName}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.changePercent >= 0
                              ? "bg-emerald-400/15 text-emerald-300"
                              : "bg-red-400/15 text-red-300"
                          }`}
                        >
                          {changeFormatter.format(item.changePercent / 100)}
                        </span>
                      </div>
                      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-slate-400">Current price</dt>
                          <dd className="mt-1 text-base font-semibold text-amber-glow">
                            {priceFormatter.format(item.currentPrice)} gold
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Port</dt>
                          <dd className="mt-1 text-slate-200">{item.port}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Note</dt>
                          <dd className="mt-1 text-slate-200">{item.note}</dd>
                        </div>
                      </dl>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <p className="text-4xl" aria-hidden="true">
                  📈
                </p>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  No watchlist items yet
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Follow prices at ports you trade from to spot the right
                  window.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
