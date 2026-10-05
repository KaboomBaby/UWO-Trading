import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useCommerceRepository } from "../../../lib/commerce-repository-context";
import type { GuildStorefront } from "../../../types/commerce";

type StorefrontState =
  | { status: "ready"; search: string; storefronts: GuildStorefront[] }
  | { status: "error"; search: string; message: string };

const orderFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function createCanonicalParams(search: string) {
  const params = new URLSearchParams();
  const normalizedSearch = search.trim();
  if (normalizedSearch) params.set("search", normalizedSearch);
  return params;
}

export function GuildStorefrontPage() {
  const repository = useCommerceRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<StorefrontState | null>(null);

  const search = searchParams.get("search")?.trim() ?? "";

  useEffect(() => {
    const canonicalParams = createCanonicalParams(search);
    if (canonicalParams.toString() !== searchParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
  }, [search, searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;

    repository
      .listGuildStorefronts(search || undefined)
      .then((storefronts) => {
        if (!active) return;
        setState({ status: "ready", search, storefronts });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          search,
          message:
            error instanceof Error
              ? error.message
              : "Unable to load guild storefronts.",
        });
      });

    return () => {
      active = false;
    };
  }, [repository, search]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const searchInput = event.currentTarget.elements.namedItem(
      "guild-storefront-search",
    );
    const nextSearch =
      searchInput instanceof HTMLInputElement ? searchInput.value : "";

    setSearchParams(createCanonicalParams(nextSearch));
  }

  const matchingState = state?.search === search ? state : null;
  const storefronts =
    matchingState?.status === "ready" ? matchingState.storefronts : [];
  const isLoading = !matchingState;

  return (
    <section
      aria-labelledby="guild-storefront-title"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-glow">
          Guild commerce
        </p>
        <h1
          className="mt-3 text-3xl font-semibold text-white sm:text-5xl"
          id="guild-storefront-title"
        >
          Guild storefront
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          Discover trading guilds by identity, motto, home port, and
          specialties. Search uses the shareable URL query and is evaluated by
          the commerce repository.
        </p>
      </div>

      <form
        aria-label="Search guild storefronts"
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={handleSearch}
        role="search"
      >
        <div className="flex-1">
          <label
            className="text-sm font-semibold text-slate-200"
            htmlFor="guild-storefront-search"
          >
            Search guilds, ports, mottos, and specialties
          </label>
          <input
            className="mt-2 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30"
            defaultValue={search}
            id="guild-storefront-search"
            key={search}
            name="guild-storefront-search"
            placeholder="Convoy escorts"
            type="search"
          />
        </div>
        <button
          className="rounded-lg bg-amber-glow px-4 py-2 font-semibold text-ink transition hover:opacity-90"
          type="submit"
        >
          Search storefronts
        </button>
      </form>

      {isLoading ? (
        <p
          aria-live="polite"
          className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300"
          role="status"
        >
          Loading guild storefronts…
        </p>
      ) : matchingState?.status === "error" ? (
        <div
          className="mt-8 rounded-2xl border border-red-400/40 bg-red-500/10 p-6"
          role="alert"
        >
          <h2 className="text-xl font-semibold text-white">
            Guild storefronts could not load
          </h2>
          <p className="mt-2 text-red-100">{matchingState.message}</p>
        </div>
      ) : (
        <div className="mt-8">
          <p
            aria-live="polite"
            className="text-sm font-semibold text-slate-300"
          >
            {storefronts.length}{" "}
            {storefronts.length === 1 ? "storefront" : "storefronts"}
            {search ? ` for “${search}”` : ""}
          </p>

          {storefronts.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center sm:p-10">
              <h2 className="text-xl font-semibold text-white">
                No guild storefronts match
              </h2>
              <p className="mt-2 text-slate-300">
                {search
                  ? `No guild identities, mottos, ports, or specialties match “${search}”.`
                  : "No guild storefronts are available in this session."}
              </p>
              {search ? (
                <Link
                  className="mt-5 inline-block rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
                  to="/guilds/storefront"
                >
                  Clear search
                </Link>
              ) : null}
            </div>
          ) : (
            <ul
              aria-label="Guild storefronts"
              className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
            >
              {storefronts.map((storefront) => (
                <li key={storefront.id}>
                  <article
                    aria-labelledby={`${storefront.id}-name`}
                    className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6"
                  >
                    <div className="flex items-start gap-4">
                      <span
                        aria-label={`${storefront.guildName} emblem`}
                        className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-amber-glow/15 text-3xl"
                        role="img"
                      >
                        {storefront.imageEmoji}
                      </span>
                      <div>
                        <h2
                          className="text-xl font-semibold text-white"
                          id={`${storefront.id}-name`}
                        >
                          {storefront.guildName}
                        </h2>
                        <p className="mt-1 text-sm text-slate-300">
                          {storefront.motto}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm">
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-ink/70 px-3 py-2">
                        <dt className="text-slate-400">Home port</dt>
                        <dd className="font-semibold text-white">
                          {storefront.homePort}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-ink/70 px-3 py-2">
                        <dt className="text-slate-400">Rating</dt>
                        <dd
                          aria-label={`${storefront.rating.toFixed(
                            1,
                          )} out of 5 stars`}
                          className="font-semibold text-amber-glow"
                        >
                          <span aria-hidden="true">★</span>{" "}
                          {storefront.rating.toFixed(1)} / 5
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-ink/70 px-3 py-2">
                        <dt className="text-slate-400">Orders</dt>
                        <dd className="font-semibold text-white">
                          {orderFormatter.format(storefront.completedOrders)}{" "}
                          completed
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 flex flex-1 flex-col justify-end">
                      <h3 className="text-sm font-semibold text-slate-200">
                        Specialties
                      </h3>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {storefront.specialties.map((specialty) => (
                          <li
                            className="rounded-full bg-amber-glow/15 px-3 py-1 text-xs font-semibold text-amber-glow"
                            key={specialty}
                          >
                            {specialty}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
