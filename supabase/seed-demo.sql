-- Demo providers for 100 and Done.
--
-- Run in the Supabase Dashboard SQL Editor (connects as `postgres`, bypasses RLS).
--
-- Discovery is distance-based: `discover_organizations` keeps a provider only when its
-- nearest branch is within the patient's radius. So "works anywhere" means "clustered
-- around wherever you are testing from" — change v_base_lat / v_base_lng below and
-- re-run, and the whole set moves with you.
--
-- Home-visit providers get a deliberately enormous service area, so home-visit search
-- matches from anywhere on earth regardless of the base point.
--
-- Every row is tagged '[demo data]' in `bio`; the cleanup at the bottom removes them all.

do $$
declare
  -- ==== CHANGE THESE TWO TO MOVE THE WHOLE DEMO SET ====
  v_base_lat double precision := 19.2215;   -- Ulhasnagar, Maharashtra
  v_base_lng double precision := 73.1645;
  -- =====================================================
  -- Leave null to auto-pick your existing org account. Set an email to choose
  -- explicitly. This account can sign in and manage every demo provider via the
  -- "Switch organization" list on the org Profile tab.
  v_manager_email text := null;
  v_owner uuid;
  v_org uuid;
  v_branch uuid;
  v_service uuid;
  v_day int;
  r record;
begin
  -- Demo orgs need an owner that already exists, because organizations.owner_profile_id
  -- references profiles -> auth.users. We reuse the oldest real profile rather than
  -- forging auth.users rows, which is version-fragile and can break sign-in.
  -- Prefer an explicit email, else the first profile that onboarded as an org, else
  -- any profile. organizations.owner_profile_id references profiles -> auth.users, so
  -- the owner must already exist; forging auth.users rows is version-fragile and can
  -- break sign-in, so we always reuse a real account.
  if v_manager_email is not null then
    select id into v_owner from public.profiles where lower(email) = lower(v_manager_email);
    if v_owner is null then
      raise exception 'No profile found for %. Sign in with it once first.', v_manager_email;
    end if;
  else
    select id into v_owner from public.profiles where role = 'org' order by created_at limit 1;
  end if;

  if v_owner is null then
    select id into v_owner from public.profiles order by created_at limit 1;
  end if;

  if v_owner is null then
    raise exception 'No profiles exist yet. Sign in with at least one account first.';
  end if;

  for r in
    select * from (values
      -- name,                        org_type,             specialty,           dlat,    dlng,   clinic, home, price, duration
      ('Dr. Asha Menon',              'independent_doctor', 'General Physician',  0.004,   0.003,  true,   true,   400,  15),
      ('Dr. Rohan Iyer',              'independent_doctor', 'Cardiology',        -0.010,   0.008,  true,   false,  900,  30),
      ('Dr. Meera Kulkarni',          'independent_doctor', 'Paediatrics',        0.013,  -0.006,  true,   true,   500,  20),
      ('Dr. Sameer Deshpande',        'independent_doctor', 'Dermatology',       -0.018,  -0.011,  true,   false,  700,  20),
      ('Sunrise Family Clinic',       'clinic',             null,                 0.021,   0.015,  true,   true,   350,  15),
      ('Greenleaf Polyclinic',        'clinic',             null,                -0.026,   0.019,  true,   false,  300,  15),
      ('Harmony Care Clinic',         'clinic',             null,                 0.031,  -0.023,  true,   true,   450,  20),
      ('Lifeline Multispeciality',    'hospital',           null,                -0.037,   0.028,  true,   true,   800,  30),
      ('Akshara General Hospital',    'hospital',           null,                 0.042,   0.034,  true,   false,  650,  30),
      ('Riverside Medical Centre',    'hospital',           null,                -0.048,  -0.039,  true,   true,   750,  30)
    ) as t(name, org_type, specialty, dlat, dlng, clinic, home, price, duration)
  loop
    insert into public.organizations
      (owner_profile_id, org_type, name, specialty, bio, verification_status, onboarding_step)
    values
      (v_owner, r.org_type, r.name, r.specialty,
       r.name || ' — sample provider seeded for testing. [demo data]', 'verified', null)
    returning id into v_org;

    -- Membership is what the org-side UI keys off (useActiveOrganization reads
    -- org_members, not ownership), so without this row the provider would be
    -- discoverable but impossible to sign in and manage.
    insert into public.org_members (organization_id, profile_id, role_in_org, specialty)
    values (v_org, v_owner, 'owner', r.specialty);

    insert into public.org_branches
      (organization_id, name, address, lat, lng, is_primary)
    values
      (v_org, 'Main branch',
       r.name || ', near your test location',
       v_base_lat + r.dlat, v_base_lng + r.dlng, true)
    returning id into v_branch;

    insert into public.services (organization_id, name, description)
    values (v_org, 'Consultation', 'General consultation and follow-up.')
    returning id into v_service;

    if r.clinic then
      insert into public.service_offerings
        (service_id, visit_type, price, duration_minutes, is_active)
      values (v_service, 'clinic', r.price, r.duration, true);
    end if;

    if r.home then
      insert into public.service_offerings
        (service_id, visit_type, price, duration_minutes, is_active)
      values (v_service, 'home', r.price + 300, r.duration + 15, true);

      -- radius_km is numeric(6,2), so 9999.99 is the ceiling. That is roughly half the
      -- earth's circumference, which makes home-visit search match from anywhere.
      insert into public.home_visit_service_areas
        (organization_id, branch_id, center_lat, center_lng, radius_km)
      values (v_org, v_branch, v_base_lat + r.dlat, v_base_lng + r.dlng, 9999.99);
    end if;

    -- Monday to Saturday. Clinic mornings + evenings; home visits in the afternoon gap,
    -- so the two visit types exercise genuinely independent schedules.
    for v_day in 1..6 loop
      if r.clinic then
        insert into public.availability_rules
          (organization_id, branch_id, visit_type, day_of_week, start_time, end_time, slot_duration_minutes)
        values
          (v_org, v_branch, 'clinic', v_day, '09:00:00', '13:00:00', r.duration),
          (v_org, v_branch, 'clinic', v_day, '17:00:00', '20:00:00', r.duration);
      end if;

      if r.home then
        insert into public.availability_rules
          (organization_id, branch_id, visit_type, day_of_week, start_time, end_time, slot_duration_minutes)
        values
          (v_org, v_branch, 'home', v_day, '13:30:00', '16:30:00', r.duration + 15);
      end if;
    end loop;
  end loop;

  raise notice 'Seeded 10 demo providers around %, % — manageable by profile %',
    v_base_lat, v_base_lng, v_owner;
end $$;

-- ---------------------------------------------------------------------------
-- Check what landed (should return 10 rows for clinic)
-- ---------------------------------------------------------------------------
-- select name, org_type, round(distance_km::numeric, 2) as km, supports_clinic, supports_home, min_price
--   from public.discover_organizations(19.2215, 73.1645, 25, 'clinic', null);

-- ---------------------------------------------------------------------------
-- Remove every demo provider (cascades to branches, services, offerings,
-- availability, service areas and any appointments booked against them)
-- ---------------------------------------------------------------------------
-- delete from public.organizations where bio like '%[demo data]%';
