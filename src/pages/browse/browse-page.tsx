import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ListingGrid } from "../../components/listings/listing-grid";
import { EquipmentList } from "../../components/listings/equipment-list";
import { EquipmentSkillPicker } from "../../components/equipment/equipment-skill-picker";
import { getEquipmentSkill } from "../../data/equipment-skills";
import { useListingRepository } from "../../lib/listing-repository-context";
import {
  LISTING_CATEGORIES,
  type Listing,
  type ListingCategory,
  type ListingCollection,
  type ListingQuery,
  type ListingSort,
} from "../../types/listing";

type BrowseCategory = ListingCategory | "all";
type BrowseCollection = ListingCollection;
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

const COLLECTION_FILTERS: Array<{
  value: BrowseCollection;
  label: string;
  description: string;
}> = [
  { value: "current", label: "Current", description: "Active market" },
  { value: "legacy", label: "Legacy", description: "Classic collection" },
];

function parseCategory(value: string | null): BrowseCategory {
  return LISTING_CATEGORIES.includes(value as ListingCategory)
    ? (value as ListingCategory)
    : "all";
}

function parseCollection(value: string | null): BrowseCollection {
  return value === "legacy" ? "legacy" : "current";
}

function createBrowseParams(
  category: BrowseCategory,
  collection: BrowseCollection,
) {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (collection === "legacy") params.set("collection", collection);
  return params;
}

type EquipmentStatKey =
  "durability" | "formality" | "disguiseLevel" | "attackPower" | "defencePower";

const EQUIPMENT_STAT_OPTIONS: Array<{
  value: EquipmentStatKey;
  label: string;
}> = [
  { value: "attackPower", label: "Attack Power" },
  { value: "defencePower", label: "Defence Power" },
  { value: "durability", label: "Durability" },
  { value: "formality", label: "Formality" },
  { value: "disguiseLevel", label: "Disguise Level" },
];

function equipmentStatValue(
  listing: Listing,
  key: EquipmentStatKey,
): number | null {
  const details = listing.equipmentDetails;
  if (!details) return null;
  if (key === "durability") {
    return details.durabilityCurrent ?? details.durabilityMax ?? null;
  }
  return details[key] ?? null;
}

export function BrowsePage() {
  const repository = useListingRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = parseCategory(searchParams.get("category"));
  const collection = parseCollection(searchParams.get("collection"));
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ListingSort>("newest");
  const [ticketsOnly, setTicketsOnly] = useState(false);
  const [skillFilter, setSkillFilter] = useState<string[]>(["", "", ""]);
  const [statSort, setStatSort] = useState<{
    key: EquipmentStatKey;
    direction: "asc" | "desc";
  } | null>(null);
  const [result, setResult] = useState<ListingResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const query = useMemo(
    () => ({
      category,
      collection,
      search: search.trim() || undefined,
      sort,
      ticketsOnly: ticketsOnly || undefined,
    }),
    [category, collection, search, sort, ticketsOnly],
  );
  const currentResult =
    result?.query === query && result.reloadToken === reloadToken
      ? result
      : null;
  const listings =
    currentResult?.status === "success" ? currentResult.listings : [];
  const visibleListings = useMemo(() => {
    if (category !== "equipment") return listings;
    let out = listings;
    const wanted = skillFilter.filter(Boolean);
    if (wanted.length > 0) {
      out = out.filter((listing) => {
        const owned = new Set(
          (listing.equipmentDetails?.skillBonuses ?? []).map(
            (bonus) => bonus.iconId,
          ),
        );
        return wanted.every((iconId) => owned.has(iconId));
      });
    }
    if (statSort) {
      const factor = statSort.direction === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        const va = equipmentStatValue(a, statSort.key);
        const vb = equipmentStatValue(b, statSort.key);
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        return (va - vb) * factor;
      });
    }
    return out;
  }, [category, listings, skillFilter, statSort]);
  const displayedListings =
    category === "equipment" ? visibleListings : listings;
  const isLoading = !currentResult;
  const error = currentResult?.status === "error";

  useEffect(() => {
    const canonicalParams = createBrowseParams(category, collection);
    if (searchParams.toString() !== canonicalParams.toString()) {
      setSearchParams(canonicalParams, { replace: true });
    }
  }, [category, collection, searchParams, setSearchParams]);

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
      setSkillFilter(["", "", ""]);
      setStatSort(null);
      setSearchParams(createBrowseParams(nextCategory, collection));
    },
    [collection, setSearchParams],
  );

  const collectionPath = useCallback(
    (nextCollection: BrowseCollection) => {
      const nextParams = createBrowseParams(category, nextCollection);
      const nextSearch = nextParams.toString();
      return nextSearch ? `/browse?${nextSearch}` : "/browse";
    },
    [category],
  );

  const clearFilters = () => {
    setSearch("");
    setSort("newest");
    setTicketsOnly(false);
    setSkillFilter(["", "", ""]);
    setStatSort(null);
    setSearchParams(new URLSearchParams());
    setReloadToken((token) => token + 1);
  };

  const hasActiveFilters =
    category !== "all" ||
    collection === "legacy" ||
    search.trim().length > 0 ||
    sort !== "newest" ||
    ticketsOnly ||
    skillFilter.some(Boolean) ||
    statSort !== null;
  const resultLabel = displayedListings.length === 1 ? "listing" : "listings";

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Browse listings</h1>
          <p className="mt-2 text-slate-300">
            Find ships, equipment, resources, and crew-ready trade deals.
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
              : `${displayedListings.length} ${resultLabel}`}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-ink/60 p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Collection
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Switch between active listings and classic legacy inventory.
            </p>
          </div>
          <div
            className="flex gap-1 rounded-xl border border-white/10 bg-ink/70 p-1"
            role="group"
            aria-label="Filter by collection"
          >
            {COLLECTION_FILTERS.map((filter) => (
              <Link
                key={filter.value}
                to={collectionPath(filter.value)}
                aria-current={collection === filter.value ? "true" : undefined}
                title={filter.description}
                className={
                  collection === filter.value
                    ? "rounded-lg bg-amber-glow px-4 py-2 text-sm font-semibold text-ink"
                    : "rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                }
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>
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
            {category === "ships" ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setTicketsOnly((value) => !value)}
                  aria-pressed={ticketsOnly}
                  className={
                    ticketsOnly
                      ? "rounded-full bg-amber-glow px-4 py-2 text-sm font-semibold text-ink"
                      : "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/10"
                  }
                >
                  Tickets only
                </button>
              </div>
            ) : null}
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
                value={statSort ? `stat:${statSort.key}` : sort}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value.startsWith("stat:")) {
                    const key = value.slice(5) as EquipmentStatKey;
                    setStatSort({
                      key,
                      direction:
                        statSort?.key === key ? statSort.direction : "desc",
                    });
                  } else {
                    setStatSort(null);
                    setSort(value as ListingSort);
                  }
                }}
                className="rounded-xl border border-white/15 bg-ink/70 px-4 py-2.5 text-base text-white focus:border-amber-glow focus:outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {category === "equipment"
                  ? EQUIPMENT_STAT_OPTIONS.map((option) => (
                      <option key={option.value} value={`stat:${option.value}`}>
                        {option.label}
                      </option>
                    ))
                  : null}
              </select>
            </label>
            {statSort ? (
              <button
                aria-label={
                  statSort.direction === "desc"
                    ? "Highest first. Switch to lowest first."
                    : "Lowest first. Switch to highest first."
                }
                className="rounded-xl border border-amber-glow/50 bg-amber-glow/10 px-4 py-2.5 text-sm font-semibold text-amber-glow transition hover:bg-amber-glow/20"
                onClick={() =>
                  setStatSort((current) =>
                    current
                      ? {
                          ...current,
                          direction:
                            current.direction === "desc" ? "asc" : "desc",
                        }
                      : current,
                  )
                }
                type="button"
              >
                {statSort.direction === "desc"
                  ? "Highest first ↓"
                  : "Lowest first ↑"}
              </button>
            ) : null}
          </div>
        </div>

        {category === "equipment" ? (
          <div className="mt-5 border-t border-white/10 pt-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Find by skill{" "}
              <span className="font-normal normal-case text-slate-400">
                (up to 3, optional — listings must have every skill picked)
              </span>
            </h2>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {[0, 1, 2].map((slot) => (
                <EquipmentSkillPicker
                  disabledIconIds={skillFilter.filter(
                    (iconId, index) => index !== slot && Boolean(iconId),
                  )}
                  id={`browse-skill-${slot + 1}`}
                  key={slot}
                  label={`Skill ${slot + 1}`}
                  onChange={(iconId) =>
                    setSkillFilter((previous) => {
                      const next = [...previous];
                      next[slot] = iconId;
                      return next;
                    })
                  }
                  selectedSkill={
                    skillFilter[slot]
                      ? getEquipmentSkill(skillFilter[slot])
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        ) : null}
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
        ) : displayedListings.length > 0 ? (
          category === "equipment" ? (
            <EquipmentList listings={displayedListings} />
          ) : (
            <ListingGrid listings={displayedListings} />
          )
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
