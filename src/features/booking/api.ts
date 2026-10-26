import { supabase } from '@/lib/supabase';
import { dayjs, fromPgTime, inZone, slotsForBlock, zonedToIso } from '@/lib/time';
import type {
  Appointment,
  AvailabilityOverride,
  AvailabilityRule,
  DayOfWeek,
  VisitType,
} from '@/types';

const FREE_STATUSES: Appointment['status'][] = ['cancelled', 'no_show'];

export interface Slot {
  /** 'HH:mm' in the provider's timezone. */
  time: string;
  /** Full ISO timestamp for `appointments.scheduled_at`. */
  scheduledAt: string;
  available: boolean;
}

export interface SlotQuery {
  organizationId: string;
  /** The organization's IANA timezone. Slots and the day boundaries are computed in this zone. */
  timezone: string;
  visitType: VisitType;
  /** 'YYYY-MM-DD' in the organization's timezone */
  date: string;
  doctorMemberId?: string | null;
}

/**
 * Builds the bookable slots for one day.
 *
 * Slots come from `availability_rules`, minus any date-level block in
 * `availability_overrides`, minus times already taken by a live appointment.
 * Everything is read in the organization's timezone, so a patient in another zone sees
 * the provider's hours. Past times on today's date are marked unavailable rather than
 * hidden, so the patient can see that the provider does work then.
 */
export async function fetchSlots(query: SlotQuery): Promise<Slot[]> {
  const day = dayjs.tz(query.date, query.timezone);
  const dayOfWeek = day.day() as DayOfWeek;

  const [rulesResult, overrideResult, bookedResult] = await Promise.all([
    supabase
      .from('availability_rules')
      .select('*')
      .eq('organization_id', query.organizationId)
      .eq('visit_type', query.visitType)
      .eq('day_of_week', dayOfWeek),
    supabase
      .from('availability_overrides')
      .select('*')
      .eq('organization_id', query.organizationId)
      .eq('date', query.date),
    supabase
      .from('appointments')
      .select('scheduled_at, status, doctor_member_id')
      .eq('organization_id', query.organizationId)
      .gte('scheduled_at', day.startOf('day').toISOString())
      .lte('scheduled_at', day.endOf('day').toISOString()),
  ]);

  if (rulesResult.error) throw rulesResult.error;
  if (overrideResult.error) throw overrideResult.error;
  if (bookedResult.error) throw bookedResult.error;

  const overrides = (overrideResult.data ?? []) as AvailabilityOverride[];
  if (overrides.some((override) => override.is_blocked)) return [];

  const rules = ((rulesResult.data ?? []) as AvailabilityRule[]).filter(
    (rule) =>
      !query.doctorMemberId ||
      rule.doctor_member_id === null ||
      rule.doctor_member_id === query.doctorMemberId,
  );

  // Cancelled and no-show slots are free again, matching the `appointments_no_double_booking`
  // index. When a doctor is chosen, only that doctor's bookings block the slot, so one
  // doctor's appointment does not hide the same time for their colleagues.
  const taken = new Set(
    (
      (bookedResult.data ?? []) as Pick<
        Appointment,
        'scheduled_at' | 'status' | 'doctor_member_id'
      >[]
    )
      .filter((appointment) => !FREE_STATUSES.includes(appointment.status))
      .filter(
        (appointment) =>
          !query.doctorMemberId || appointment.doctor_member_id === query.doctorMemberId,
      )
      .map((appointment) => inZone(appointment.scheduled_at, query.timezone).format('HH:mm')),
  );

  const now = dayjs();
  const slots = new Map<string, Slot>();

  for (const rule of rules) {
    const block = { start: fromPgTime(rule.start_time), end: fromPgTime(rule.end_time) };
    for (const time of slotsForBlock(block, rule.slot_duration_minutes)) {
      const scheduledAt = zonedToIso(query.date, time, query.timezone);
      slots.set(time, {
        time,
        scheduledAt,
        available: !taken.has(time) && dayjs(scheduledAt).isAfter(now),
      });
    }
  }

  return [...slots.values()].sort((a, b) => a.time.localeCompare(b.time));
}

export interface CreateAppointmentInput {
  patientId: string;
  organizationId: string;
  serviceOfferingId: string;
  visitType: VisitType;
  scheduledAt: string;
  doctorMemberId?: string | null;
  addressId?: string | null;
  fee?: number | null;
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: input.patientId,
      organization_id: input.organizationId,
      doctor_member_id: input.doctorMemberId ?? null,
      service_offering_id: input.serviceOfferingId,
      visit_type: input.visitType,
      scheduled_at: input.scheduledAt,
      status: 'pending',
      address_id: input.addressId ?? null,
      fee: input.fee ?? null,
      payment_status: 'unpaid',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Appointment;
}

export interface OfferingDetail {
  id: string;
  visit_type: VisitType;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  services: {
    id: string;
    name: string;
    description: string | null;
    organization_id: string;
    organizations: { id: string; name: string; logo_url: string | null; timezone: string } | null;
  } | null;
}

/** Everything the booking screen needs from one `service_offerings` row. */
export async function fetchOffering(offeringId: string): Promise<OfferingDetail | null> {
  const { data, error } = await supabase
    .from('service_offerings')
    .select(
      'id, visit_type, price, duration_minutes, is_active, services ( id, name, description, organization_id, organizations ( id, name, logo_url, timezone ) )',
    )
    .eq('id', offeringId)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as OfferingDetail | null) ?? null;
}
