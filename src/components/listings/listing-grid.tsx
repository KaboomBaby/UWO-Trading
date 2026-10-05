import { ListingCard } from "./listing-card";
import type { Listing } from "../../types/listing";

export function ListingGrid({ listings }: { listings: Listing[] }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
        <li key={listing.id} className="h-full">
          <ListingCard listing={listing} />
        </li>
      ))}
    </ul>
  );
}
