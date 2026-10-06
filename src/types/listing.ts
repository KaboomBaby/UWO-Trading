export const LISTING_CATEGORIES = [
  "ships",
  "property",
  "equipment",
  "resources",
  "services",
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export type ListingSort = "newest" | "price-asc" | "price-desc";
export type ListingCollection = "current" | "legacy";

export const LISTING_CURRENCIES = [
  "ducats",
  "UWC",
  "CT",
  "trade",
  "negotiable",
] as const;

export type ListingCurrency = (typeof LISTING_CURRENCIES)[number];
export const NUMERIC_LISTING_CURRENCIES = [
  "ducats",
  "UWC",
  "CT",
] as const satisfies ReadonlyArray<ListingCurrency>;

export type NumericListingCurrency =
  (typeof NUMERIC_LISTING_CURRENCIES)[number];

export function isNumericListingCurrency(
  currency: ListingCurrency,
): currency is NumericListingCurrency {
  return NUMERIC_LISTING_CURRENCIES.includes(
    currency as NumericListingCurrency,
  );
}

export function formatListingPrice(
  price: Listing["price"],
  currency: ListingCurrency,
) {
  if (currency === "trade") return "Trade";
  if (currency === "negotiable") return "Negotiable";
  if (price === null) return "Price unavailable";

  const amount = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: currency === "CT" ? 0 : 2,
  }).format(price);
  return currency === "ducats" ? `${amount} ducats` : `${amount} ${currency}`;
}

export type ListingQuery = {
  category?: ListingCategory | "all";
  collection?: ListingCollection | "all";
  includeExpired?: boolean;
  search?: string;
  sort?: ListingSort;
};

export type Listing = {
  id: string;
  title: string;
  category: ListingCategory;
  price: number | null;
  currency: ListingCurrency;
  description: string;
  seller: string;
  location: string;
  server: string;
  contactNote: string;
  imageUrl?: string | null;
  imageEmoji: string;
  createdAt: string;
  expiresAt: string;
  soldAt?: string | null;
  collection?: ListingCollection;
};

export type CreateListingInput = {
  title: string;
  category: ListingCategory;
  currency: ListingCurrency;
  price: number | null;
  description: string;
  seller: string;
  location: string;
  server: string;
  contactNote?: string;
  imageUrl?: string;
  imageEmoji?: string;
  collection?: ListingCollection;
};

export type UpdateListingInput = CreateListingInput;
export type CreatedListing = Listing & { editCode: string };
