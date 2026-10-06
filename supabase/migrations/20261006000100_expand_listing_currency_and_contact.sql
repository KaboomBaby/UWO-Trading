alter table public.listings
  alter column price drop not null,
  alter column currency set default 'ducats',
  add column if not exists server text not null default 'Maris',
  add column if not exists contact_note text not null default '';

alter table public.listings
  drop constraint if exists listings_currency_check;

update public.listings
set currency = 'ducats'
where currency = 'gold';

alter table public.listings
  add constraint listings_currency_check
  check (
    currency in ('ducats', 'UWC', 'CT', 'trade', 'negotiable')
  );

alter table public.listings
  drop constraint if exists listings_price_check;

alter table public.listings
  add constraint listings_price_currency_check
  check (
    (
      currency in ('ducats', 'UWC', 'CT')
      and price is not null
      and price > 0
    )
    or (
      currency in ('trade', 'negotiable')
      and price is null
    )
  );
