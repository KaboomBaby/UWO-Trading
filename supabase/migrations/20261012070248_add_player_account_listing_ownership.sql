alter table public.listings
  add column if not exists owner_id uuid
  references auth.users(id)
  on delete set null;

create index if not exists listings_owner_id_idx
  on public.listings (owner_id);

create or replace function public.is_listing_owner(target_listing_id text)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.listings
    where listings.id = is_listing_owner.target_listing_id
      and listings.owner_id = (select auth.uid())
  )
$$;

revoke all on function public.is_listing_owner(text)
  from public, anon, authenticated;

drop policy if exists "Authenticated users can insert owned listings"
  on public.listings;
create policy "Authenticated users can insert owned listings"
  on public.listings
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can update their listings"
  on public.listings;
create policy "Owners can update their listings"
  on public.listings
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can delete their listings"
  on public.listings;
create policy "Owners can delete their listings"
  on public.listings
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Listing owners can read offers"
  on public.offers;
create policy "Listing owners can read offers"
  on public.offers
  for select
  to authenticated
  using ((select public.is_listing_owner(offers.listing_id)));

drop policy if exists "Listing owners can update offers"
  on public.offers;
create policy "Listing owners can update offers"
  on public.offers
  for update
  to authenticated
  using ((select public.is_listing_owner(offers.listing_id)))
  with check ((select public.is_listing_owner(offers.listing_id)));

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
  if category not in ('ships', 'property', 'equipment', 'resources', 'services') then
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

revoke all on function private.create_owned_listing(
  text,
  text,
  text,
  double precision,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text
)
  from public, anon, authenticated;

create or replace function public.create_owned_listing(
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
language sql
set search_path = pg_catalog, public, private
as $$
  select private.create_owned_listing(
    title,
    category,
    currency,
    price,
    description,
    seller,
    location,
    server_name,
    contact_note,
    image_emoji,
    ship_details,
    collection
  )
$$;

revoke all on function public.create_owned_listing(
  text,
  text,
  text,
  double precision,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text
)
  from public, anon;
grant execute on function public.create_owned_listing(
  text,
  text,
  text,
  double precision,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text
)
  to authenticated;

revoke execute on function public.create_listing(
  text,
  text,
  text,
  text,
  double precision,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text
)
  from public, anon, authenticated;
