-- Admin helpers for 100 and Done.
--
-- There is no admin UI yet (see "Known gaps" in the README), so approving an
-- organization is a manual step. Run these in the Supabase Dashboard SQL Editor,
-- which connects as `postgres` and therefore bypasses RLS.

-- ---------------------------------------------------------------------------
-- 1. Why is my organization not showing up in patient discovery?
--
-- `discover_organizations` applies four independent gates. An org missing ANY of
-- them is invisible, and the app has no way to tell you which one. This shows all
-- four at once: every count below must be > 0 for the visit type you are testing.
-- ---------------------------------------------------------------------------

select
  o.id,
  o.name,
  o.org_type,
  o.verification_status,                      -- gate 1: must be 'verified'
  o.onboarding_step,                          -- null means the wizard finished
  (select count(*) from public.org_branches b
     where b.organization_id = o.id
       and b.lat is not null and b.lng is not null)
    as branches_with_coords,                  -- gate 2: needs a pin
  (select count(*) from public.services s
     join public.service_offerings so on so.service_id = s.id
     where s.organization_id = o.id and so.is_active and so.visit_type = 'clinic')
    as clinic_offerings,                      -- gate 3 (clinic)
  (select count(*) from public.availability_rules ar
     where ar.organization_id = o.id and ar.visit_type = 'clinic')
    as clinic_hours,                          -- gate 4 (clinic)
  (select count(*) from public.services s
     join public.service_offerings so on so.service_id = s.id
     where s.organization_id = o.id and so.is_active and so.visit_type = 'home')
    as home_offerings,                        -- gate 3 (home)
  (select count(*) from public.availability_rules ar
     where ar.organization_id = o.id and ar.visit_type = 'home')
    as home_hours,                            -- gate 4 (home)
  (select count(*) from public.home_visit_service_areas a
     where a.organization_id = o.id)
    as home_service_areas                     -- home visits also need a service area
from public.organizations o
order by o.created_at desc;

-- ---------------------------------------------------------------------------
-- 2. Approve an organization (the "admin needs to approve" step)
-- ---------------------------------------------------------------------------

-- Approve every org still waiting. Fine while testing; be more specific in production.
update public.organizations
   set verification_status = 'verified'
 where verification_status = 'pending';

-- Or approve exactly one:
-- update public.organizations set verification_status = 'verified'
--  where id = 'PASTE-ORG-UUID';

-- ---------------------------------------------------------------------------
-- 3. Test discovery without using the app
--
-- Runs the same RPC the patient app calls, centred on the org's own map pin, so a
-- non-empty result means the org is genuinely discoverable to a patient standing
-- there. Empty means one of the four gates above is still failing.
-- ---------------------------------------------------------------------------

select b.name as searched_from, d.*
  from public.org_branches b
 cross join lateral
       public.discover_organizations(b.lat, b.lng, 50, 'clinic', null) d
 where b.lat is not null
 order by d.distance_km;

-- ---------------------------------------------------------------------------
-- 4. Fix a branch pin that disagrees with its address
--
-- Discovery matches on org_branches.lat/lng and never reads the address text, so a
-- pin in the wrong place makes a provider invisible while the address still looks
-- correct. Before the AddressMapPicker fix, moving the pin left an already-filled
-- address untouched, which let the two diverge silently.
--
-- Sanity-check every pin. Anything far from where you expect is the problem.
-- ---------------------------------------------------------------------------

select
  b.id as branch_id,
  o.name,
  b.address,
  b.lat,
  b.lng
from public.org_branches b
join public.organizations o on o.id = b.organization_id
order by o.created_at desc;

-- Move a pin (example: Ulhasnagar, Maharashtra):
-- update public.org_branches
--    set lat = 19.2215, lng = 73.1645
--  where id = 'PASTE-BRANCH-UUID';

-- Home-visit providers keep their service area centre separately -- move it too:
-- update public.home_visit_service_areas
--    set center_lat = 19.2215, center_lng = 73.1645
--  where organization_id = 'PASTE-ORG-UUID';

-- ---------------------------------------------------------------------------
-- 5. De-duplicate demo providers
--
-- Running seed-demo.sql twice creates two of everything, because it has no
-- uniqueness constraint on name. This keeps the oldest row per name and deletes the
-- rest, cascading to their branches, services, offerings, availability and any
-- appointments booked against the duplicates.
-- ---------------------------------------------------------------------------

-- Count first:
select name, count(*)
  from public.organizations
 where bio like '%[demo data]%'
 group by name
 having count(*) > 1
 order by name;

-- Then remove the extras:
-- delete from public.organizations o
--  where o.bio like '%[demo data]%'
--    and o.id not in (
--      select distinct on (name) id
--        from public.organizations
--       where bio like '%[demo data]%'
--       order by name, created_at
--    );

-- Or start clean and re-run seed-demo.sql exactly once:
-- delete from public.organizations where bio like '%[demo data]%';

-- Audit which providers bypass the distance filter (must be empty in production):
select id, name, verification_status
  from public.organizations
 where always_discoverable;
