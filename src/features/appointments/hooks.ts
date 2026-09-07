import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import type { AppointmentStatus } from '@/types';

import {
  fetchAppointment,
  fetchOrgAppointments,
  fetchPatientAppointments,
  updateAppointmentStatus,
  type AppointmentScope,
} from './api';

export const appointmentKeys = {
  all: ['appointments'] as const,
  patient: (patientId: string, scope: AppointmentScope) =>
    ['appointments', 'patient', patientId, scope] as const,
  org: (organizationId: string, key: string) =>
    ['appointments', 'org', organizationId, key] as const,
  detail: (id: string) => ['appointments', 'detail', id] as const,
};

export function usePatientAppointments(scope: AppointmentScope) {
  const patientId = useAuthStore((s) => s.session?.user.id ?? null);
  return useQuery({
    queryKey: appointmentKeys.patient(patientId ?? 'none', scope),
    queryFn: () => fetchPatientAppointments(patientId as string, scope),
    enabled: Boolean(patientId),
  });
}

export function useOrgAppointments(
  organizationId: string | null,
  options: { date?: string; scope?: AppointmentScope } = {},
) {
  const key = options.date ?? options.scope ?? 'all';
  return useQuery({
    queryKey: appointmentKeys.org(organizationId ?? 'none', key),
    queryFn: () => fetchOrgAppointments(organizationId as string, options),
    enabled: Boolean(organizationId),
  });
}

export function useAppointment(id: string | undefined) {
  return useQuery({
    queryKey: appointmentKeys.detail(id ?? 'none'),
    queryFn: () => fetchAppointment(id as string),
    enabled: Boolean(id),
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: AppointmentStatus }) =>
      updateAppointmentStatus(input.id, input.status),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      await queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(variables.id) });
    },
  });
}
