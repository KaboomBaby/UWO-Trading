create table if not exists public.market_prices (
  id text primary key,
  item_name text not null,
  category text not null,
  port text not null,
  price double precision not null,
  change_percent double precision not null,
  trend text not null,
  updated_at timestamptz not null default now(),
  constraint market_prices_category_check check (
    category in ('commodities', 'equipment', 'ships', 'property')
  ),
  constraint market_prices_trend_check check (
    trend in ('rising', 'falling', 'stable')
  ),
  constraint market_prices_price_check check (price >= 0)
);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  target_price double precision not null,
  direction text not null,
  status text not null default 'active',
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint price_alerts_direction_check check (direction in ('above', 'below')),
  constraint price_alerts_status_check check (
    status in ('active', 'paused', 'triggered')
  ),
  constraint price_alerts_target_price_check check (target_price > 0)
);

create table if not exists public.leaderboard_entries (
  id text primary key,
  trader text not null,
  port text not null,
  profit double precision not null,
  volume double precision not null,
  trades integer not null,
  constraint leaderboard_entries_trades_check check (trades >= 0)
);

alter table public.market_prices enable row level security;
alter table public.price_alerts enable row level security;
alter table public.leaderboard_entries enable row level security;

drop policy if exists "Public can browse market prices" on public.market_prices;
create policy "Public can browse market prices"
  on public.market_prices
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can view price alerts" on public.price_alerts;
create policy "Public can view price alerts"
  on public.price_alerts
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can create price alerts" on public.price_alerts;
create policy "Public can create price alerts"
  on public.price_alerts
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public can update price alerts" on public.price_alerts;
create policy "Public can update price alerts"
  on public.price_alerts
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Public can browse leaderboards" on public.leaderboard_entries;
create policy "Public can browse leaderboards"
  on public.leaderboard_entries
  for select
  to anon, authenticated
  using (true);

create index if not exists market_prices_category_idx on public.market_prices (category);
create index if not exists market_prices_updated_at_idx on public.market_prices (updated_at desc);
create index if not exists price_alerts_status_idx on public.price_alerts (status);
