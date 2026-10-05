import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useMarketRepository } from "../../lib/market-repository-context";
import { normalizeComponentCategory } from "../../services/market-service";
import { COMPONENT_CATEGORIES, type ComponentItem } from "../../types/market";

type ComponentsStatus = "loading" | "ready" | "error";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "decimal",
  maximumFractionDigits: 0,
});

const rarityStyles = {
  common: {
    label: "Common",
    className: "bg-slate-500/20 text-slate-200",
  },
  rare: {
    label: "Rare",
    className: "bg-sea-blue/20 text-sky-200",
  },
  epic: {
    label: "Epic",
    className: "bg-purple-500/20 text-purple-200",
  },
  legendary: {
    label: "Legendary",
    className: "bg-amber-glow/20 text-amber-glow",
  },
} as const;

function createComponentParams(category: string, search: string) {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (search.trim()) params.set("search", search.trim());
  return params;
}

export function ComponentsPage() {
  const repository = useMarketRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [status, setStatus] = useState<ComponentsStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const category = normalizeComponentCategory(searchParams.get("category"));
  const searchValue = searchParams.get("search")?.trim() ?? "";
  const search = searchValue || undefined;

  useEffect(() => {
    const canonicalParams = createComponentParams(category, searchValue);
    if (searchParams.toString() !== canonicalParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
  }, [category, searchParams, searchValue, setSearchParams]);

  useEffect(() => {
    let isActive = true;

    repository
      .listComponents({ category, search })
      .then((results) => {
        if (!isActive) return;
        setComponents(results);
        setStatus("ready");
      })
      .catch(() => {
        if (!isActive) return;
        setComponents([]);
        setStatus("error");
        setError("Component catalog data is unavailable right now.");
      });

    return () => {
      isActive = false;
    };
  }, [repository, category, search]);

  function updateCategory(nextCategory: string) {
    const normalizedCategory = normalizeComponentCategory(nextCategory);
    setSearchParams(createComponentParams(normalizedCategory, searchValue), {
      replace: true,
    });
  }

  function updateSearch(nextSearch: string) {
    setSearchParams(createComponentParams(category, nextSearch), {
      replace: true,
    });
  }

  return (
    <section
      aria-labelledby="components-heading"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-glow">
          Ship upgrades
        </p>
        <h1
          id="components-heading"
          className="mt-3 text-3xl font-semibold text-white sm:text-5xl"
        >
          Component items
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          Find rigging, armament, navigation, armor, and cargo upgrades with
          clear compatibility and stock information.
        </p>
      </div>

      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <div>
          <label
            htmlFor="component-search"
            className="text-sm font-semibold text-slate-200"
          >
            Search components
          </label>
          <input
            id="component-search"
            name="search"
            type="search"
            value={searchValue}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Name, description, rarity, or compatibility"
            className="mt-2 w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30"
          />
        </div>
        <div>
          <label
            htmlFor="component-category"
            className="text-sm font-semibold text-slate-200"
          >
            Filter by category
          </label>
          <select
            id="component-category"
            name="category"
            value={category}
            onChange={(event) => updateCategory(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30"
          >
            <option value="all">All categories</option>
            {COMPONENT_CATEGORIES.map((availableCategory) => (
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
              Components are unavailable
            </h2>
            <p className="mt-2 text-sm text-red-100">{error}</p>
          </div>
        ) : status === "loading" ? (
          <>
            <p className="sr-only">Loading components…</p>
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
        ) : components.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <p
              aria-hidden="true"
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-glow/15 text-2xl"
            >
              ⚙️
            </p>
            <h2 className="mt-4 text-xl font-semibold text-white">
              No components match your filters
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
              Try another category or search for a component name, rarity, or
              compatible ship type.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-200">
              {components.length}{" "}
              {components.length === 1 ? "component" : "components"} found
            </p>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {components.map((component) => {
                const rarity = rarityStyles[component.rarity];
                return (
                  <li key={component.id}>
                    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-amber-glow/50">
                      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-amber-glow/20 via-ink to-sea-blue/25 text-5xl">
                        <span aria-hidden="true">{component.imageEmoji}</span>
                      </div>
                      <div className="flex flex-1 flex-col gap-4 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="text-xl font-semibold text-white">
                              {component.name}
                            </h2>
                            <p className="mt-1 text-sm capitalize text-slate-300">
                              {component.category}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${rarity.className}`}
                          >
                            {rarity.label}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-300">
                          {component.description}
                        </p>
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Compatible with
                          </h3>
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {component.compatibleWith.map((shipType) => (
                              <li
                                key={shipType}
                                className="rounded-full bg-sea-blue/15 px-3 py-1 text-xs font-semibold text-sky-200"
                              >
                                {shipType}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <dl className="mt-auto space-y-3 rounded-2xl bg-ink/60 p-4 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-slate-400">Price</dt>
                            <dd className="font-semibold text-amber-glow">
                              {priceFormatter.format(component.price)} gold
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-slate-400">Stock</dt>
                            <dd
                              className={
                                component.inStock
                                  ? "font-semibold text-emerald-200"
                                  : "font-semibold text-red-200"
                              }
                            >
                              {component.inStock ? "In stock" : "Out of stock"}
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
