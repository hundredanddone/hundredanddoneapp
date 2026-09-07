import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import type { VisitType } from '@/types';

import { createPatientAddress, fetchPatientAddresses } from './addresses';
import { createAppointment, fetchOffering, fetchSlots, type CreateAppointmentInput } from './api';

export const bookingKeys = {
  slots: (organizationId: string, visitType: VisitType, date: string) =>
    ['booking', 'slots', organizationId, visitType, date] as const,
  addresses: (patientId: string) => ['booking', 'addresses', patientId] as const,
  offering: (offeringId: string) => ['booking', 'offering', offeringId] as const,
};

export function useOffering(offeringId: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.offering(offeringId ?? 'none'),
    queryFn: () => fetchOffering(offeringId as string),
    enabled: Boolean(offeringId),
  });
}

export function useSlots(organizationId: string | undefined, visitType: VisitType, date: string) {
  return useQuery({
    queryKey: bookingKeys.slots(organizationId ?? 'none', visitType, date),
    queryFn: () => fetchSlots({ organizationId: organizationId as string, visitType, date }),
    enabled: Boolean(organizationId),
    // Slots go stale quickly once other patients start booking.
    staleTime: 15_000,
  });
}

export function usePatientAddresses() {
  const patientId = useAuthStore((s) => s.session?.user.id ?? null);
  return useQuery({
    queryKey: bookingKeys.addresses(patientId ?? 'none'),
    queryFn: () => fetchPatientAddresses(patientId as string),
    enabled: Boolean(patientId),
  });
}

export function useCreatePatientAddress() {
  const queryClient = useQueryClient();
  const patientId = useAuthStore((s) => s.session?.user.id ?? null);

  return useMutation({
    mutationFn: (input: Parameters<typeof createPatientAddress>[1]) =>
      createPatientAddress(patientId as string, input),
    onSuccess: async () => {
      if (patientId) {
        await queryClient.invalidateQueries({ queryKey: bookingKeys.addresses(patientId) });
      }
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) => createAppointment(input),
    onSuccess: async (appointment) => {
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
      await queryClient.invalidateQueries({
        queryKey: ['booking', 'slots', appointment.organization_id],
      });
    },
  });
}
