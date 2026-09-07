import { supabase } from '@/lib/supabase';
import type { LatLng, PatientAddress } from '@/types';

export async function fetchPatientAddresses(patientId: string): Promise<PatientAddress[]> {
  const { data, error } = await supabase
    .from('patient_addresses')
    .select('*')
    .eq('patient_id', patientId)
    .order('label', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PatientAddress[];
}

export async function createPatientAddress(
  patientId: string,
  input: { label: string; address: string; coords: LatLng | null },
): Promise<PatientAddress> {
  const { data, error } = await supabase
    .from('patient_addresses')
    .insert({
      patient_id: patientId,
      label: input.label,
      address: input.address,
      lat: input.coords?.latitude ?? null,
      lng: input.coords?.longitude ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PatientAddress;
}

export async function deletePatientAddress(addressId: string): Promise<void> {
  const { error } = await supabase.from('patient_addresses').delete().eq('id', addressId);
  if (error) throw error;
}
