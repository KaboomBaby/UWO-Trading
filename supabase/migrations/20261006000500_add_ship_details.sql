alter table public.listings
  add column if not exists ship_details jsonb;

update public.listings
set image_url = null
where image_url is not null;

drop policy if exists "Public can post listings" on public.listings;
drop policy if exists "Public can read listing images"
  on storage.objects;
drop policy if exists "Anon can upload listing images"
  on storage.objects;

create or replace function public.ship_details_is_valid(details jsonb)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with chosen_skills as (
    select details -> 'originalSkill' as skill
    union all
    select value as skill
    from jsonb_array_elements(details -> 'optionalSkills')
  )
  select
    details is not null
    and jsonb_typeof(details) = 'object'
    and details ->> 'type' in ('battle', 'trade', 'adventure')
    and details ->> 'shipClass' in ('light', 'standard', 'heavy')
    and jsonb_typeof(details -> 'grade') = 'number'
    and (details -> 'grade')::numeric >= 0
    and btrim(coalesce(details ->> 'role', '')) <> ''
    and jsonb_typeof(details -> 'performance') = 'object'
    and (
      select count(*)
      from jsonb_object_keys(details -> 'performance')
    ) = 6
    and jsonb_typeof(details -> 'performance' -> 'verticalSail') = 'number'
    and (details -> 'performance' -> 'verticalSail')::numeric >= 0
    and jsonb_typeof(details -> 'performance' -> 'horizontalSail') = 'number'
    and (details -> 'performance' -> 'horizontalSail')::numeric >= 0
    and jsonb_typeof(details -> 'performance' -> 'rowPower') = 'number'
    and (details -> 'performance' -> 'rowPower')::numeric >= 0
    and jsonb_typeof(details -> 'performance' -> 'turnSpeed') = 'number'
    and (details -> 'performance' -> 'turnSpeed')::numeric >= 0
    and jsonb_typeof(details -> 'performance' -> 'waveResistance') = 'number'
    and (details -> 'performance' -> 'waveResistance')::numeric >= 0
    and jsonb_typeof(details -> 'performance' -> 'armour') = 'number'
    and (details -> 'performance' -> 'armour')::numeric >= 0
    and jsonb_typeof(details -> 'improvements') = 'number'
    and (details -> 'improvements')::numeric >= 0
    and (details -> 'improvements')::numeric = floor((details -> 'improvements')::numeric)
    and jsonb_typeof(details -> 'durability') = 'number'
    and (details -> 'durability')::numeric >= 0
    and jsonb_typeof(details -> 'hold') = 'object'
    and (
      select count(*)
      from jsonb_object_keys(details -> 'hold')
    ) = 4
    and jsonb_typeof(details -> 'hold' -> 'crew') = 'number'
    and (details -> 'hold' -> 'crew')::numeric >= 0
    and jsonb_typeof(details -> 'hold' -> 'cannons') = 'number'
    and (details -> 'hold' -> 'cannons')::numeric >= 0
    and jsonb_typeof(details -> 'hold' -> 'cargo') = 'number'
    and (details -> 'hold' -> 'cargo')::numeric >= 0
    and jsonb_typeof(details -> 'hold' -> 'sailorsRequired') = 'number'
    and (details -> 'hold' -> 'sailorsRequired')::numeric >= 0
    and jsonb_typeof(details -> 'sailingRequirements') = 'object'
    and (
      select count(*)
      from jsonb_object_keys(details -> 'sailingRequirements')
    ) = 3
    and jsonb_typeof(
      details -> 'sailingRequirements' -> 'adventureLevel'
    ) = 'number'
    and (
      details -> 'sailingRequirements' -> 'adventureLevel'
    )::numeric >= 0
    and jsonb_typeof(details -> 'sailingRequirements' -> 'tradeLevel') = 'number'
    and (details -> 'sailingRequirements' -> 'tradeLevel')::numeric >= 0
    and jsonb_typeof(details -> 'sailingRequirements' -> 'battleLevel') = 'number'
    and (details -> 'sailingRequirements' -> 'battleLevel')::numeric >= 0
    and jsonb_typeof(details -> 'buildingDays') = 'number'
    and (details -> 'buildingDays')::numeric >= 0
    and btrim(coalesce(details ->> 'requiredHull', '')) <> ''
    and (
      details -> 'originalSkill' is null
      or (
        jsonb_typeof(details -> 'originalSkill') = 'object'
        and btrim(coalesce(details -> 'originalSkill' ->> 'name', '')) <> ''
        and btrim(coalesce(details -> 'originalSkill' ->> 'iconId', '')) <> ''
      )
    )
    and jsonb_typeof(details -> 'optionalSkills') = 'array'
    and jsonb_array_length(details -> 'optionalSkills') <= 5
    and not exists (
      select 1
      from jsonb_array_elements(details -> 'optionalSkills') as skill
      where
        jsonb_typeof(skill) <> 'object'
        or btrim(coalesce(skill ->> 'name', '')) = ''
        or btrim(coalesce(skill ->> 'iconId', '')) = ''
    )
    and not exists (
      select 1
      from chosen_skills
      where skill is not null
      group by skill ->> 'iconId'
      having count(*) > 1
    )
  $$;

alter table public.listings
  drop constraint if exists listings_ship_details_shape_check;

alter table public.listings
  add constraint listings_ship_details_shape_check
  check (
    (
      category <> 'ships'
      and ship_details is null
    )
    or (
      category = 'ships'
      and (
        ship_details is null
        or public.ship_details_is_valid(ship_details)
      )
    )
  );

revoke all on function public.ship_details_is_valid(jsonb)
  from public, anon, authenticated;

drop function public.create_listing(
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
  text
);

drop function public.update_listing(
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
  text
);

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
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  inserted_listing public.listings;
begin
  if edit_code is null or char_length(edit_code) < 20 then
    raise exception 'A secure listing edit code is required.';
  end if;
  if title is null or char_length(btrim(title)) < 3 then
    raise exception 'Title must be at least 3 characters.';
  end if;
  if category not in ('ships', 'property', 'equipment', 'resources', 'services') then
    raise exception 'Invalid listing category.';
  end if;
  if currency not in ('ducats', 'UWC', 'CT', 'trade', 'negotiable') then
    raise exception 'Invalid listing currency.';
  end if;
  if not (
    (currency in ('ducats', 'UWC', 'CT') and price is not null and price > 0)
    or (currency in ('trade', 'negotiable') and price is null)
  ) then
    raise exception 'Listing price and currency do not match.';
  end if;
  if currency = 'CT' and price != floor(price) then
    raise exception 'Captain Tickets must be a whole number.';
  end if;
  if description is null or char_length(btrim(description)) < 10 then
    raise exception 'Description must be at least 10 characters.';
  end if;
  if seller is null or btrim(seller) = '' then
    raise exception 'Seller is required.';
  end if;
  if location is null or btrim(location) = '' then
    raise exception 'Location is required.';
  end if;
  if server_name is null or btrim(server_name) = '' then
    raise exception 'Server is required.';
  end if;
  if category = 'ships' and not public.ship_details_is_valid(ship_details) then
    raise exception 'Valid ship details are required for a Ships listing.';
  end if;
  if category <> 'ships' and ship_details is not null then
    raise exception 'Ship details are only allowed for Ships listings.';
  end if;

  insert into public.listings (
    title,
    category,
    currency,
    price,
    description,
    seller,
    location,
    server,
    contact_note,
    image_url,
    image_emoji,
    ship_details,
    collection,
    expires_at
  ) values (
    btrim(title),
    category,
    currency,
    price,
    btrim(description),
    btrim(seller),
    btrim(location),
    btrim(server_name),
    contact_note,
    null,
    coalesce(image_emoji, '📦'),
    case when category = 'ships' then ship_details else null end,
    coalesce(collection, 'current'),
    now() + interval '14 days'
  )
  returning *
  into inserted_listing;

  insert into public.listing_edit_codes (listing_id, edit_code_hash)
  values (
    inserted_listing.id,
    encode(extensions.digest(edit_code, 'sha256'), 'hex')
  );

  return jsonb_build_object(
    'listing',
    to_jsonb(inserted_listing),
    'edit_code',
    edit_code
  );
end;
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
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  updated_listing public.listings;
begin
  if title is null or char_length(btrim(title)) < 3 then
    raise exception 'Title must be at least 3 characters.';
  end if;
  if category not in ('ships', 'property', 'equipment', 'resources', 'services') then
    raise exception 'Invalid listing category.';
  end if;
  if currency not in ('ducats', 'UWC', 'CT', 'trade', 'negotiable') then
    raise exception 'Invalid listing currency.';
  end if;
  if not (
    (currency in ('ducats', 'UWC', 'CT') and price is not null and price > 0)
    or (currency in ('trade', 'negotiable') and price is null)
  ) then
    raise exception 'Listing price and currency do not match.';
  end if;
  if currency = 'CT' and price != floor(price) then
    raise exception 'Captain Tickets must be a whole number.';
  end if;
  if description is null or char_length(btrim(description)) < 10 then
    raise exception 'Description must be at least 10 characters.';
  end if;
  if seller is null or btrim(seller) = '' then
    raise exception 'Seller is required.';
  end if;
  if location is null or btrim(location) = '' then
    raise exception 'Location is required.';
  end if;
  if server_name is null or btrim(server_name) = '' then
    raise exception 'Server is required.';
  end if;
  if category = 'ships' and not public.ship_details_is_valid(ship_details) then
    raise exception 'Valid ship details are required for a Ships listing.';
  end if;
  if category <> 'ships' and ship_details is not null then
    raise exception 'Ship details are only allowed for Ships listings.';
  end if;

  update public.listings listings
  set
    title = update_listing.title,
    category = update_listing.category,
    currency = update_listing.currency,
    price = update_listing.price,
    description = update_listing.description,
    seller = update_listing.seller,
    location = update_listing.location,
    server = update_listing.server_name,
    contact_note = update_listing.contact_note,
    image_url = null,
    image_emoji = coalesce(update_listing.image_emoji, '📦'),
    ship_details = case
      when update_listing.category = 'ships' then update_listing.ship_details
      else null
    end,
    collection = coalesce(update_listing.collection, 'current')
  from public.listing_edit_codes codes
  where codes.listing_id = listings.id
    and codes.edit_code_hash = encode(extensions.digest(update_listing.edit_code, 'sha256'), 'hex')
  returning listings.*
  into updated_listing;

  if updated_listing.id is null then
    raise exception 'Listing edit code not found.';
  end if;

  update public.listing_edit_codes
  set updated_at = now()
  where listing_id = updated_listing.id;

  return updated_listing;
end;
$$;

revoke all on function public.create_listing
  from public, anon, authenticated;
revoke all on function public.update_listing
  from public, anon, authenticated;

grant execute on function public.create_listing
  to anon, authenticated;
grant execute on function public.update_listing
  to anon, authenticated;
