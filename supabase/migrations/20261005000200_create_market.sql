create table if not exists public.market_ports (
  id text primary key,
  name text not null unique,
  country text not null,
  region text not null,
  specialties text[] not null default '{}',
  description text not null,
  image_emoji text not null,
  docking_capacity integer not null,
  danger_level text not null,
  constraint market_ports_region_check check (
    region in (
      'Northern Europe',
      'Southern Europe',
      'Caribbean',
      'Africa',
      'Asia'
    )
  ),
  constraint market_ports_danger_level_check check (
    danger_level in ('low', 'moderate', 'high')
  ),
  constraint market_ports_docking_capacity_check check (docking_capacity >= 0)
);

create table if not exists public.components (
  id text primary key,
  name text not null,
  category text not null,
  rarity text not null,
  price double precision not null,
  description text not null,
  compatible_with text[] not null default '{}',
  image_emoji text not null,
  in_stock boolean not null default true,
  constraint components_category_check check (
    category in ('rigging', 'armament', 'navigation', 'armor', 'cargo')
  ),
  constraint components_rarity_check check (
    rarity in ('common', 'rare', 'epic', 'legendary')
  ),
  constraint components_price_check check (price >= 0)
);

alter table public.market_ports enable row level security;
alter table public.components enable row level security;

drop policy if exists "Public can browse market ports" on public.market_ports;
create policy "Public can browse market ports"
  on public.market_ports
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can browse components" on public.components;
create policy "Public can browse components"
  on public.components
  for select
  to anon, authenticated
  using (true);

create index if not exists market_ports_region_idx on public.market_ports (region);
create index if not exists components_category_idx on public.components (category);
