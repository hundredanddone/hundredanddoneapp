-- 100 and Done — initial schema
--
-- First pass to unblock development. Built around the Patient/Org model, where "Org"
-- covers an independent doctor, a clinic, or a hospital. An independent doctor's
-- organization simply has exactly one member, with role_in_org = 'owner'.
--
-- Every table has RLS enabled. The policy set is summarised at the bottom of the file.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  role text check (role in ('patient', 'org')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'Null until the user picks an account type on the onboarding account-type screen.';

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  org_type text not null check (org_type in ('independent_doctor', 'clinic', 'hospital')),
  name text not null,
  specialty text,
  bio text,
  -- Added beyond the base spec: the public avatar/logo shown in discovery.
  logo_url text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  -- Added beyond the base spec: which wizard step is still outstanding, so an org
  -- that quits mid-setup resumes exactly where it left off. Null means finished.
  onboarding_step text,
  created_at timestamptz not null default now()
);

create index organizations_owner_idx on public.organizations (owner_profile_id);
create index organizations_verification_idx on public.organizations (verification_status);

create table public.org_verification_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  doc_type text not null check (doc_type in ('medical_license', 'business_registration', 'other')),
  file_url text not null,
  uploaded_at timestamptz not null default now()
);

create index org_verification_documents_org_idx
  on public.org_verification_documents (organization_id);

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Null while an invite is outstanding; filled in when that person first signs in.
  profile_id uuid references public.profiles (id) on delete cascade,
  invited_email text,
  full_name text,
  role_in_org text not null check (role_in_org in ('owner', 'doctor', 'staff', 'receptionist')),
  specialty text,
  created_at timestamptz not null default now(),
  constraint org_members_identified check (profile_id is not null or invited_email is not null)
);

create unique index org_members_unique_profile
  on public.org_members (organization_id, profile_id)
  where profile_id is not null;
create unique index org_members_unique_invite
  on public.org_members (organization_id, lower(invited_email))
  where profile_id is null and invited_email is not null;
create index org_members_profile_idx on public.org_members (profile_id);

create table public.org_branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index org_branches_one_primary
  on public.org_branches (organization_id)
  where is_primary;
create index org_branches_org_idx on public.org_branches (organization_id);

-- ---------------------------------------------------------------------------
-- Services and availability
-- ---------------------------------------------------------------------------

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text
);

create index services_org_idx on public.services (organization_id);

create table public.service_offerings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  visit_type text not null check (visit_type in ('clinic', 'home')),
  price numeric(10, 2) not null default 0 check (price >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  is_active boolean not null default true,
  unique (service_id, visit_type)
);

create index service_offerings_service_idx on public.service_offerings (service_id);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid references public.org_branches (id) on delete cascade,
  doctor_member_id uuid references public.org_members (id) on delete cascade,
  visit_type text not null check (visit_type in ('clinic', 'home')),
  -- 0 = Sunday .. 6 = Saturday, matching JS Date#getDay and Postgres extract(dow).
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_duration_minutes integer not null default 15 check (slot_duration_minutes > 0),
  constraint availability_rules_ordered check (end_time > start_time)
);

create index availability_rules_lookup_idx
  on public.availability_rules (organization_id, visit_type, day_of_week);

create table public.availability_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  date date not null,
  is_blocked boolean not null default true,
  reason text,
  unique (organization_id, date)
);

create table public.home_visit_service_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  branch_id uuid references public.org_branches (id) on delete cascade,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_km numeric(6, 2) not null check (radius_km > 0)
);

create index home_visit_service_areas_org_idx
  on public.home_visit_service_areas (organization_id);

-- ---------------------------------------------------------------------------
-- Patients
-- ---------------------------------------------------------------------------

create table public.patient_addresses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Home',
  address text not null,
  lat double precision,
  lng double precision
);

create index patient_addresses_patient_idx on public.patient_addresses (patient_id);

create table public.patient_family_members (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  relation text,
  age integer check (age is null or age between 0 and 130)
);

create index patient_family_members_patient_idx on public.patient_family_members (patient_id);

-- ---------------------------------------------------------------------------
-- Appointments, records, reviews, notifications
-- ---------------------------------------------------------------------------

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  doctor_member_id uuid references public.org_members (id) on delete set null,
  service_offering_id uuid not null references public.service_offerings (id) on delete restrict,
  visit_type text not null check (visit_type in ('clinic', 'home')),
  scheduled_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'en_route', 'in_progress', 'completed', 'cancelled', 'no_show')),
  -- RESTRICT, not SET NULL: nulling this would violate appointments_home_needs_address
  -- below and surface as a confusing check violation when a patient deletes an address.
  address_id uuid references public.patient_addresses (id) on delete restrict,
  fee numeric(10, 2),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded')),
  created_at timestamptz not null default now(),
  -- A home visit has to say where. Clinic visits may leave it null.
  constraint appointments_home_needs_address
    check (visit_type <> 'home' or address_id is not null)
);

create index appointments_patient_idx on public.appointments (patient_id, scheduled_at desc);
create index appointments_org_idx on public.appointments (organization_id, scheduled_at);

-- One live booking per doctor per slot. When no doctor is named the organization
-- itself is the resource, which is right for an independent doctor and a small clinic;
-- a hospital that assigns doctor_member_id gets per-doctor concurrency instead of being
-- capped at one appointment per slot across the whole building.
-- Cancelled and no-show slots free up again.
create unique index appointments_no_double_booking
  on public.appointments (
    organization_id,
    coalesce(doctor_member_id, organization_id),
    scheduled_at
  )
  where status not in ('cancelled', 'no_show');

create table public.patient_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  -- Null for records the patient uploaded themselves.
  organization_id uuid references public.organizations (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  record_type text not null
    check (record_type in ('prescription', 'lab_report', 'consultation_note', 'document')),
  file_url text,
  notes text,
  created_by_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint patient_records_has_content check (file_url is not null or notes is not null)
);

create index patient_records_patient_idx on public.patient_records (patient_id, created_at desc);
create index patient_records_org_idx on public.patient_records (organization_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index reviews_org_idx on public.reviews (organization_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_idx on public.notifications (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions
--
-- These are SECURITY DEFINER so that a policy on, say, org_members can ask
-- "is the caller a member of this org?" without re-entering that table's own
-- policies and recursing. They take no user input beyond ids and always
-- constrain on auth.uid().
-- ---------------------------------------------------------------------------

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_members m
    where m.organization_id = p_organization_id
      and m.profile_id = auth.uid()
  );
$$;

create or replace function public.owns_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.owner_profile_id = auth.uid()
  );
$$;

-- True when the patient has (or had) an appointment with this organization.
-- Gates an org's access to that patient's records.
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
  );
$$;

-- Links outstanding email invites to a profile the first time that person signs in.
create or replace function public.claim_org_invites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.org_members
  set profile_id = new.id,
      full_name = coalesce(full_name, new.full_name)
  where profile_id is null
    and invited_email is not null
    and lower(invited_email) = lower(new.email);
  return new;
end;
$$;

create trigger profiles_claim_org_invites
  after insert on public.profiles
  for each row execute function public.claim_org_invites();

-- Is this organization published to patients?
create or replace function public.org_is_discoverable(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.verification_status = 'verified'
  );
$$;

-- Is this patient a patient of any organization the caller belongs to?
create or replace function public.patient_of_my_orgs(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.appointments a
    join public.org_members m on m.organization_id = a.organization_id
    where a.patient_id = p_patient_id
      and m.profile_id = auth.uid()
  );
$$;

-- Can the caller see this patient address? True for the patient, and for org members
-- who have an appointment pointing at it (they have to know where to go).
create or replace function public.address_visible_to_me(p_address_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_addresses pa
    where pa.id = p_address_id
      and pa.patient_id = auth.uid()
  )
  or exists (
    select 1
    from public.appointments a
    join public.org_members m on m.organization_id = a.organization_id
    where a.address_id = p_address_id
      and m.profile_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Enabled on every table. Nothing is readable by anon: the app requires a Google
-- sign-in before any screen renders, and public discovery is served by the
-- SECURITY DEFINER `discover_organizations` RPC at the bottom of this file, which
-- returns only discovery-safe columns.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_verification_documents enable row level security;
alter table public.org_members enable row level security;
alter table public.org_branches enable row level security;
alter table public.services enable row level security;
alter table public.service_offerings enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_overrides enable row level security;
alter table public.home_visit_service_areas enable row level security;
alter table public.patient_addresses enable row level security;
alter table public.patient_family_members enable row level security;
alter table public.appointments enable row level security;
alter table public.patient_records enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

-- profiles ------------------------------------------------------------------

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

-- An org needs the patient's name and phone to run the appointment.
create policy "profiles: org reads its own patients"
  on public.profiles for select to authenticated
  using (public.patient_of_my_orgs(id));

create policy "profiles: insert own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- organizations -------------------------------------------------------------

create policy "organizations: members read own"
  on public.organizations for select to authenticated
  using (public.is_org_member(id) or owner_profile_id = auth.uid());

create policy "organizations: patients read verified"
  on public.organizations for select to authenticated
  using (verification_status = 'verified');

create policy "organizations: owner creates"
  on public.organizations for insert to authenticated
  with check (owner_profile_id = auth.uid());

create policy "organizations: members update"
  on public.organizations for update to authenticated
  using (public.is_org_member(id) or owner_profile_id = auth.uid())
  with check (public.is_org_member(id) or owner_profile_id = auth.uid());

create policy "organizations: owner deletes"
  on public.organizations for delete to authenticated
  using (owner_profile_id = auth.uid());

-- org_verification_documents ------------------------------------------------
-- Never readable by patients, at any verification status.

create policy "verification docs: members only"
  on public.org_verification_documents for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- org_members ---------------------------------------------------------------

create policy "org members: read own memberships"
  on public.org_members for select to authenticated
  using (profile_id = auth.uid() or public.is_org_member(organization_id));

create policy "org members: owner manages"
  on public.org_members for all to authenticated
  using (public.owns_organization(organization_id))
  with check (public.owns_organization(organization_id));

-- The very first member row is written by the owner as part of creating the org,
-- before any membership exists to check against.
create policy "org members: owner bootstraps self"
  on public.org_members for insert to authenticated
  with check (profile_id = auth.uid() and public.owns_organization(organization_id));

-- org_branches, services, offerings, availability ---------------------------
-- Read: org members always; patients only once the org is verified.
-- Write: org members only.

create policy "branches: read"
  on public.org_branches for select to authenticated
  using (public.is_org_member(organization_id) or public.org_is_discoverable(organization_id));

create policy "branches: members write"
  on public.org_branches for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "services: read"
  on public.services for select to authenticated
  using (public.is_org_member(organization_id) or public.org_is_discoverable(organization_id));

create policy "services: members write"
  on public.services for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "service offerings: read"
  on public.service_offerings for select to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_id
        and (public.is_org_member(s.organization_id) or public.org_is_discoverable(s.organization_id))
    )
  );

create policy "service offerings: members write"
  on public.service_offerings for all to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_id and public.is_org_member(s.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.services s
      where s.id = service_id and public.is_org_member(s.organization_id)
    )
  );

create policy "availability rules: read"
  on public.availability_rules for select to authenticated
  using (public.is_org_member(organization_id) or public.org_is_discoverable(organization_id));

create policy "availability rules: members write"
  on public.availability_rules for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "availability overrides: read"
  on public.availability_overrides for select to authenticated
  using (public.is_org_member(organization_id) or public.org_is_discoverable(organization_id));

create policy "availability overrides: members write"
  on public.availability_overrides for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "service areas: read"
  on public.home_visit_service_areas for select to authenticated
  using (public.is_org_member(organization_id) or public.org_is_discoverable(organization_id));

create policy "service areas: members write"
  on public.home_visit_service_areas for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- patient-owned data --------------------------------------------------------

create policy "patient addresses: owner manages"
  on public.patient_addresses for all to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- The visiting org must be able to read the address it is travelling to.
create policy "patient addresses: visiting org reads"
  on public.patient_addresses for select to authenticated
  using (public.address_visible_to_me(id));

create policy "family members: owner manages"
  on public.patient_family_members for all to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "notifications: owner reads"
  on public.notifications for select to authenticated
  using (profile_id = auth.uid());

create policy "notifications: owner updates"
  on public.notifications for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- appointments --------------------------------------------------------------

create policy "appointments: patient reads own"
  on public.appointments for select to authenticated
  using (patient_id = auth.uid());

create policy "appointments: org reads own"
  on public.appointments for select to authenticated
  using (public.is_org_member(organization_id));

create policy "appointments: patient books"
  on public.appointments for insert to authenticated
  with check (patient_id = auth.uid() and public.org_is_discoverable(organization_id));

create policy "appointments: patient updates own"
  on public.appointments for update to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "appointments: org updates own"
  on public.appointments for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- patient_records -----------------------------------------------------------
-- The patient can always read every record about them, whoever wrote it.
-- An org can only reach records tied to a patient it actually treats.

create policy "records: patient reads all own"
  on public.patient_records for select to authenticated
  using (patient_id = auth.uid());

create policy "records: treating org reads"
  on public.patient_records for select to authenticated
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
    and public.org_treats_patient(organization_id, patient_id)
  );

create policy "records: patient uploads own"
  on public.patient_records for insert to authenticated
  with check (
    patient_id = auth.uid()
    and created_by_profile_id = auth.uid()
    and organization_id is null
  );

create policy "records: treating org writes"
  on public.patient_records for insert to authenticated
  with check (
    created_by_profile_id = auth.uid()
    and organization_id is not null
    and public.is_org_member(organization_id)
    and public.org_treats_patient(organization_id, patient_id)
  );

create policy "records: author deletes"
  on public.patient_records for delete to authenticated
  using (created_by_profile_id = auth.uid());

-- reviews -------------------------------------------------------------------

create policy "reviews: readable for discoverable orgs"
  on public.reviews for select to authenticated
  using (public.org_is_discoverable(organization_id) or public.is_org_member(organization_id));

create policy "reviews: patient reads own"
  on public.reviews for select to authenticated
  using (patient_id = auth.uid());

create policy "reviews: patient writes own after a completed visit"
  on public.reviews for insert to authenticated
  with check (
    patient_id = auth.uid()
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and a.patient_id = auth.uid()
        and a.organization_id = reviews.organization_id
        and a.status = 'completed'
    )
  );

create policy "reviews: patient edits own"
  on public.reviews for update to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Discovery
--
-- Distance search lives in the database so that clients never receive rows
-- outside their radius, and so the anon/patient-facing surface is a fixed,
-- discovery-safe column list rather than "select * from organizations".
--
-- Uses plain haversine rather than PostGIS to keep the first migration
-- dependency-free. Swap in `earthdistance`/PostGIS with a GiST index when the
-- provider count makes the sequential scan hurt.
-- ---------------------------------------------------------------------------

create or replace function public.haversine_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
parallel safe
as $$
  select 2 * 6371 * asin(
    sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    )
  );
$$;

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
    -- One row per org: whichever branch is closest to the searcher.
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
    o.id,
    o.name,
    o.org_type,
    o.specialty,
    o.logo_url,
    nb.branch_id,
    nb.address,
    nb.lat,
    nb.lng,
    nb.distance_km,
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
        and exists (
          select 1
          from public.home_visit_service_areas a
          where a.organization_id = o.id
            and public.haversine_km(p_lat, p_lng, a.center_lat, a.center_lng) <= a.radius_km
        )
      else
        coalesce(os.has_clinic_offering, false)
        and nb.distance_km <= p_radius_km
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
