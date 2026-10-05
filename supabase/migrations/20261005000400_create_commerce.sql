create table if not exists public.wishlist_items (
  id text primary key,
  item_name text not null,
  category text not null,
  target_price double precision not null,
  note text not null default '',
  image_emoji text not null,
  constraint wishlist_items_target_price_check check (target_price >= 0)
);

create table if not exists public.watchlist_items (
  id text primary key,
  item_name text not null,
  port text not null,
  current_price double precision not null,
  change_percent double precision not null,
  note text not null default '',
  constraint watchlist_items_current_price_check check (current_price >= 0)
);

create table if not exists public.guild_storefronts (
  id text primary key,
  guild_name text not null,
  motto text not null,
  home_port text not null,
  specialties text[] not null default '{}',
  rating double precision not null,
  completed_orders integer not null,
  image_emoji text not null,
  constraint guild_storefronts_rating_check check (
    rating >= 0 and rating <= 5
  ),
  constraint guild_storefronts_completed_orders_check check (
    completed_orders >= 0
  )
);

create table if not exists public.shop_items (
  id text primary key,
  name text not null,
  category text not null,
  price double precision not null,
  stock integer not null,
  seller text not null,
  description text not null,
  image_emoji text not null,
  constraint shop_items_category_check check (
    category in ('ships', 'equipment', 'supplies', 'property')
  ),
  constraint shop_items_price_check check (price >= 0),
  constraint shop_items_stock_check check (stock >= 0)
);

alter table public.wishlist_items enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.guild_storefronts enable row level security;
alter table public.shop_items enable row level security;

drop policy if exists "Public can browse wishlists" on public.wishlist_items;
create policy "Public can browse wishlists"
  on public.wishlist_items
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can browse watchlists" on public.watchlist_items;
create policy "Public can browse watchlists"
  on public.watchlist_items
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can browse guild storefronts" on public.guild_storefronts;
create policy "Public can browse guild storefronts"
  on public.guild_storefronts
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can browse shop items" on public.shop_items;
create policy "Public can browse shop items"
  on public.shop_items
  for select
  to anon, authenticated
  using (true);

create index if not exists guild_storefronts_guild_name_idx on public.guild_storefronts (guild_name);
create index if not exists shop_items_category_idx on public.shop_items (category);
