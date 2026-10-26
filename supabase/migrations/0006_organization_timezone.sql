-- Each organization keeps its own timezone.
--
-- Availability rules are stored as wall-clock times ("09:00" to "17:00") and must be
-- read in the provider's zone. Before this, slots were built in the device's zone, so a
-- patient in another timezone saw the wrong hours. The default matches the first
-- providers; new organizations get the timezone of the device that created them (see
-- createOrganization in src/features/onboarding/api.ts).
--
-- Values are IANA names such as 'Asia/Kolkata'. Postgres does not validate them against
-- the tz database here, so the app must only send valid names.

alter table public.organizations
  add column if not exists timezone text not null default 'Asia/Kolkata';

comment on column public.organizations.timezone is
  'IANA timezone the organization runs its availability in, e.g. Asia/Kolkata.';
