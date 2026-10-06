alter table public.listings
  add column if not exists image_url text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'listing-images',
  'listing-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

drop policy if exists "Public can read listing images"
  on storage.objects;
create policy "Public can read listing images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'listing-images');

drop policy if exists "Anon can upload listing images"
  on storage.objects;
create policy "Anon can upload listing images"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'listing-images'
    and (metadata ->> 'mimetype') in ('image/png', 'image/jpeg', 'image/webp')
  );
