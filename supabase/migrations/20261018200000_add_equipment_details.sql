-- Fix Mission 5 Phase 2: equipment details.
-- Equipment listings may carry an optional equipment_details object with
-- the game's tooltip stats (all fields optional; blanks stored absent).
-- Mirrors the ship_details plumbing exactly: a jsonb column, a public
-- validator in the same spirit, category gates in the three private
-- listing functions, and public wrappers re-created with the new
-- parameter (old signatures dropped). Existing rows are untouched.

alter table public.listings
  add column if not exists equipment_details jsonb;

create or replace function public.equipment_details_is_valid(details jsonb)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select
    details is not null
    and jsonb_typeof(details) = 'object'
    and (
      details ->> 'wearer' is null
      or details ->> 'wearer' in ('male', 'female', 'unisex')
    )
    and (details -> 'durabilityCurrent' is null or (jsonb_typeof(details -> 'durabilityCurrent') = 'number' and (details -> 'durabilityCurrent')::numeric >= 0 and (details -> 'durabilityCurrent')::numeric = floor((details -> 'durabilityCurrent')::numeric)))
    and (details -> 'durabilityMax' is null or (jsonb_typeof(details -> 'durabilityMax') = 'number' and (details -> 'durabilityMax')::numeric >= 0 and (details -> 'durabilityMax')::numeric = floor((details -> 'durabilityMax')::numeric)))
    and (details -> 'formality' is null or (jsonb_typeof(details -> 'formality') = 'number' and (details -> 'formality')::numeric >= 0 and (details -> 'formality')::numeric = floor((details -> 'formality')::numeric)))
    and (details -> 'disguiseLevel' is null or (jsonb_typeof(details -> 'disguiseLevel') = 'number' and (details -> 'disguiseLevel')::numeric >= 0 and (details -> 'disguiseLevel')::numeric = floor((details -> 'disguiseLevel')::numeric)))
    and (details -> 'attackPower' is null or (jsonb_typeof(details -> 'attackPower') = 'number' and (details -> 'attackPower')::numeric >= 0 and (details -> 'attackPower')::numeric = floor((details -> 'attackPower')::numeric)))
    and (details -> 'defencePower' is null or (jsonb_typeof(details -> 'defencePower') = 'number' and (details -> 'defencePower')::numeric >= 0 and (details -> 'defencePower')::numeric = floor((details -> 'defencePower')::numeric)))
    and (
      details -> 'weaponCategory' is null
      or (
        jsonb_typeof(details -> 'weaponCategory') = 'string'
        and btrim(details ->> 'weaponCategory') <> ''
        and char_length(details ->> 'weaponCategory') <= 60
      )
    )
    and (
      details -> 'skillBonuses' is null
      or (
        jsonb_typeof(details -> 'skillBonuses') = 'array'
        and jsonb_array_length(details -> 'skillBonuses') <= 3
        and not exists (
          select 1
          from jsonb_array_elements(details -> 'skillBonuses') as bonus
          where
            jsonb_typeof(bonus) <> 'object'
            or btrim(coalesce(bonus ->> 'name', '')) = ''
            or btrim(coalesce(bonus ->> 'iconId', '')) = ''
            or bonus -> 'value' is null
            or jsonb_typeof(bonus -> 'value') <> 'number'
            or (bonus -> 'value')::numeric < 1
            or (bonus -> 'value')::numeric <> floor((bonus -> 'value')::numeric)
        )
        and not exists (
          select 1
          from jsonb_array_elements(details -> 'skillBonuses') as bonus
          group by bonus ->> 'iconId'
          having count(*) > 1
        )
      )
    )
    and (
      details -> 'effects' is null
      or (
        jsonb_typeof(details -> 'effects') = 'array'
        and jsonb_array_length(details -> 'effects') <= 3
        and not exists (
          select 1
          from jsonb_array_elements(details -> 'effects') as effect
          where
            jsonb_typeof(effect) <> 'object'
            or btrim(coalesce(effect ->> 'name', '')) = ''
            or (
              effect -> 'rank' is not null
              and (
                jsonb_typeof(effect -> 'rank') <> 'number'
                or (effect -> 'rank')::numeric < 1
                or (effect -> 'rank')::numeric <> floor((effect -> 'rank')::numeric)
              )
            )
        )
      )
    )
    and (
      details -> 'extraLines' is null
      or (
        jsonb_typeof(details -> 'extraLines') = 'array'
        and jsonb_array_length(details -> 'extraLines') <= 5
        and not exists (
          select 1
          from jsonb_array_elements(details -> 'extraLines') as line
          where
            jsonb_typeof(line) <> 'object'
            or btrim(coalesce(line ->> 'label', '')) = ''
            or (
              line -> 'value' is not null
              and (
                jsonb_typeof(line -> 'value') <> 'number'
                or (line -> 'value')::numeric < 0
                or (line -> 'value')::numeric <> floor((line -> 'value')::numeric)
              )
            )
        )
      )
    )
$$;

grant execute on function public.equipment_details_is_valid(jsonb)
  to authenticated;

drop function if exists private.create_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, jsonb, text
);
drop function if exists private.update_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, jsonb, text
);
drop function if exists private.create_owned_listing(
  text, text, text, double precision, text, text, text, text, text, text, jsonb, text
);

create or replace function private.create_listing(
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
  equipment_details jsonb default null,
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
  if category not in ('ships', 'equipment', 'resources', 'services') then
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

  if category <> 'equipment' and equipment_details is not null then
    raise exception 'Equipment details are only allowed for Equipment listings.';
  end if;
  if category = 'equipment' and equipment_details is not null
    and not public.equipment_details_is_valid(equipment_details) then
    raise exception 'Invalid equipment details for an Equipment listing.';
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
    equipment_details,
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
    case when category = 'equipment' then equipment_details else null end,
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

create or replace function private.update_listing(
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
  equipment_details jsonb default null,
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
  if category not in ('ships', 'equipment', 'resources', 'services') then
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

  if category <> 'equipment' and equipment_details is not null then
    raise exception 'Equipment details are only allowed for Equipment listings.';
  end if;
  if category = 'equipment' and equipment_details is not null
    and not public.equipment_details_is_valid(equipment_details) then
    raise exception 'Invalid equipment details for an Equipment listing.';
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
    equipment_details = case
      when update_listing.category = 'equipment' then update_listing.equipment_details
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

create or replace function private.create_owned_listing(
  title text,
  category text,
  currency text,
  price double precision,
  description text,
  seller text,
  location text,
  server_name text,
  contact_note text,
  image_emoji text default '📦',
  ship_details jsonb default null,
  equipment_details jsonb default null,
  collection text default 'current'
) returns public.listings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  listing_owner uuid := auth.uid();
  inserted_listing public.listings;
begin
  if listing_owner is null then
    raise exception 'Sign in to post a listing.';
  end if;
  if title is null or char_length(btrim(title)) < 3 then
    raise exception 'Title must be at least 3 characters.';
  end if;
  if category not in ('ships', 'equipment', 'resources', 'services') then
    raise exception 'Invalid listing category.';
  end if;
  if currency not in ('ducats', 'UWC', 'CT', 'trade', 'negotiable') then
    raise exception 'Invalid listing currency.';
  end if;
  if not (
    (
      currency in ('ducats', 'UWC', 'CT')
      and price is not null
      and price > 0
    )
    or (currency in ('trade', 'negotiable') and price is null)
  ) then
    raise exception 'Listing price and currency do not match.';
  end if;
  if currency = 'CT' and price != floor(price) then
    raise exception 'Captain Tickets must be a whole number.';
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

  if category <> 'equipment' and equipment_details is not null then
    raise exception 'Equipment details are only allowed for Equipment listings.';
  end if;
  if category = 'equipment' and equipment_details is not null
    and not public.equipment_details_is_valid(equipment_details) then
    raise exception 'Invalid equipment details for an Equipment listing.';
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
    equipment_details,
    collection,
    expires_at,
    owner_id
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
    case when category = 'equipment' then equipment_details else null end,
    coalesce(collection, 'current'),
    now() + interval '14 days',
    listing_owner
  )
  returning *
  into inserted_listing;

  return inserted_listing;
end;
$$;

drop function if exists public.create_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, jsonb, text
);
drop function if exists public.update_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, jsonb, text
);
drop function if exists public.create_owned_listing(
  text, text, text, double precision, text, text, text, text, text, text, jsonb, text
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
  equipment_details jsonb default null,
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
    equipment_details,
    collection
  );
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
  equipment_details jsonb default null,
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
    equipment_details,
    collection
  );
$$;

create or replace function public.create_owned_listing(
  title text,
  category text,
  currency text,
  price double precision,
  description text,
  seller text,
  location text,
  server_name text,
  contact_note text,
  image_emoji text default '📦',
  ship_details jsonb default null,
  equipment_details jsonb default null,
  collection text default 'current'
) returns public.listings
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  select private.create_owned_listing(
    title,
    category,
    currency,
    price,
    description,
    seller,
    location,
    server_name,
    contact_note,
    image_emoji,
    ship_details,
    equipment_details,
    collection
  )
$$;

revoke all on function private.create_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, jsonb, jsonb, text
) from public;
revoke all on function private.update_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, jsonb, jsonb, text
) from public;
revoke all on function private.create_owned_listing(
  text, text, text, double precision, text, text, text, text, text, text, jsonb, jsonb, text
) from public;
revoke all on function public.create_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, jsonb, jsonb, text
) from public;
revoke all on function public.update_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, jsonb, jsonb, text
) from public;
revoke all on function public.create_owned_listing(
  text, text, text, double precision, text, text, text, text, text, text, jsonb, jsonb, text
)
  from public, anon;

grant execute on function public.create_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, jsonb, jsonb, text
) to anon, authenticated;
grant execute on function public.update_listing(
  text, text, text, text, double precision, text, text, text, text, text, text, text, jsonb, jsonb, text
) to anon, authenticated;
grant execute on function public.create_owned_listing(
  text, text, text, double precision, text, text, text, text, text, text, jsonb, jsonb, text
)
  to authenticated;
