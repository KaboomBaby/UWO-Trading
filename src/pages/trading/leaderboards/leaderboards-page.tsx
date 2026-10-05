import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useTradingRepository } from "../../../lib/trading-repository-context";
import { normalizeLeaderboardMetric } from "../../../services/trading-service";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
} from "../../../types/trading";

type BoardState =
  | {
      status: "ready";
      metric: LeaderboardMetric;
      search: string;
      entries: LeaderboardEntry[];
    }
  | {
      status: "error";
      metric: LeaderboardMetric;
      search: string;
      message: string;
    };

const metricCopy: Record<
  LeaderboardMetric,
  { label: string; column: string; description: string }
> = {
  profit: {
    label: "Profit",
    column: "Profit",
    description: "Ranked by gold profit earned",
  },
  volume: {
    label: "Volume",
    column: "Trading volume",
    description: "Ranked by total gold traded",
  },
  trades: {
    label: "Trades",
    column: "Trades completed",
    description: "Ranked by completed transactions",
  },
};

const metrics = Object.keys(metricCopy) as LeaderboardMetric[];
const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatMetricValue(entry: LeaderboardEntry, metric: LeaderboardMetric) {
  if (metric === "trades") {
    return numberFormatter.format(entry.trades);
  }
  return `${numberFormatter.format(entry[metric])} gold`;
}

function buildLeaderboardHref(metric: LeaderboardMetric, search: string) {
  const params = new URLSearchParams();
  if (metric !== "profit") params.set("metric", metric);
  if (search) params.set("search", search);
  const queryString = params.toString();

  return {
    pathname: "/trading/leaderboards",
    ...(queryString ? { search: `?${queryString}` } : {}),
  };
}

function buildCanonicalParams(metric: LeaderboardMetric, search: string) {
  const next = new URLSearchParams();
  next.set("metric", metric);
  if (metric === "profit") next.delete("metric");

  if (search) next.set("search", search);
  else next.delete("search");

  return next;
}

export function LeaderboardsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const repository = useTradingRepository();
  const [state, setState] = useState<BoardState | null>(null);

  const metric = normalizeLeaderboardMetric(searchParams.get("metric"));
  const search = searchParams.get("search")?.trim() ?? "";

  useEffect(() => {
    const canonicalParams = buildCanonicalParams(metric, search);
    if (canonicalParams.toString() !== searchParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
  }, [metric, search, searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;

    repository
      .listLeaderboard({
        metric,
        ...(search ? { search } : {}),
      })
      .then((entries) => {
        if (!active) return;
        setState({ status: "ready", metric, search, entries });
      })
      .catch(() => {
        if (!active) return;
        setState({
          status: "error",
          metric,
          search,
          message: "Unable to load leaderboards.",
        });
      });

    return () => {
      active = false;
    };
  }, [metric, repository, search]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget.elements;
    const value = formElement.namedItem("leaderboard-search");
    const nextSearch =
      value instanceof HTMLInputElement ? value.value.trim() : "";

    setSearchParams(buildCanonicalParams(metric, nextSearch));
  }

  const matchingState =
    state && state.metric === metric && state.search === search ? state : null;
  const isLoading = !matchingState;
  const entries =
    matchingState?.status === "ready" ? matchingState.entries : [];

  return (
    <section
      aria-labelledby="leaderboards-title"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6"
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-glow">
          Trading intelligence
        </p>
        <h1
          className="mt-4 text-3xl font-semibold text-white"
          id="leaderboards-title"
        >
          Leaderboards
        </h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          Compare top trading performance by profit, volume, or completed trade
          count. Searches match trader and port details.
        </p>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <nav aria-label="Leaderboard metrics">
            <p className="text-sm font-semibold text-slate-200">Metric</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {metrics.map((item) => {
                const isActive = item === metric;

                return (
                  <li key={item}>
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-amber-glow/70 bg-amber-glow/15 text-white"
                          : "border-white/10 bg-white/5 text-slate-200 hover:border-white/25 hover:bg-white/10"
                      }`}
                      to={buildLeaderboardHref(item, search)}
                    >
                      {metricCopy[item].label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <form
            aria-label="Search traders and ports"
            className="flex min-w-full max-w-lg flex-col gap-3 sm:min-w-80 sm:flex-row sm:items-center"
            onSubmit={handleSubmit}
            role="search"
          >
            <div className="flex-1">
              <label
                className="text-sm font-semibold text-slate-200"
                htmlFor="leaderboard-search"
              >
                Search traders and ports
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30"
                defaultValue={search}
                id="leaderboard-search"
                key={search}
                name="leaderboard-search"
                placeholder="Port Royal"
                type="search"
              />
            </div>
            <button
              className="rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90 sm:mt-6"
              type="submit"
            >
              Search
            </button>
          </form>
        </div>

        <p className="mt-6 text-sm text-slate-400">
          {metricCopy[metric].column} · {metricCopy[metric].description}
        </p>

        {isLoading ? (
          <p aria-live="polite" className="mt-8 text-slate-300" role="status">
            Loading {metricCopy[metric].label.toLowerCase()} leaderboard…
          </p>
        ) : matchingState?.status === "error" ? (
          <div
            className="mt-8 rounded-2xl border border-red-400/40 bg-red-500/10 p-6"
            role="alert"
          >
            <h2 className="text-xl font-semibold text-white">
              Leaderboards could not load
            </h2>
            <p className="mt-2 text-red-100">{matchingState.message}</p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-300">
              {entries.length} {entries.length === 1 ? "result" : "results"}
              {search ? ` for “${search}”` : ""}
            </p>

            {entries.length === 0 ? (
              <div
                className="mt-4 rounded-2xl border border-white/10 bg-ink/70 p-6 text-center"
                role="status"
              >
                <h2 className="text-xl font-semibold text-white">
                  No leaderboard matches
                </h2>
                <p className="mt-2 text-slate-300">
                  No traders or ports match “{search}”. Clear the search to see
                  the full {metricCopy[metric].label.toLowerCase()} ranking.
                </p>
                <Link
                  className="mt-4 inline-block rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
                  to={buildLeaderboardHref(metric, "")}
                >
                  Clear search
                </Link>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-135 border-collapse text-left text-sm">
                  <caption className="sr-only">
                    Traders ranked by {metricCopy[metric].column}
                  </caption>
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="px-4 py-3" scope="col">
                        Rank
                      </th>
                      <th className="px-4 py-3" scope="col">
                        Trader
                      </th>
                      <th className="px-4 py-3" scope="col">
                        Port
                      </th>
                      <th
                        aria-sort="descending"
                        className="px-4 py-3"
                        scope="col"
                      >
                        {metricCopy[metric].column}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr
                        className="border-b border-white/5 text-slate-200 odd:bg-white/5"
                        key={entry.id}
                      >
                        <th
                          className="px-4 py-4 font-semibold text-white"
                          scope="row"
                        >
                          {index + 1}
                        </th>
                        <td className="px-4 py-4 font-semibold text-white">
                          {entry.trader}
                        </td>
                        <td className="px-4 py-4">{entry.port}</td>
                        <td className="px-4 py-4 font-semibold text-amber-glow">
                          {formatMetricValue(entry, metric)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
