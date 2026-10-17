-- Fix Mission 3, Phase 2: remove the Property category.
-- Owner's ruling (2026-10-12): Property promises trades UWO does not
-- support (land cannot be sold yet). David ruled on 2026-10-16 to delete
-- the seeded Property rows rather than recategorize them.
--
-- Live data check before writing this migration (2026-10-16): exactly one
-- 'property' row existed in each affected table, all of it original seed
-- data -- listings 'seville-townhouse', market_prices 'seville-townhouse',
-- shop_items 'shop-dock-office'. Dependents of the listing (edit codes,
-- offers, reports) cascade on delete.
--
-- Append-only: no historical migration is edited. The three listing
-- validation functions are redefined with bodies identical to their
-- current live definitions (private.create_listing and
-- private.update_listing from 20261006000500 as moved to the private
-- schema by 20261007000100; private.create_owned_listing from
-- 20261012070248) except that 'property' is removed from the category
-- list in each.

delete from public.listings where category = 'property';
delete from public.market_prices where category = 'property';
delete from public.shop_items where category = 'property';

alter table public.listings
  drop constraint if exists listings_category_check;
alter table public.listings
  add constraint listings_category_check check (
    category in ('ships', 'equipment', 'resources', 'services')
  );

alter table public.market_prices
  drop constraint if exists market_prices_category_check;
alter table public.market_prices
  add constraint market_prices_category_check check (
    category in ('commodities', 'equipment', 'ships')
  );

alter table public.shop_items
  drop constraint if exists shop_items_category_check;
alter table public.shop_items
  add constraint shop_items_category_check check (
    category in ('ships', 'equipment', 'supplies')
  );

create or replace function private.create_listing(
  edit_code text,
  title text,
  category text,
  currency text,
  price double precision,
  description text,
  seller text,
  location text,
  server_name text,
  contact_note text,
  image_url text default null,
  image_emoji text default '📦',
  ship_details jsonb default null,
  collection text default 'current'
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  inserted_listing public.listings;
begin
  if edit_code is null or char_length(edit_code) < 20 then
    raise exception 'A secure listing edit code is required.';
  end if;
  if title is null or char_length(btrim(title)) < 3 then
    raise exception 'Title must be at least 3 characters.';
  end if;
  if category not in ('ships', 'equipment', 'resources', 'services') then
    raise exception 'Invalid listing category.';
  end if;
  if currency not in ('ducats', 'UWC', 'CT', 'trade', 'negotiable') then
    raise exception 'Invalid listing currency.';
  end if;
  if not (
    (currency in ('ducats', 'UWC', 'CT') and price is not null and price > 0)
    or (currency in ('trade', 'negotiable') and price is null)
  ) then
    raise exception 'Listing price and currency do not match.';
  end if;
  if currency = 'CT' and price != floor(price) then
    raise exception 'Captain Tickets must be a whole number.';
  end if;
  if description is null or char_length(btrim(description)) < 10 then
    raise exception 'Description must be at least 10 characters.';
  end if;
  if seller is null or btrim(seller) = '' then
    raise exception 'Seller is required.';
  end if;
  if location is null or btrim(location) = '' then
    raise exception 'Location is required.';
  end if;
  if server_name is null or btrim(server_name) = '' then
    raise exception 'Server is required.';
  end if;
  if category = 'ships' and not public.ship_details_is_valid(ship_details) then
    raise exception 'Valid ship details are required for a Ships listing.';
  end if;
  if category <> 'ships' and ship_details is not null then
    raise exception 'Ship details are only allowed for Ships listings.';
  end if;

  insert into public.listings (
    title,
    category,
    currency,
    price,
    description,
    seller,
    location,
    server,
    contact_note,
    image_url,
    image_emoji,
    ship_details,
    collection,
    expires_at
  ) values (
    btrim(title),
    category,
    currency,
    price,
    btrim(description),
    btrim(seller),
    btrim(location),
    btrim(server_name),
    contact_note,
    null,
    coalesce(image_emoji, '📦'),
    case when category = 'ships' then ship_details else null end,
    coalesce(collection, 'current'),
    now() + interval '14 days'
  )
  returning *
  into inserted_listing;

  insert into public.listing_edit_codes (listing_id, edit_code_hash)
  values (
    inserted_listing.id,
    encode(extensions.digest(edit_code, 'sha256'), 'hex')
  );

  return jsonb_build_object(
    'listing',
    to_jsonb(inserted_listing),
    'edit_code',
    edit_code
  );
end;
$$;

create or replace function private.update_listing(
  edit_code text,
  title text,
  category text,
  currency text,
  price double precision,
  description text,
  seller text,
  location text,
  server_name text,
  contact_note text,
  image_url text default null,
  image_emoji text default '📦',
  ship_details jsonb default null,
  collection text default 'current'
) returns public.listings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  updated_listing public.listings;
begin
  if title is null or char_length(btrim(title)) < 3 then
    raise exception 'Title must be at least 3 characters.';
  end if;
  if category not in ('ships', 'equipment', 'resources', 'services') then
    raise exception 'Invalid listing category.';
  end if;
  if currency not in ('ducats', 'UWC', 'CT', 'trade', 'negotiable') then
    raise exception 'Invalid listing currency.';
  end if;
  if not (
    (currency in ('ducats', 'UWC', 'CT') and price is not null and price > 0)
    or (currency in ('trade', 'negotiable') and price is null)
  ) then
    raise exception 'Listing price and currency do not match.';
  end if;
  if currency = 'CT' and price != floor(price) then
    raise exception 'Captain Tickets must be a whole number.';
  end if;
  if description is null or char_length(btrim(description)) < 10 then
    raise exception 'Description must be at least 10 characters.';
  end if;
  if seller is null or btrim(seller) = '' then
    raise exception 'Seller is required.';
  end if;
  if location is null or btrim(location) = '' then
    raise exception 'Location is required.';
  end if;
  if server_name is null or btrim(server_name) = '' then
    raise exception 'Server is required.';
  end if;
  if category = 'ships' and not public.ship_details_is_valid(ship_details) then
    raise exception 'Valid ship details are required for a Ships listing.';
  end if;
  if category <> 'ships' and ship_details is not null then
    raise exception 'Ship details are only allowed for Ships listings.';
  end if;

  update public.listings listings
  set
    title = update_listing.title,
    category = update_listing.category,
    currency = update_listing.currency,
    price = update_listing.price,
    description = update_listing.description,
    seller = update_listing.seller,
    location = update_listing.location,
    server = update_listing.server_name,
    contact_note = update_listing.contact_note,
    image_url = null,
    image_emoji = coalesce(update_listing.image_emoji, '📦'),
    ship_details = case
      when update_listing.category = 'ships' then update_listing.ship_details
      else null
    end,
    collection = coalesce(update_listing.collection, 'current')
  from public.listing_edit_codes codes
  where codes.listing_id = listings.id
    and codes.edit_code_hash = encode(extensions.digest(update_listing.edit_code, 'sha256'), 'hex')
  returning listings.*
  into updated_listing;

  if updated_listing.id is null then
    raise exception 'Listing edit code not found.';
  end if;

  update public.listing_edit_codes
  set updated_at = now()
  where listing_id = updated_listing.id;

  return updated_listing;
end;
$$;

create or replace function private.create_owned_listing(
  title text,
  category text,
  currency text,
  price double precision,
  description text,
  seller text,
  location text,
  server_name text,
  contact_note text,
  image_emoji text default '📦',
  ship_details jsonb default null,
  collection text default 'current'
) returns public.listings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  listing_owner uuid := auth.uid();
  inserted_listing public.listings;
begin
  if listing_owner is null then
    raise exception 'Sign in to post a listing.';
  end if;
  if title is null or char_length(btrim(title)) < 3 then
    raise exception 'Title must be at least 3 characters.';
  end if;
  if category not in ('ships', 'equipment', 'resources', 'services') then
    raise exception 'Invalid listing category.';
  end if;
  if currency not in ('ducats', 'UWC', 'CT', 'trade', 'negotiable') then
    raise exception 'Invalid listing currency.';
  end if;
  if not (
    (
      currency in ('ducats', 'UWC', 'CT')
      and price is not null
      and price > 0
    )
    or (currency in ('trade', 'negotiable') and price is null)
  ) then
    raise exception 'Listing price and currency do not match.';
  end if;
  if currency = 'CT' and price != floor(price) then
    raise exception 'Captain Tickets must be a whole number.';
  end if;
  if description is null or char_length(btrim(description)) < 10 then
    raise exception 'Description must be at least 10 characters.';
  end if;
  if seller is null or btrim(seller) = '' then
    raise exception 'Seller is required.';
  end if;
  if location is null or btrim(location) = '' then
    raise exception 'Location is required.';
  end if;
  if server_name is null or btrim(server_name) = '' then
    raise exception 'Server is required.';
  end if;
  if category = 'ships' and not public.ship_details_is_valid(ship_details) then
    raise exception 'Valid ship details are required for a Ships listing.';
  end if;
  if category <> 'ships' and ship_details is not null then
    raise exception 'Ship details are only allowed for Ships listings.';
  end if;

  insert into public.listings (
    title,
    category,
    currency,
    price,
    description,
    seller,
    location,
    server,
    contact_note,
    image_url,
    image_emoji,
    ship_details,
    collection,
    expires_at,
    owner_id
  ) values (
    btrim(title),
    category,
    currency,
    price,
    btrim(description),
    btrim(seller),
    btrim(location),
    btrim(server_name),
    contact_note,
    null,
    coalesce(image_emoji, '📦'),
    case when category = 'ships' then ship_details else null end,
    coalesce(collection, 'current'),
    now() + interval '14 days',
    listing_owner
  )
  returning *
  into inserted_listing;

  return inserted_listing;
end;
$$;
