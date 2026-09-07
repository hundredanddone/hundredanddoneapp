-- Let specific organizations bypass the distance filter.
--
-- `discover_organizations` is distance-gated: a clinic provider is only returned when
-- its nearest branch falls inside the patient's radius. That is correct for real
-- providers — nobody wants a clinic 4,000 km away — but it makes seeded demo data
-- unusable, because a tester in another city sees an empty list and cannot tell an
-- empty database from a working filter.
--
-- This flag opts a row out of the distance check for both visit types. It is a testing
-- affordance: keep it false for real providers, and audit it before going live with
--   select name from organizations where always_discoverable;

alter table public.organizations
  add column if not exists always_discoverable boolean not null default false;

comment on column public.organizations.always_discoverable is
  'Testing only: bypasses the distance filter in discover_organizations so the row is '
  'visible from any location. Must be false for real providers.';

create index if not exists organizations_always_discoverable_idx
  on public.organizations (always_discoverable)
  where always_discoverable;

-- Rebuild the RPC so the flag short-circuits the distance test. Everything else —
-- the verified check, the offering check and the availability check — still applies,
-- so a flagged row that is misconfigured stays correctly invisible.
create or replace function public.discover_organizations(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 10,
  p_visit_type text default 'clinic',
  p_search text default null
)
returns table (
  organization_id uuid,
  name text,
  org_type text,
  specialty text,
  logo_url text,
  branch_id uuid,
  address text,
  lat double precision,
  lng double precision,
  distance_km double precision,
  avg_rating numeric,
  review_count bigint,
  supports_clinic boolean,
  supports_home boolean,
  min_price numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with nearest_branch as (
    select distinct on (b.organization_id)
      b.organization_id,
      b.id as branch_id,
      b.address,
      b.lat,
      b.lng,
      public.haversine_km(p_lat, p_lng, b.lat, b.lng) as distance_km
    from public.org_branches b
    where b.lat is not null and b.lng is not null
    order by b.organization_id, public.haversine_km(p_lat, p_lng, b.lat, b.lng)
  ),
  offering_summary as (
    select
      s.organization_id,
      bool_or(so.visit_type = 'clinic' and so.is_active) as has_clinic_offering,
      bool_or(so.visit_type = 'home' and so.is_active) as has_home_offering,
      min(so.price) filter (where so.is_active) as min_price
    from public.services s
    join public.service_offerings so on so.service_id = s.id
    group by s.organization_id
  ),
  rating_summary as (
    select r.organization_id, avg(r.rating)::numeric(3, 2) as avg_rating, count(*) as review_count
    from public.reviews r
    group by r.organization_id
  )
  select
    o.id, o.name, o.org_type, o.specialty, o.logo_url,
    nb.branch_id, nb.address, nb.lat, nb.lng, nb.distance_km,
    rs.avg_rating,
    coalesce(rs.review_count, 0) as review_count,
    coalesce(os.has_clinic_offering, false) as supports_clinic,
    coalesce(os.has_home_offering, false) as supports_home,
    os.min_price
  from public.organizations o
  join nearest_branch nb on nb.organization_id = o.id
  left join offering_summary os on os.organization_id = o.id
  left join rating_summary rs on rs.organization_id = o.id
  where o.verification_status = 'verified'
    and (
      p_search is null
      or o.name ilike '%' || p_search || '%'
      or coalesce(o.specialty, '') ilike '%' || p_search || '%'
    )
    and case
      when p_visit_type = 'home' then
        coalesce(os.has_home_offering, false)
        and (
          o.always_discoverable
          or exists (
            select 1
            from public.home_visit_service_areas a
            where a.organization_id = o.id
              and public.haversine_km(p_lat, p_lng, a.center_lat, a.center_lng) <= a.radius_km
          )
        )
      else
        coalesce(os.has_clinic_offering, false)
        and (o.always_discoverable or nb.distance_km <= p_radius_km)
    end
    and exists (
      select 1
      from public.availability_rules ar
      where ar.organization_id = o.id
        and ar.visit_type = p_visit_type
    )
  order by nb.distance_km asc nulls last
  limit 100;
$$;

grant execute on function public.discover_organizations(
  double precision, double precision, double precision, text, text
) to authenticated, anon;
