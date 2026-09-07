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
