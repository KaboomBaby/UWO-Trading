# UWOMarket Page Map

This map records the desktop frame names visible in the owner’s signed-in Figma app. The public guest view used for Milestone 1 could not inspect these labels, so this document is the authoritative product scope.

## Figma sections and desktop frames

### Marketplace

- Home — market
- Browse listings
  - Default
  - Ships
  - Legacy
- Listing detail
  - Default
  - Legacy
  - Equipment
  - Trade
- Port directory
- Component items
- Search results

### Trading

- Price alerts manager
- Leaderboards
- Wishlist and Watchlists
- Guild storefront
- Shop catalog
- Market price index

### Account

The signed-in map identifies the Account section, but its individual desktop frame names were not supplied in this owner update.

## Canonical application routes

| Product frame              | Application route                        | Milestone status           |
| -------------------------- | ---------------------------------------- | -------------------------- |
| Home — market              | `/`                                      | Implemented in Milestone 1 |
| Browse listings — Default  | `/browse`                                | Implemented in Milestone 1 |
| Browse listings — Ships    | `/browse?category=ships`                 | Implemented in Milestone 1 |
| Browse listings — Legacy   | `/browse?collection=legacy`              | Implemented in Milestone 2 |
| Listing detail — Default   | `/listings/:listingId`                   | Implemented in Milestone 1 |
| Listing detail — Legacy    | `/listings/:listingId?variant=legacy`    | Implemented in Milestone 2 |
| Listing detail — Equipment | `/listings/:listingId?variant=equipment` | Implemented in Milestone 2 |
| Listing detail — Trade     | `/listings/:listingId?variant=trade`     | Implemented in Milestone 2 |
| Port directory             | `/ports`                                 | Implemented in Milestone 2 |
| Component items            | `/components`                            | Implemented in Milestone 2 |
| Search results             | `/search`                                | Implemented in Milestone 2 |
| Price alerts manager       | `/trading/price-alerts`                  | Planned                    |
| Leaderboards               | `/trading/leaderboards`                  | Planned                    |
| Wishlist and Watchlists    | `/account/wishlist-watchlists`           | Planned                    |
| Guild storefront           | `/guilds/storefront`                     | Planned                    |
| Shop catalog               | `/shops`                                 | Planned                    |
| Market price index         | `/market/prices`                         | Planned                    |

Route paths are a local application contract. They preserve the Figma frame intent while remaining shareable and query-addressable. Variant and collection values should remain URL state so users can link directly to the signed-in design’s Legacy, Equipment, and Trade contexts.

## Build sequencing

1. **Milestone 1 — Core marketplace:** Home, Default Browse, Ships Browse, Default Listing Detail, Post a Listing, and repository-backed local data. Complete.
2. **Milestone 2 — Marketplace depth:** Search results, Legacy browse/detail variants, Port directory, and Component items. Complete.
3. **Milestone 3 — Trading intelligence:** Market price index, Price alerts manager, Leaderboards, and detail Trade variant.
4. **Milestone 4 — Account and commerce:** Wishlist/Watchlists, Guild storefront, Shop catalog, Equipment detail variant, and the remaining Account surfaces once their signed-in frame names are available.

Every milestone should extend the typed local repository boundary before adding Supabase-specific calls. No credential or schema should be invented.
