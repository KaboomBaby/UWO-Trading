alter table public.listings
  alter column id drop default,
  alter column id type text using id::text,
  alter column id set default replace(gen_random_uuid()::text, '-', '');
