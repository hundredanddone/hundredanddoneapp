-- Take the RLS helper functions off the public API surface.
--
-- The helpers in 0001 live in `public`, so PostgREST publishes every one of them as an
-- RPC. Verified against the live project: `POST /rest/v1/rpc/is_org_member` answered for
-- an anonymous caller. Two problems follow:
--
--   1. They are internal plumbing for policy expressions and do not belong on the API.
--   2. `org_treats_patient(org, patient)` is SECURITY DEFINER and answers a question
--      about other people's data — whether a given patient has ever had an appointment
--      with a given organization. The caller was never constrained, so anyone who could
--      guess or harvest two UUIDs could probe patient/provider relationships.
--
-- Policy expressions are evaluated as the invoking role, so `authenticated` must keep
-- EXECUTE. `anon` never needs it: every policy in 0001 is `to authenticated`, and
-- `discover_organizations` is SECURITY DEFINER, so its internal `haversine_km` call runs
-- as the function owner rather than as the caller.

-- 1. Constrain org_treats_patient to organizations the caller actually belongs to.
--    The two policies that use it already AND `is_org_member(organization_id)`, so this
--    leaves their behaviour identical while closing the direct-RPC probe.
create or replace function public.org_treats_patient(p_organization_id uuid, p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.appointments a
    where a.organization_id = p_organization_id
      and a.patient_id = p_patient_id
      and exists (
        select 1
        from public.org_members m
        where m.organization_id = p_organization_id
          and m.profile_id = auth.uid()
      )
  );
$$;

-- 2. Revoke the implicit PUBLIC grant, then hand EXECUTE back to the roles that need it.
revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.owns_organization(uuid) from public, anon;
revoke all on function public.org_treats_patient(uuid, uuid) from public, anon;
revoke all on function public.patient_of_my_orgs(uuid) from public, anon;
revoke all on function public.address_visible_to_me(uuid) from public, anon;
revoke all on function public.org_is_discoverable(uuid) from public, anon;
revoke all on function public.haversine_km(
  double precision, double precision, double precision, double precision
) from public, anon;

grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.owns_organization(uuid) to authenticated, service_role;
grant execute on function public.org_treats_patient(uuid, uuid) to authenticated, service_role;
grant execute on function public.patient_of_my_orgs(uuid) to authenticated, service_role;
grant execute on function public.address_visible_to_me(uuid) to authenticated, service_role;
grant execute on function public.org_is_discoverable(uuid) to authenticated, service_role;
grant execute on function public.haversine_km(
  double precision, double precision, double precision, double precision
) to authenticated, service_role;

-- discover_organizations stays anon-callable on purpose: it is the deliberate,
-- discovery-safe public surface and returns a fixed column list.
