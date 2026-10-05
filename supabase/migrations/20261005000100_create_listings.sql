create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  price double precision not null,
  currency text not null default 'gold',
  description text not null,
  seller text not null,
  location text not null,
  image_emoji text not null default '📦',
  collection text not null default 'current',
  created_at timestamptz not null default now(),
  constraint listings_category_check check (
    category in ('ships', 'property', 'equipment', 'resources', 'services')
  ),
  constraint listings_collection_check check (collection in ('current', 'legacy')),
  constraint listings_currency_check check (currency in ('gold')),
  constraint listings_price_check check (price > 0)
);

alter table public.listings enable row level security;

drop policy if exists "Public can browse listings" on public.listings;
create policy "Public can browse listings"
  on public.listings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can post listings" on public.listings;
create policy "Public can post listings"
  on public.listings
  for insert
  to anon, authenticated
  with check (true);

create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_collection_idx on public.listings (collection);
