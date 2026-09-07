import { supabase } from '@/lib/supabase';
import { dayjs } from '@/lib/time';
import type { Appointment, AppointmentStatus, VisitType } from '@/types';

/** The joined shape every appointment list and detail screen renders. */
export interface AppointmentWithRelations extends Appointment {
  organizations: { id: string; name: string; org_type: string; logo_url: string | null } | null;
  service_offerings: {
    id: string;
    price: number;
    duration_minutes: number;
    visit_type: VisitType;
    services: { id: string; name: string } | null;
  } | null;
  patient_addresses: {
    id: string;
    label: string;
    address: string;
    lat: number | null;
    lng: number | null;
  } | null;
  profiles: {
    id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

const SELECT = `
  *,
  organizations ( id, name, org_type, logo_url ),
  service_offerings ( id, price, duration_minutes, visit_type, services ( id, name ) ),
  patient_addresses ( id, label, address, lat, lng ),
  profiles!appointments_patient_id_fkey ( id, full_name, phone, avatar_url )
`;

export type AppointmentScope = 'upcoming' | 'past';

/** Statuses that mean "this appointment is done with", for the upcoming/past split. */
const CLOSED_STATUSES: AppointmentStatus[] = ['completed', 'cancelled', 'no_show'];

export async function fetchPatientAppointments(
  patientId: string,
  scope: AppointmentScope,
): Promise<AppointmentWithRelations[]> {
  const now = dayjs().toISOString();
  let query = supabase.from('appointments').select(SELECT).eq('patient_id', patientId);

  query =
    scope === 'upcoming'
      ? query.gte('scheduled_at', now).not('status', 'in', `(${CLOSED_STATUSES.join(',')})`)
      : query.or(`scheduled_at.lt.${now},status.in.(${CLOSED_STATUSES.join(',')})`);

  const { data, error } = await query.order('scheduled_at', {
    ascending: scope === 'upcoming',
  });
  if (error) throw error;
  return (data ?? []) as unknown as AppointmentWithRelations[];
}

export async function fetchOrgAppointments(
  organizationId: string,
  options: { date?: string; scope?: AppointmentScope } = {},
): Promise<AppointmentWithRelations[]> {
  let query = supabase.from('appointments').select(SELECT).eq('organization_id', organizationId);

  if (options.date) {
    const day = dayjs(options.date);
    query = query
      .gte('scheduled_at', day.startOf('day').toISOString())
      .lte('scheduled_at', day.endOf('day').toISOString());
  } else if (options.scope === 'upcoming') {
    query = query.gte('scheduled_at', dayjs().startOf('day').toISOString());
  }

  const { data, error } = await query.order('scheduled_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AppointmentWithRelations[];
}

export async function fetchAppointment(id: string): Promise<AppointmentWithRelations | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as AppointmentWithRelations | null) ?? null;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<void> {
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Which status an org can move an appointment to next. */
export function nextStatuses(
  current: AppointmentStatus,
  visitType: VisitType,
): AppointmentStatus[] {
  switch (current) {
    case 'pending':
      return ['confirmed', 'cancelled'];
    case 'confirmed':
      return visitType === 'home'
        ? ['en_route', 'in_progress', 'cancelled', 'no_show']
        : ['in_progress', 'cancelled', 'no_show'];
    case 'en_route':
      return ['in_progress', 'cancelled'];
    case 'in_progress':
      return ['completed'];
    default:
      return [];
  }
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  en_route: 'On the way',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
};
