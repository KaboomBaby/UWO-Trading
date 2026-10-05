import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useCommerceRepository } from "../../lib/commerce-repository-context";
import { normalizeShopCategory } from "../../services/commerce-service";
import { SHOP_CATEGORIES, type ShopItem } from "../../types/commerce";

type ShopResult =
  | {
      category: string;
      search: string | undefined;
      status: "ready";
      items: ShopItem[];
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

function createShopParams(category: string, search: string) {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (search.trim()) params.set("search", search.trim());
  return params;
}

export function ShopCatalogPage() {
  const repository = useCommerceRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = normalizeShopCategory(searchParams.get("category"));
  const searchValue = searchParams.get("search")?.trim() ?? "";
  const search = searchValue || undefined;
  const [searchDraft, setSearchDraft] = useState(searchValue);
  const lastExternalSearchRef = useRef(searchValue);
  const [result, setResult] = useState<ShopResult | null>(null);

  if (searchValue !== lastExternalSearchRef.current) {
    lastExternalSearchRef.current = searchValue;
    if (searchValue !== searchDraft.trim()) {
      setSearchDraft(searchValue);
    }
  }

  useEffect(() => {
    const canonicalParams = createShopParams(category, searchValue);
    if (searchParams.toString() !== canonicalParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
  }, [category, searchParams, searchValue, setSearchParams]);

  useEffect(() => {
    let isActive = true;

    repository
      .listShopItems({ category, search })
      .then((items) => {
        if (!isActive) return;
        setResult({ category, search, status: "ready", items });
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
  const items = currentResult?.status === "ready" ? currentResult.items : [];
  const status = currentResult?.status ?? "loading";

  function updateCategory(nextCategory: string) {
    const normalizedCategory = normalizeShopCategory(nextCategory);
    setSearchParams(createShopParams(normalizedCategory, searchValue), {
      replace: true,
    });
  }

  function updateSearch(nextSearch: string) {
    setSearchParams(createShopParams(category, nextSearch), {
      replace: true,
    });
  }

  return (
    <section
      aria-labelledby="shop-catalog-heading"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-glow">
          Commerce
        </p>
        <h1
          id="shop-catalog-heading"
          className="mt-3 text-3xl font-semibold text-white sm:text-5xl"
        >
          Shop catalog
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          Browse ships, equipment, supplies, and property from trusted port
          sellers.
        </p>
      </div>

      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <div>
          <label
            htmlFor="shop-search"
            className="text-sm font-semibold text-slate-200"
          >
            Search shop items
          </label>
          <input
            id="shop-search"
            name="search"
            type="search"
            value={searchDraft}
            onChange={(event) => {
              setSearchDraft(event.target.value);
              updateSearch(event.target.value);
            }}
            placeholder="Item, seller, or description"
            className="mt-2 w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white placeholder:text-slate-500 focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30"
          />
        </div>
        <div>
          <label
            htmlFor="shop-category"
            className="text-sm font-semibold text-slate-200"
          >
            Filter by category
          </label>
          <select
            id="shop-category"
            name="category"
            value={category}
            onChange={(event) => updateCategory(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white focus:border-amber-glow focus:outline-none focus:ring-2 focus:ring-amber-glow/30"
          >
            <option value="all">All categories</option>
            {SHOP_CATEGORIES.map((availableCategory) => (
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
              Shop catalog is unavailable
            </h2>
            <p className="mt-2 text-sm text-red-100">
              Shop items could not be loaded right now. Please try again.
            </p>
          </div>
        ) : status === "loading" ? (
          <>
            <p className="sr-only">Loading shop items…</p>
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
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <p
              aria-hidden="true"
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-glow/15 text-2xl"
            >
              🛒
            </p>
            <h2 className="mt-4 text-xl font-semibold text-white">
              No shop items match your filters
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
              Try another category or search for an item, seller, or product
              description.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-200">
              {items.length} {items.length === 1 ? "item" : "items"} found
            </p>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-amber-glow/50">
                    <div className="flex h-32 items-center justify-center bg-gradient-to-br from-amber-glow/20 via-ink to-sea-blue/25 text-5xl">
                      <span aria-hidden="true">{item.imageEmoji}</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-4 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-semibold text-white">
                            {item.name}
                          </h2>
                          <p className="mt-1 text-sm capitalize text-slate-300">
                            {item.category}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                            item.stock > 0
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-red-500/15 text-red-200"
                          }`}
                        >
                          {item.stock > 0 ? "In stock" : "Out of stock"}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-300">
                        {item.description}
                      </p>
                      <dl className="mt-auto space-y-3 rounded-2xl bg-ink/60 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-slate-400">Price</dt>
                          <dd className="font-semibold text-amber-glow">
                            {priceFormatter.format(item.price)} gold
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-slate-400">Seller</dt>
                          <dd className="text-right text-slate-200">
                            {item.seller}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-slate-400">Stock</dt>
                          <dd
                            className={
                              item.stock > 0
                                ? "font-semibold text-emerald-200"
                                : "font-semibold text-red-200"
                            }
                          >
                            {item.stock > 0
                              ? `${item.stock} ${item.stock === 1 ? "unit" : "units"} available`
                              : "Currently unavailable"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
