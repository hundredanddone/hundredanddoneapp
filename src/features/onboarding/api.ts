import { supabase } from '@/lib/supabase';
import { toPgTime } from '@/lib/time';
import type {
  AccountRole,
  AvailabilityRule,
  DayOfWeek,
  LatLng,
  OrgBranch,
  OrgMember,
  OrgMemberRole,
  OrgType,
  Organization,
  Service,
  ServiceOffering,
  VerificationDocType,
  VisitType,
  WeeklyAvailability,
} from '@/types';

import type { OrgStepKey } from './steps';

export async function setAccountRole(userId: string, role: AccountRole): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
}

/** The org this user owns or belongs to. Onboarding only ever creates one. */
export async function fetchMyOrganization(userId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_profile_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as Organization | null) ?? null;
}

/**
 * Creates the org on the first wizard step and adds the owner as its first member.
 * An independent doctor's org therefore has exactly one member with role_in_org 'owner'.
 */
export async function createOrganization(
  userId: string,
  orgType: OrgType,
  name: string,
): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      owner_profile_id: userId,
      org_type: orgType,
      name,
      verification_status: 'pending',
      onboarding_step: 'basic_info',
    })
    .select('*')
    .single();
  if (error) throw error;

  const organization = data as Organization;

  const { error: memberError } = await supabase.from('org_members').insert({
    organization_id: organization.id,
    profile_id: userId,
    role_in_org: 'owner' satisfies OrgMemberRole,
  });
  if (memberError) throw memberError;

  return organization;
}

export async function updateOrganization(
  organizationId: string,
  patch: Partial<Organization>,
): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .update(patch)
    .eq('id', organizationId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Organization;
}

/** Records how far the wizard got, so the user resumes here on the next app open. */
export async function setOnboardingStep(
  organizationId: string,
  step: OrgStepKey | null,
): Promise<void> {
  const { error } = await supabase
    .from('organizations')
    .update({ onboarding_step: step })
    .eq('id', organizationId);
  if (error) throw error;
}

export async function fetchPrimaryBranch(organizationId: string): Promise<OrgBranch | null> {
  const { data, error } = await supabase
    .from('org_branches')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_primary', true)
    .maybeSingle();
  if (error) throw error;
  return (data as OrgBranch | null) ?? null;
}

export async function upsertPrimaryBranch(
  organizationId: string,
  input: { name: string; address: string; coords: LatLng | null },
): Promise<OrgBranch> {
  const existing = await fetchPrimaryBranch(organizationId);
  const payload = {
    organization_id: organizationId,
    name: input.name,
    address: input.address,
    lat: input.coords?.latitude ?? null,
    lng: input.coords?.longitude ?? null,
    is_primary: true,
  };

  const query = existing
    ? supabase.from('org_branches').update(payload).eq('id', existing.id)
    : supabase.from('org_branches').insert(payload);

  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return data as OrgBranch;
}

export async function fetchAvailability(
  organizationId: string,
  visitType: VisitType,
): Promise<AvailabilityRule[]> {
  const { data, error } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('visit_type', visitType)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AvailabilityRule[];
}

/**
 * Replaces the whole weekly pattern for one visit type. Rewriting rather than diffing
 * keeps "what the provider sees" and "what is stored" identical, which matters because
 * slot generation reads these rows directly.
 */
export async function saveAvailability(
  organizationId: string,
  visitType: VisitType,
  weekly: WeeklyAvailability,
  slotDurationMinutes: number,
  branchId: string | null = null,
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('availability_rules')
    .delete()
    .eq('organization_id', organizationId)
    .eq('visit_type', visitType);
  if (deleteError) throw deleteError;

  const rows = (Object.keys(weekly) as unknown as DayOfWeek[]).flatMap((day) =>
    weekly[day].map((block) => ({
      organization_id: organizationId,
      branch_id: branchId,
      doctor_member_id: null,
      visit_type: visitType,
      day_of_week: Number(day),
      start_time: toPgTime(block.start),
      end_time: toPgTime(block.end),
      slot_duration_minutes: slotDurationMinutes,
    })),
  );

  if (rows.length === 0) return;
  const { error } = await supabase.from('availability_rules').insert(rows);
  if (error) throw error;
}

export async function saveHomeVisitServiceArea(
  organizationId: string,
  center: LatLng,
  radiusKm: number,
  branchId: string | null = null,
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('home_visit_service_areas')
    .delete()
    .eq('organization_id', organizationId);
  if (deleteError) throw deleteError;

  const { error } = await supabase.from('home_visit_service_areas').insert({
    organization_id: organizationId,
    branch_id: branchId,
    center_lat: center.latitude,
    center_lng: center.longitude,
    radius_km: radiusKm,
  });
  if (error) throw error;
}

export interface ServiceWithOfferings extends Service {
  service_offerings: ServiceOffering[];
}

export async function fetchServices(organizationId: string): Promise<ServiceWithOfferings[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*, service_offerings(*)')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ServiceWithOfferings[];
}

export interface ServiceOfferingInput {
  visit_type: VisitType;
  price: number;
  duration_minutes: number;
}

export async function addService(
  organizationId: string,
  input: { name: string; description: string | null; offerings: ServiceOfferingInput[] },
): Promise<ServiceWithOfferings> {
  const { data, error } = await supabase
    .from('services')
    .insert({
      organization_id: organizationId,
      name: input.name,
      description: input.description,
    })
    .select('*')
    .single();
  if (error) throw error;

  const service = data as Service;
  if (input.offerings.length > 0) {
    const { error: offeringError } = await supabase.from('service_offerings').insert(
      input.offerings.map((offering) => ({
        service_id: service.id,
        visit_type: offering.visit_type,
        price: offering.price,
        duration_minutes: offering.duration_minutes,
        is_active: true,
      })),
    );
    if (offeringError) throw offeringError;
  }

  return { ...service, service_offerings: [] };
}

export async function deleteService(serviceId: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', serviceId);
  if (error) throw error;
}

export async function fetchOrgMembers(organizationId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as OrgMember[];
}

/**
 * Adds a placeholder member row keyed by email. `profile_id` stays null until that
 * person signs in with Google and the invite is claimed (see the claim_org_invites
 * function in the migration).
 */
export async function inviteOrgMember(
  organizationId: string,
  input: {
    invited_email: string;
    full_name: string | null;
    role_in_org: OrgMemberRole;
    specialty: string | null;
  },
): Promise<OrgMember> {
  const { data, error } = await supabase
    .from('org_members')
    .insert({ organization_id: organizationId, profile_id: null, ...input })
    .select('*')
    .single();
  if (error) throw error;
  return data as OrgMember;
}

export async function removeOrgMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('org_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function addVerificationDocument(
  organizationId: string,
  docType: VerificationDocType,
  fileUrl: string,
): Promise<void> {
  const { error } = await supabase.from('org_verification_documents').insert({
    organization_id: organizationId,
    doc_type: docType,
    file_url: fileUrl,
  });
  if (error) throw error;
}

export async function fetchVerificationDocuments(organizationId: string) {
  const { data, error } = await supabase
    .from('org_verification_documents')
    .select('*')
    .eq('organization_id', organizationId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Final wizard step: mark the org as awaiting review and flip the profile flag that
 * lets the root layout route into the (org) group.
 */
export async function completeOrgOnboarding(userId: string, organizationId: string): Promise<void> {
  const { error: orgError } = await supabase
    .from('organizations')
    .update({ verification_status: 'pending', onboarding_step: null })
    .eq('id', organizationId);
  if (orgError) throw orgError;

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', userId);
  if (error) throw error;
}
