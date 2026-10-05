import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useMarketRepository } from "../../lib/market-repository-context";
import { normalizePortRegion } from "../../services/market-service";
import { PORT_REGIONS, type MarketPort } from "../../types/market";

type PortsStatus = "loading" | "ready" | "error";

const dangerLabels = {
  low: {
    label: "Low danger",
    className: "bg-emerald-500/15 text-emerald-200",
  },
  moderate: {
    label: "Moderate danger",
    className: "bg-amber-glow/15 text-amber-glow",
  },
  high: { label: "High danger", className: "bg-red-500/15 text-red-200" },
} as const;

function createPortParams(region: string, search: string) {
  const params = new URLSearchParams();
  if (region !== "all") params.set("region", region);
  if (search.trim()) params.set("search", search.trim());
  return params;
}

export function PortsPage() {
  const repository = useMarketRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ports, setPorts] = useState<MarketPort[]>([]);
  const [status, setStatus] = useState<PortsStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const region = normalizePortRegion(searchParams.get("region"));
  const searchValue = searchParams.get("search")?.trim() ?? "";
  const search = searchValue.trim() || undefined;

  useEffect(() => {
    const canonicalParams = createPortParams(region, searchValue);
    if (searchParams.toString() !== canonicalParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
  }, [region, searchParams, searchValue, setSearchParams]);

  useEffect(() => {
    let isActive = true;

    repository
      .listPorts({ region, search })
      .then((results) => {
        if (!isActive) return;
        setPorts(results);
        setStatus("ready");
      })
      .catch(() => {
        if (!isActive) return;
        setPorts([]);
        setStatus("error");
        setError("Port directory data is unavailable right now.");
      });

    return () => {
      isActive = false;
    };
  }, [repository, region, search]);

  function updateRegion(nextRegion: string) {
    const normalizedRegion = normalizePortRegion(nextRegion);
    setSearchParams(createPortParams(normalizedRegion, searchValue), {
      replace: true,
    });
  }

  function updateSearch(nextSearch: string) {
    setSearchParams(createPortParams(region, nextSearch), { replace: true });
  }

  return (
    <section
      aria-labelledby="ports-heading"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-glow">
          Navigate the world
        </p>
        <h1
          id="ports-heading"
          className="mt-3 text-3xl font-semibold text-white sm:text-5xl"
        >
          Port directory
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          Compare docking capacity, regional specialties, and risk before you
          commit your next route.
        </p>
      </div>

      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <div>
          <label
            htmlFor="port-search"
            className="text-sm font-semibold text-slate-200"
          >
            Search ports
          </label>
          <input
            id="port-search"
            name="search"
            type="search"
            value={searchValue}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Name, country, specialty, or description"
            className="mt-2 w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30"
          />
        </div>
        <div>
          <label
            htmlFor="port-region"
            className="text-sm font-semibold text-slate-200"
          >
            Filter by region
          </label>
          <select
            id="port-region"
            name="region"
            value={region}
            onChange={(event) => updateRegion(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30"
          >
            <option value="all">All regions</option>
            {PORT_REGIONS.map((availableRegion) => (
              <option key={availableRegion} value={availableRegion}>
                {availableRegion}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="mt-6" aria-live="polite" aria-busy={status === "loading"}>
        {status === "error" ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6">
            <h2 className="text-lg font-semibold text-white">
              Ports are unavailable
            </h2>
            <p className="mt-2 text-sm text-red-100">{error}</p>
          </div>
        ) : status === "loading" ? (
          <>
            <p className="sr-only">Loading ports…</p>
            <div
              className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
              aria-hidden="true"
            >
              {[0, 1, 2].map((card) => (
                <div
                  key={card}
                  className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/5"
                />
              ))}
            </div>
          </>
        ) : ports.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <p
              aria-hidden="true"
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sea-blue/20 text-2xl"
            >
              ⚓
            </p>
            <h2 className="mt-4 text-xl font-semibold text-white">
              No ports match your filters
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
              Try another region or search for a port name, country, or
              specialty.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-200">
              {ports.length} {ports.length === 1 ? "port" : "ports"} found
            </p>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {ports.map((port) => {
                const danger = dangerLabels[port.dangerLevel];
                return (
                  <li key={port.id}>
                    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-sea-blue/60">
                      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-sea-blue/30 via-ink to-amber-glow/10 text-5xl">
                        <span aria-hidden="true">{port.imageEmoji}</span>
                      </div>
                      <div className="flex flex-1 flex-col gap-4 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="text-xl font-semibold text-white">
                              {port.name}
                            </h2>
                            <p className="mt-1 text-sm text-slate-300">
                              {port.country} · {port.region}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${danger.className}`}
                          >
                            {danger.label}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-300">
                          {port.description}
                        </p>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Specialties
                          </h3>
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {port.specialties.map((specialty) => (
                              <li
                                key={specialty}
                                className="rounded-full bg-sea-blue/15 px-3 py-1 text-xs font-semibold text-sky-200"
                              >
                                {specialty}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <dl className="mt-auto grid grid-cols-2 gap-3 rounded-2xl bg-ink/60 p-4 text-sm">
                          <div>
                            <dt className="text-slate-400">Docking capacity</dt>
                            <dd className="mt-1 font-semibold text-white">
                              {port.dockingCapacity} ships
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">Region</dt>
                            <dd className="mt-1 font-semibold text-white">
                              {port.region}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
