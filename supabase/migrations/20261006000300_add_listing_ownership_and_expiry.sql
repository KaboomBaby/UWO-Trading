alter table public.listings
  add column if not exists expires_at timestamptz,
  add column if not exists sold_at timestamptz;

update public.listings
set expires_at = created_at + interval '14 days'
where expires_at is null;

alter table public.listings
  alter column expires_at set not null;

create table if not exists public.listing_edit_codes (
  listing_id text primary key
    references public.listings(id)
    on delete cascade,
  edit_code_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listing_edit_codes_hash_length_check check (
    char_length(edit_code_hash) = 64
  )
);

alter table public.listing_edit_codes enable row level security;

create index if not exists listings_expires_at_idx
  on public.listings (expires_at);
create index if not exists listings_sold_at_idx
  on public.listings (sold_at);

create or replace function public.create_listing(
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
  image_url text,
  image_emoji text,
  collection text
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
  if category not in ('ships', 'property', 'equipment', 'resources', 'services') then
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
    image_url,
    coalesce(image_emoji, '📦'),
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

create or replace function public.get_listing_by_edit_code(edit_code text)
returns public.listings
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select listings.*
  from public.listings
  join public.listing_edit_codes
    on listing_edit_codes.listing_id = listings.id
  where listing_edit_codes.edit_code_hash =
    encode(extensions.digest(edit_code, 'sha256'), 'hex')
  limit 1;
$$;

create or replace function public.update_listing(
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
  image_url text,
  image_emoji text,
  collection text
) returns public.listings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  updated_listing public.listings;
begin
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
    image_url = update_listing.image_url,
    image_emoji = coalesce(update_listing.image_emoji, '📦'),
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

create or replace function public.mark_listing_sold(edit_code text)
returns public.listings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  sold_listing public.listings;
begin
  update public.listings listings
  set sold_at = coalesce(listings.sold_at, now())
  from public.listing_edit_codes codes
  where codes.listing_id = listings.id
    and codes.edit_code_hash = encode(extensions.digest(mark_listing_sold.edit_code, 'sha256'), 'hex')
  returning listings.*
  into sold_listing;

  if sold_listing.id is null then
    raise exception 'Listing edit code not found.';
  end if;

  return sold_listing;
end;
$$;

create or replace function public.renew_listing(edit_code text)
returns public.listings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  renewed_listing public.listings;
begin
  update public.listings listings
  set expires_at = now() + interval '14 days'
  from public.listing_edit_codes codes
  where codes.listing_id = listings.id
    and codes.edit_code_hash = encode(extensions.digest(renew_listing.edit_code, 'sha256'), 'hex')
  returning listings.*
  into renewed_listing;

  if renewed_listing.id is null then
    raise exception 'Listing edit code not found.';
  end if;

  return renewed_listing;
end;
$$;

create or replace function public.delete_listing(edit_code text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  deleted_count integer;
begin
  delete from public.listings listings
  using public.listing_edit_codes codes
  where codes.listing_id = listings.id
    and codes.edit_code_hash = encode(extensions.digest(delete_listing.edit_code, 'sha256'), 'hex');

  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke all on function public.create_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.get_listing_by_edit_code(text)
  from public, anon, authenticated;
revoke all on function public.update_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.mark_listing_sold(text)
  from public, anon, authenticated;
revoke all on function public.renew_listing(text)
  from public, anon, authenticated;
revoke all on function public.delete_listing(text)
  from public, anon, authenticated;

grant execute on function public.create_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, text
) to anon, authenticated;
grant execute on function public.get_listing_by_edit_code(text)
  to anon, authenticated;
grant execute on function public.update_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, text
) to anon, authenticated;
grant execute on function public.mark_listing_sold(text)
  to anon, authenticated;
grant execute on function public.renew_listing(text)
  to anon, authenticated;
grant execute on function public.delete_listing(text)
  to anon, authenticated;
