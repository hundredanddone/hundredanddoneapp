/**
 * Domain types for 100 and Done.
 *
 * These are hand-written to mirror `supabase/migrations/0001_init.sql`. Once a real
 * Supabase project exists, replace/augment them with generated types:
 *   npm run types:supabase   (writes src/types/database.generated.ts)
 */

export type AccountRole = 'patient' | 'org';
export type OrgType = 'independent_doctor' | 'clinic' | 'hospital';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type OrgMemberRole = 'owner' | 'doctor' | 'staff' | 'receptionist';
export type VisitType = 'clinic' | 'home';
export type AppointmentStatus =
  'pending' | 'confirmed' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type RecordType = 'prescription' | 'lab_report' | 'consultation_note' | 'document';
export type VerificationDocType = 'medical_license' | 'business_registration' | 'other';

/** 0 = Sunday … 6 = Saturday (matches JS `Date#getDay` and Postgres `extract(dow)`). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: AccountRole | null;
  onboarding_completed: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  owner_profile_id: string;
  org_type: OrgType;
  name: string;
  specialty: string | null;
  bio: string | null;
  logo_url: string | null;
  verification_status: VerificationStatus;
  onboarding_step: string | null;
  created_at: string;
}

export interface OrgVerificationDocument {
  id: string;
  organization_id: string;
  doc_type: VerificationDocType;
  file_url: string;
  uploaded_at: string;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  profile_id: string | null;
  invited_email: string | null;
  full_name: string | null;
  role_in_org: OrgMemberRole;
  specialty: string | null;
  created_at: string;
}

export interface OrgBranch {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  is_primary: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
}

export interface ServiceOffering {
  id: string;
  service_id: string;
  visit_type: VisitType;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

export interface AvailabilityRule {
  id: string;
  organization_id: string;
  branch_id: string | null;
  doctor_member_id: string | null;
  visit_type: VisitType;
  day_of_week: DayOfWeek;
  /** 'HH:mm:ss' */
  start_time: string;
  /** 'HH:mm:ss' */
  end_time: string;
  slot_duration_minutes: number;
}

export interface AvailabilityOverride {
  id: string;
  organization_id: string;
  /** 'YYYY-MM-DD' */
  date: string;
  is_blocked: boolean;
  reason: string | null;
}

export interface HomeVisitServiceArea {
  id: string;
  organization_id: string;
  branch_id: string | null;
  center_lat: number;
  center_lng: number;
  radius_km: number;
}

export interface PatientAddress {
  id: string;
  patient_id: string;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

export interface PatientFamilyMember {
  id: string;
  patient_id: string;
  name: string;
  relation: string | null;
  age: number | null;
}

export interface Appointment {
  id: string;
  patient_id: string;
  organization_id: string;
  doctor_member_id: string | null;
  service_offering_id: string;
  visit_type: VisitType;
  /** ISO timestamptz */
  scheduled_at: string;
  status: AppointmentStatus;
  address_id: string | null;
  fee: number | null;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface PatientRecord {
  id: string;
  patient_id: string;
  organization_id: string | null;
  appointment_id: string | null;
  record_type: RecordType;
  file_url: string | null;
  notes: string | null;
  created_by_profile_id: string;
  created_at: string;
}

export interface Review {
  id: string;
  appointment_id: string;
  patient_id: string;
  organization_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  profile_id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/** Shape returned by the `discover_organizations` RPC (see migration). */
export interface DiscoveryResult {
  organization_id: string;
  name: string;
  org_type: OrgType;
  specialty: string | null;
  logo_url: string | null;
  branch_id: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  distance_km: number | null;
  avg_rating: number | null;
  review_count: number;
  supports_clinic: boolean;
  supports_home: boolean;
  min_price: number | null;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** One contiguous availability window inside a day, e.g. 10:00–13:00. */
export interface TimeBlock {
  /** 'HH:mm' */
  start: string;
  /** 'HH:mm' */
  end: string;
}

export type WeeklyAvailability = Record<DayOfWeek, TimeBlock[]>;
