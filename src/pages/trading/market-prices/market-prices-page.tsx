import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useTradingRepository } from "../../../lib/trading-repository-context";
import { normalizePriceCategory } from "../../../services/trading-service";
import { PRICE_CATEGORIES, type MarketPrice } from "../../../types/trading";

type PriceResult =
  | {
      category: string;
      search: string | undefined;
      status: "ready";
      prices: MarketPrice[];
    }
  | {
      category: string;
      search: string | undefined;
      status: "error";
    };

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const trendStyles = {
  rising: {
    label: "Rising",
    symbol: "▲",
    className: "bg-emerald-500/15 text-emerald-200",
  },
  falling: {
    label: "Falling",
    symbol: "▼",
    className: "bg-red-500/15 text-red-200",
  },
  stable: {
    label: "Stable",
    symbol: "▬",
    className: "bg-slate-500/20 text-slate-200",
  },
} as const;

function formatChange(changePercent: number) {
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(1)}%`;
}

function createPriceParams(category: string, search: string) {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (search.trim()) params.set("search", search.trim());
  return params;
}

export function MarketPricesPage() {
  const repository = useTradingRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = normalizePriceCategory(searchParams.get("category"));
  const searchValue = searchParams.get("search")?.trim() ?? "";
  const search = searchValue || undefined;
  const [searchDraft, setSearchDraft] = useState(searchValue);
  const lastExternalSearchRef = useRef(searchValue);
  const [result, setResult] = useState<PriceResult | null>(null);

  if (searchValue !== lastExternalSearchRef.current) {
    lastExternalSearchRef.current = searchValue;
    if (searchValue !== searchDraft.trim()) {
      setSearchDraft(searchValue);
    }
  }

  useEffect(() => {
    const canonicalParams = createPriceParams(category, searchValue);
    if (searchParams.toString() !== canonicalParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
  }, [category, searchParams, searchValue, setSearchParams]);

  useEffect(() => {
    let isActive = true;

    repository
      .listPrices({ category, search })
      .then((results) => {
        if (!isActive) return;
        setResult({ category, search, status: "ready", prices: results });
      })
      .catch(() => {
        if (!isActive) return;
        setResult({ category, search, status: "error" });
      });

    return () => {
      isActive = false;
    };
  }, [repository, category, search]);

  const currentResult =
    result?.category === category && result.search === search ? result : null;
  const prices = currentResult?.status === "ready" ? currentResult.prices : [];
  const status = currentResult?.status ?? "loading";

  function updateCategory(nextCategory: string) {
    const normalizedCategory = normalizePriceCategory(nextCategory);
    setSearchParams(createPriceParams(normalizedCategory, searchValue), {
      replace: true,
    });
  }

  function updateSearch(nextSearch: string) {
    setSearchParams(createPriceParams(category, nextSearch), {
      replace: true,
    });
  }

  const risingCount = prices.filter((price) => price.trend === "rising").length;
  const fallingCount = prices.filter(
    (price) => price.trend === "falling",
  ).length;
  const stableCount = prices.filter((price) => price.trend === "stable").length;
  const averageChange =
    prices.length === 0
      ? 0
      : prices.reduce((total, price) => total + price.changePercent, 0) /
        prices.length;

  return (
    <section
      aria-labelledby="market-prices-heading"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-glow">
          Trading intelligence
        </p>
        <h1
          id="market-prices-heading"
          className="mt-3 text-3xl font-semibold text-white sm:text-5xl"
        >
          Market price index
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          Track commodity, equipment, ship, and property movement across major
          ports before your next trade.
        </p>
      </div>

      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <div>
          <label
            htmlFor="price-search"
            className="text-sm font-semibold text-slate-200"
          >
            Search prices
          </label>
          <input
            id="price-search"
            name="search"
            type="search"
            value={searchDraft}
            onChange={(event) => {
              setSearchDraft(event.target.value);
              updateSearch(event.target.value);
            }}
            placeholder="Item or port"
            className="mt-2 w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30"
          />
        </div>
        <div>
          <label
            htmlFor="price-category"
            className="text-sm font-semibold text-slate-200"
          >
            Filter by category
          </label>
          <select
            id="price-category"
            name="category"
            value={category}
            onChange={(event) => updateCategory(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30"
          >
            <option value="all">All categories</option>
            {PRICE_CATEGORIES.map((availableCategory) => (
              <option key={availableCategory} value={availableCategory}>
                {availableCategory}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="mt-6" aria-live="polite" aria-busy={status === "loading"}>
        {status === "error" ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6">
            <h2 className="text-lg font-semibold text-white">
              Market prices are unavailable
            </h2>
            <p className="mt-2 text-sm text-red-100">
              Market price data is unavailable right now.
            </p>
          </div>
        ) : status === "loading" ? (
          <>
            <p className="sr-only">Loading market prices…</p>
            <div className="space-y-4" aria-hidden="true">
              <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
            </div>
          </>
        ) : prices.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <p
              aria-hidden="true"
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sea-blue/20 text-2xl"
            >
              📈
            </p>
            <h2 className="mt-4 text-xl font-semibold text-white">
              No prices match your filters
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
              Try another category or search for an item name or port.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-200">
              {prices.length} {prices.length === 1 ? "price" : "prices"} found
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <dt className="text-sm text-slate-400">Average movement</dt>
                <dd className="mt-2 text-2xl font-semibold text-white">
                  {formatChange(averageChange)}
                </dd>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                <dt className="text-sm text-emerald-100/80">Rising</dt>
                <dd className="mt-2 text-2xl font-semibold text-emerald-200">
                  {risingCount}
                </dd>
              </div>
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5">
                <dt className="text-sm text-red-100/80">Falling</dt>
                <dd className="mt-2 text-2xl font-semibold text-red-200">
                  {fallingCount}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <dt className="text-sm text-slate-400">Stable</dt>
                <dd className="mt-2 text-2xl font-semibold text-white">
                  {stableCount}
                </dd>
              </div>
            </dl>

            <div className="mt-5 overflow-x-auto rounded-3xl border border-white/10 bg-white/5">
              <table className="w-full min-w-[54rem] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Market prices by item, category, and port
                </caption>
                <thead className="bg-ink/80 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-4">
                      Item
                    </th>
                    <th scope="col" className="px-5 py-4">
                      Category
                    </th>
                    <th scope="col" className="px-5 py-4">
                      Port
                    </th>
                    <th scope="col" className="px-5 py-4 text-right">
                      Price
                    </th>
                    <th scope="col" className="px-5 py-4 text-right">
                      Change
                    </th>
                    <th scope="col" className="px-5 py-4">
                      Trend
                    </th>
                    <th scope="col" className="px-5 py-4">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {prices.map((price) => {
                    const trend = trendStyles[price.trend];
                    return (
                      <tr key={price.id} className="hover:bg-white/5">
                        <th
                          scope="row"
                          className="px-5 py-4 text-base font-semibold text-white"
                        >
                          {price.itemName}
                        </th>
                        <td className="px-5 py-4 capitalize text-slate-300">
                          {price.category}
                        </td>
                        <td className="px-5 py-4 text-slate-300">
                          {price.port}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-amber-glow">
                          {priceFormatter.format(price.price)} gold
                        </td>
                        <td
                          className={`px-5 py-4 text-right font-semibold ${
                            price.changePercent > 0
                              ? "text-emerald-200"
                              : price.changePercent < 0
                                ? "text-red-200"
                                : "text-slate-200"
                          }`}
                        >
                          {formatChange(price.changePercent)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${trend.className}`}
                          >
                            <span aria-hidden="true">{trend.symbol}</span>
                            {trend.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-400">
                          <time dateTime={price.updatedAt}>
                            {dateTimeFormatter.format(
                              new Date(price.updatedAt),
                            )}
                          </time>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
