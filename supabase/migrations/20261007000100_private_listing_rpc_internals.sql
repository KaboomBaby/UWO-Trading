create schema if not exists private;

grant usage on schema private
  to anon, authenticated, service_role;

alter function public.accept_listing_offer(text, uuid)
  set schema private;
alter function public.create_listing(
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
) set schema private;
alter function public.decline_listing_offer(text, uuid)
  set schema private;
alter function public.delete_listing(text)
  set schema private;
alter function public.get_listing_by_edit_code(text)
  set schema private;
alter function public.list_listing_offers(text)
  set schema private;
alter function public.listing_offer_count(text)
  set schema private;
alter function public.mark_listing_sold(text)
  set schema private;
alter function public.renew_listing(text)
  set schema private;
alter function public.update_listing(
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
) set schema private;

drop policy if exists "No direct listing edit code access"
  on public.listing_edit_codes;
create policy "No direct listing edit code access"
  on public.listing_edit_codes
  for all
  to anon, authenticated
  using (false)
  with check (false);

create function public.accept_listing_offer(edit_code text, offer_id uuid)
returns public.offers
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.accept_listing_offer(edit_code, offer_id);
$$;

create function public.create_listing(
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
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.create_listing(
    edit_code,
    title,
    category,
    currency,
    price,
    description,
    seller,
    location,
    server_name,
    contact_note,
    image_url,
    image_emoji,
    ship_details,
    collection
  );
$$;

create function public.decline_listing_offer(edit_code text, offer_id uuid)
returns public.offers
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.decline_listing_offer(edit_code, offer_id);
$$;

create function public.delete_listing(edit_code text)
returns boolean
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.delete_listing(edit_code);
$$;

create function public.get_listing_by_edit_code(edit_code text)
returns public.listings
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.get_listing_by_edit_code(edit_code);
$$;

create function public.list_listing_offers(edit_code text)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.list_listing_offers(edit_code);
$$;

create function public.listing_offer_count(listing_id text)
returns integer
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.listing_offer_count(listing_id);
$$;

create function public.mark_listing_sold(edit_code text)
returns public.listings
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.mark_listing_sold(edit_code);
$$;

create function public.renew_listing(edit_code text)
returns public.listings
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.renew_listing(edit_code);
$$;

create function public.update_listing(
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
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.update_listing(
    edit_code,
    title,
    category,
    currency,
    price,
    description,
    seller,
    location,
    server_name,
    contact_note,
    image_url,
    image_emoji,
    ship_details,
    collection
  );
$$;

revoke all on function public.accept_listing_offer(text, uuid)
  from public;
revoke all on function public.create_listing(
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
) from public;
revoke all on function public.decline_listing_offer(text, uuid)
  from public;
revoke all on function public.delete_listing(text)
  from public;
revoke all on function public.get_listing_by_edit_code(text)
  from public;
revoke all on function public.list_listing_offers(text)
  from public;
revoke all on function public.listing_offer_count(text)
  from public;
revoke all on function public.mark_listing_sold(text)
  from public;
revoke all on function public.renew_listing(text)
  from public;
revoke all on function public.update_listing(
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
) from public;

grant execute on function public.accept_listing_offer(text, uuid)
  to anon, authenticated;
grant execute on function public.create_listing(
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
) to anon, authenticated;
grant execute on function public.decline_listing_offer(text, uuid)
  to anon, authenticated;
grant execute on function public.delete_listing(text)
  to anon, authenticated;
grant execute on function public.get_listing_by_edit_code(text)
  to anon, authenticated;
grant execute on function public.list_listing_offers(text)
  to anon, authenticated;
grant execute on function public.listing_offer_count(text)
  to anon, authenticated;
grant execute on function public.mark_listing_sold(text)
  to anon, authenticated;
grant execute on function public.renew_listing(text)
  to anon, authenticated;
grant execute on function public.update_listing(
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
) to anon, authenticated;
