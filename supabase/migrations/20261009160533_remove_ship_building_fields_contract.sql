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
