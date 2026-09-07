import { supabase } from '@/lib/supabase';
import type { PatientRecord, RecordType } from '@/types';

export interface PatientRecordWithOrg extends PatientRecord {
  organizations: { id: string; name: string } | null;
}

const SELECT = '*, organizations ( id, name )';

/** Everything about this patient — their own uploads plus records authored by orgs. */
export async function fetchPatientRecords(patientId: string): Promise<PatientRecordWithOrg[]> {
  const { data, error } = await supabase
    .from('patient_records')
    .select(SELECT)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PatientRecordWithOrg[];
}

/** Records this org authored, or that belong to appointments with this org. */
export async function fetchOrgPatientRecords(
  organizationId: string,
  patientId?: string,
): Promise<PatientRecordWithOrg[]> {
  let query = supabase.from('patient_records').select(SELECT).eq('organization_id', organizationId);
  if (patientId) query = query.eq('patient_id', patientId);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PatientRecordWithOrg[];
}

export interface CreateRecordInput {
  patientId: string;
  createdByProfileId: string;
  recordType: RecordType;
  organizationId?: string | null;
  appointmentId?: string | null;
  fileUrl?: string | null;
  notes?: string | null;
}

export async function createPatientRecord(input: CreateRecordInput): Promise<PatientRecord> {
  const { data, error } = await supabase
    .from('patient_records')
    .insert({
      patient_id: input.patientId,
      organization_id: input.organizationId ?? null,
      appointment_id: input.appointmentId ?? null,
      record_type: input.recordType,
      file_url: input.fileUrl ?? null,
      notes: input.notes ?? null,
      created_by_profile_id: input.createdByProfileId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PatientRecord;
}

export async function deletePatientRecord(id: string): Promise<void> {
  const { error } = await supabase.from('patient_records').delete().eq('id', id);
  if (error) throw error;
}

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  prescription: 'Prescription',
  lab_report: 'Lab report',
  consultation_note: 'Consultation note',
  document: 'Document',
};
