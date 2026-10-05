import { Link } from "react-router-dom";

type MarketplaceCategory = {
  slug: string;
  name: string;
  description: string;
  symbol: string;
};

const marketplaceCategories: MarketplaceCategory[] = [
  {
    slug: "ships",
    name: "Ships",
    description: "Trading vessels and upgrades",
    symbol: "⛵",
  },
  {
    slug: "property",
    name: "Property",
    description: "Buildings and commercial space",
    symbol: "🏛️",
  },
  {
    slug: "equipment",
    name: "Equipment",
    description: "Gear, cannons, and instruments",
    symbol: "🧭",
  },
  {
    slug: "resources",
    name: "Resources",
    description: "Cargo, materials, and supplies",
    symbol: "📦",
  },
  {
    slug: "services",
    name: "Services",
    description: "Escorts, repairs, and crews",
    symbol: "🤝",
  },
];

export function CategoryShortcuts() {
  return (
    <section aria-labelledby="category-shortcuts-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="category-shortcuts-heading"
            className="text-2xl font-semibold text-white sm:text-3xl"
          >
            Shop by category
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Jump directly to the marketplace categories captains use most.
          </p>
        </div>
        <Link
          to="/browse"
          className="rounded-lg border border-amber-glow/50 px-4 py-2 text-sm font-semibold text-amber-glow transition hover:bg-amber-glow/10"
        >
          View every listing
        </Link>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {marketplaceCategories.map((category) => (
          <li key={category.slug}>
            <Link
              to={`/browse?category=${category.slug}`}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-amber-glow/60 hover:bg-white/10"
            >
              <span
                aria-hidden="true"
                className="grid h-11 w-11 place-items-center rounded-xl bg-amber-glow/15 text-xl"
              >
                {category.symbol}
              </span>
              <span className="text-base font-semibold text-white">
                {category.name}
              </span>
              <span className="text-sm text-slate-300">
                {category.description}
              </span>
              <span className="mt-auto text-sm font-semibold text-amber-glow">
                Browse {category.name.toLowerCase()} listings
                <span aria-hidden="true"> →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
