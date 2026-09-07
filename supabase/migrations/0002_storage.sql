-- 100 and Done — storage buckets and policies
--
-- Path convention: every object is stored under an owning id as its first folder
-- segment, e.g. `org-logos/<organization_id>/<file>` or
-- `patient-records/<patient_id>/<file>`. The policies below key off that segment,
-- so `src/lib/uploads.ts` must always pass the owning id as the prefix.

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('org-logos', 'org-logos', true),
  ('verification-docs', 'verification-docs', false),
  ('patient-records', 'patient-records', false)
on conflict (id) do nothing;

-- avatars -------------------------------------------------------------------
-- Public read; each user writes only inside their own folder.

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: owner writes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: owner updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- org-logos -----------------------------------------------------------------
-- Public read (they appear in discovery); only org members write.

create policy "org logos: public read"
  on storage.objects for select
  using (bucket_id = 'org-logos');

create policy "org logos: members write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "org logos: members update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "org logos: members delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

-- verification-docs ---------------------------------------------------------
-- Private. Only members of the owning org, never patients.

create policy "verification docs: members only"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'verification-docs'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'verification-docs'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

-- patient-records -----------------------------------------------------------
-- Private. The patient owns their folder; orgs that treat them can read it.

create policy "patient records: owner writes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'patient-records'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "patient records: owner reads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'patient-records'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "patient records: treating org reads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'patient-records'
    and public.patient_of_my_orgs(((storage.foldername(name))[1])::uuid)
  );

create policy "patient records: owner deletes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'patient-records'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
