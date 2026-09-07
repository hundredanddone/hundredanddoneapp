import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';
import { useOrgContextStore } from '@/stores/orgContextStore';
import type { VisitType } from '@/types';

import {
  fetchAvailability,
  fetchMyOrganization,
  fetchOrgMembers,
  fetchPrimaryBranch,
  fetchServices,
  fetchVerificationDocuments,
  setOnboardingStep,
} from './api';
import { nextStep, type OrgStepKey } from './steps';

export const onboardingKeys = {
  organization: (userId: string) => ['onboarding', 'organization', userId] as const,
  branch: (orgId: string) => ['onboarding', 'branch', orgId] as const,
  services: (orgId: string) => ['onboarding', 'services', orgId] as const,
  members: (orgId: string) => ['onboarding', 'members', orgId] as const,
  documents: (orgId: string) => ['onboarding', 'documents', orgId] as const,
  availability: (orgId: string, visitType: VisitType) =>
    ['onboarding', 'availability', orgId, visitType] as const,
};

export function useMyOrganization() {
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  return useQuery({
    queryKey: onboardingKeys.organization(userId ?? 'anonymous'),
    queryFn: () => fetchMyOrganization(userId as string),
    enabled: Boolean(userId),
  });
}

export function usePrimaryBranch(organizationId: string | undefined) {
  return useQuery({
    queryKey: onboardingKeys.branch(organizationId ?? 'none'),
    queryFn: () => fetchPrimaryBranch(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useOrgServices(organizationId: string | undefined) {
  return useQuery({
    queryKey: onboardingKeys.services(organizationId ?? 'none'),
    queryFn: () => fetchServices(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useOrgMembers(organizationId: string | undefined) {
  return useQuery({
    queryKey: onboardingKeys.members(organizationId ?? 'none'),
    queryFn: () => fetchOrgMembers(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useOrgVerificationDocuments(organizationId: string | undefined) {
  return useQuery({
    queryKey: onboardingKeys.documents(organizationId ?? 'none'),
    queryFn: () => fetchVerificationDocuments(organizationId as string),
    enabled: Boolean(organizationId),
  });
}

export function useOrgAvailability(organizationId: string | undefined, visitType: VisitType) {
  return useQuery({
    queryKey: onboardingKeys.availability(organizationId ?? 'none', visitType),
    queryFn: () => fetchAvailability(organizationId as string, visitType),
    enabled: Boolean(organizationId),
  });
}

/**
 * Advances the wizard: persists the next step key on the organization row (so a cold
 * start resumes here) and then navigates.
 */
export function useAdvanceStep() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const setActiveOrganizationId = useOrgContextStore((s) => s.setActiveOrganizationId);

  const mutation = useMutation({
    mutationFn: async (input: {
      organizationId: string;
      currentStep: OrgStepKey;
      orgType: import('@/types').OrgType | null;
    }) => {
      const next = nextStep(input.currentStep, input.orgType);
      await setOnboardingStep(input.organizationId, next?.key ?? null);
      return next;
    },
    onSuccess: async (next, variables) => {
      setActiveOrganizationId(variables.organizationId);
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: onboardingKeys.organization(userId) });
      }
      if (next) router.push(next.route as Href);
    },
  });

  return useCallback(
    (input: {
      organizationId: string;
      currentStep: OrgStepKey;
      orgType: import('@/types').OrgType | null;
    }) => mutation.mutateAsync(input),
    [mutation],
  );
}
