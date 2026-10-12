grant execute on function public.is_listing_owner(text)
  to authenticated;

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
security definer
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
