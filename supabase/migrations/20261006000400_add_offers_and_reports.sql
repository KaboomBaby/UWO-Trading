create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null
    references public.listings(id)
    on delete cascade,
  offerer_name text not null,
  contact text not null,
  currency text not null,
  amount double precision,
  offer_text text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint offers_currency_check check (
    currency in ('ducats', 'UWC', 'CT', 'trade', 'negotiable')
  ),
  constraint offers_status_check check (
    status in ('pending', 'accepted', 'declined')
  ),
  constraint offers_amount_currency_check check (
    (currency in ('ducats', 'UWC', 'CT') and amount is not null and amount > 0)
    or (currency in ('trade', 'negotiable') and amount is null)
  )
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null
    references public.listings(id)
    on delete cascade,
  reporter_name text not null,
  reason text not null,
  details text not null default '',
  created_at timestamptz not null default now(),
  constraint reports_reason_check check (
    reason in ('prohibited', 'fraud', 'spam', 'wrong-server', 'other')
  )
);

alter table public.offers enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Public can submit offers" on public.offers;
create policy "Public can submit offers"
  on public.offers
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public can report listings" on public.reports;
create policy "Public can report listings"
  on public.reports
  for insert
  to anon, authenticated
  with check (true);

create index if not exists offers_listing_created_idx
  on public.offers (listing_id, created_at desc);
create index if not exists reports_listing_created_idx
  on public.reports (listing_id, created_at desc);

create or replace function public.list_listing_offers(edit_code text)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select coalesce(
    jsonb_agg(
      to_jsonb(offers)
      order by
        case offers.status when 'pending' then 0 when 'accepted' then 1 else 2 end,
        offers.created_at desc
    ),
    '[]'::jsonb
  )
  from public.offers
  where offers.listing_id in (
    select listings.id
    from public.listings
    join public.listing_edit_codes
      on listing_edit_codes.listing_id = listings.id
    where listing_edit_codes.edit_code_hash =
      encode(extensions.digest(list_listing_offers.edit_code, 'sha256'), 'hex')
  );
$$;

create or replace function public.accept_listing_offer(
  edit_code text,
  offer_id uuid
) returns public.offers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  accepted_offer public.offers;
begin
  update public.offers offers
  set status = 'accepted'
  from public.listings listings
  join public.listing_edit_codes codes
    on codes.listing_id = listings.id
  where offers.listing_id = listings.id
    and offers.id = accept_listing_offer.offer_id
    and codes.edit_code_hash = encode(
      extensions.digest(accept_listing_offer.edit_code, 'sha256'),
      'hex'
    )
  returning offers.*
  into accepted_offer;

  if accepted_offer.id is null then
    raise exception 'Listing edit code or offer was not found.';
  end if;

  return accepted_offer;
end;
$$;

create or replace function public.decline_listing_offer(
  edit_code text,
  offer_id uuid
) returns public.offers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  declined_offer public.offers;
begin
  update public.offers offers
  set status = 'declined'
  from public.listings listings
  join public.listing_edit_codes codes
    on codes.listing_id = listings.id
  where offers.listing_id = listings.id
    and offers.id = decline_listing_offer.offer_id
    and codes.edit_code_hash = encode(
      extensions.digest(decline_listing_offer.edit_code, 'sha256'),
      'hex'
    )
  returning offers.*
  into declined_offer;

  if declined_offer.id is null then
    raise exception 'Listing edit code or offer was not found.';
  end if;

  return declined_offer;
end;
$$;

create or replace function public.listing_offer_count(listing_id text)
returns integer
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select count(*)::integer
  from public.offers
  where offers.listing_id = listing_offer_count.listing_id;
$$;

revoke all on function public.list_listing_offers(text)
  from public, anon, authenticated;
revoke all on function public.accept_listing_offer(text, uuid)
  from public, anon, authenticated;
revoke all on function public.decline_listing_offer(text, uuid)
  from public, anon, authenticated;
revoke all on function public.listing_offer_count(text)
  from public, anon, authenticated;

grant execute on function public.list_listing_offers(text)
  to anon, authenticated;
grant execute on function public.accept_listing_offer(text, uuid)
  to anon, authenticated;
grant execute on function public.decline_listing_offer(text, uuid)
  to anon, authenticated;
grant execute on function public.listing_offer_count(text)
  to anon, authenticated;
