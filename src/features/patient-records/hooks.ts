import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';

import {
  createPatientRecord,
  deletePatientRecord,
  fetchOrgPatientRecords,
  fetchPatientRecords,
  type CreateRecordInput,
} from './api';

export const recordKeys = {
  all: ['patient-records'] as const,
  patient: (patientId: string) => ['patient-records', 'patient', patientId] as const,
  org: (organizationId: string, patientId?: string) =>
    ['patient-records', 'org', organizationId, patientId ?? 'all'] as const,
};

export function usePatientRecords() {
  const patientId = useAuthStore((s) => s.session?.user.id ?? null);
  return useQuery({
    queryKey: recordKeys.patient(patientId ?? 'none'),
    queryFn: () => fetchPatientRecords(patientId as string),
    enabled: Boolean(patientId),
  });
}

export function useOrgPatientRecords(organizationId: string | null, patientId?: string) {
  return useQuery({
    queryKey: recordKeys.org(organizationId ?? 'none', patientId),
    queryFn: () => fetchOrgPatientRecords(organizationId as string, patientId),
    enabled: Boolean(organizationId),
  });
}

export function useCreatePatientRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecordInput) => createPatientRecord(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: recordKeys.all });
    },
  });
}

export function useDeletePatientRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePatientRecord(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: recordKeys.all });
    },
  });
}
