-- Patients may only cancel their own appointments.
--
-- The `appointments: patient updates own` policy in 0001 lets a patient update any
-- column on their own row. That allowed a patient to mark an appointment `completed`
-- (which unlocks leaving a review), or to change `payment_status`, `fee` or
-- `scheduled_at` directly. RLS cannot restrict individual columns, so this trigger
-- enforces the rule for patient-side writes.
--
-- Only callers who are the patient on the row and are not members of the organization
-- are checked. Org members, the service role and the SQL editor (where auth.uid() is
-- null) are unaffected.

create or replace function public.guard_patient_appointment_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null
     or new.patient_id is distinct from auth.uid()
     or public.is_org_member(new.organization_id) then
    return new;
  end if;

  if new.patient_id is distinct from old.patient_id
     or new.organization_id is distinct from old.organization_id
     or new.doctor_member_id is distinct from old.doctor_member_id
     or new.service_offering_id is distinct from old.service_offering_id
     or new.visit_type is distinct from old.visit_type
     or new.scheduled_at is distinct from old.scheduled_at
     or new.address_id is distinct from old.address_id
     or new.fee is distinct from old.fee
     or new.payment_status is distinct from old.payment_status then
    raise exception 'Patients can only cancel an appointment; other fields are read-only'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if new.status <> 'cancelled' then
      raise exception 'Patients can only set an appointment to cancelled'
        using errcode = '42501';
    end if;
    if old.status not in ('pending', 'confirmed') then
      raise exception 'This appointment can no longer be cancelled'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_guard_patient_update on public.appointments;

create trigger appointments_guard_patient_update
  before update on public.appointments
  for each row execute function public.guard_patient_appointment_update();
