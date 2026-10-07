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

export const SHIP_TYPES = ["battle", "trade", "adventure"] as const;
export type ShipType = (typeof SHIP_TYPES)[number];

export const SHIP_CLASSES = ["light", "standard", "heavy"] as const;
export type ShipClass = (typeof SHIP_CLASSES)[number];

export type ShipSkill = {
  name: string;
  iconId: string;
};

export type ShipDetails = {
  type: ShipType;
  shipClass: ShipClass;
  grade: number;
  role: string;
  performance: {
    verticalSail: number;
    horizontalSail: number;
    rowPower: number;
    turnSpeed: number;
    waveResistance: number;
    armour: number;
  };
  improvements: number;
  durability: number;
  hold: {
    crew: number;
    cannons: number;
    cargo: number;
    sailorsRequired: number;
  };
  sailingRequirements: {
    adventureLevel: number;
    tradeLevel: number;
    battleLevel: number;
  };
  buildingDays: number;
  requiredHull: string;
  originalSkill: ShipSkill | null;
  optionalSkills: ShipSkill[];
};

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
  imageEmoji: string;
  shipDetails?: ShipDetails | null;
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
  imageEmoji?: string;
  shipDetails?: ShipDetails | null;
  collection?: ListingCollection;
};

export type UpdateListingInput = CreateListingInput;
export type CreatedListing = Listing & { editCode: string };

export type OfferStatus = "pending" | "accepted" | "declined";

export type Offer = {
  id: string;
  listingId: string;
  offererName: string;
  contact: string;
  currency: ListingCurrency;
  amount: number | null;
  offerText: string;
  status: OfferStatus;
  createdAt: string;
};

export type CreateOfferInput = {
  offererName: string;
  contact: string;
  currency: ListingCurrency;
  amount: number | null;
  offerText: string;
};

export const REPORT_REASONS = [
  "prohibited",
  "fraud",
  "spam",
  "wrong-server",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export type CreateReportInput = {
  reporterName: string;
  reason: ReportReason;
  details?: string;
};
