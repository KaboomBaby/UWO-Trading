export const LISTING_CATEGORIES = [
  "ships",
  "property",
  "equipment",
  "resources",
  "services",
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export type ListingSort = "newest" | "price-asc" | "price-desc";

export type ListingQuery = {
  category?: ListingCategory | "all";
  search?: string;
  sort?: ListingSort;
};

export type Listing = {
  id: string;
  title: string;
  category: ListingCategory;
  price: number;
  currency: "gold";
  description: string;
  seller: string;
  location: string;
  imageEmoji: string;
  createdAt: string;
};

export type CreateListingInput = {
  title: string;
  category: ListingCategory;
  price: number;
  description: string;
  seller: string;
  location: string;
  imageEmoji?: string;
};
