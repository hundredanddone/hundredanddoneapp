import { Redirect, type Href } from 'expo-router';

import { LoadingScreen } from '@/components';
import { stepByKey, useMyOrganization, type OrgStepKey } from '@/features/onboarding';
import { useAuthStore } from '@/stores/authStore';

/**
 * Picks up an unfinished wizard where it was left. Patients have a fixed two-step flow;
 * orgs resume from `organizations.onboarding_step`.
 */
export default function ResumeOnboardingScreen() {
  const role = useAuthStore((s) => s.profile?.role ?? null);
  const { data: organization, isPending } = useMyOrganization();

  if (!role) return <Redirect href="/account-type" />;
  if (role === 'patient') return <Redirect href="/patient/profile" />;

  if (isPending) return <LoadingScreen message="Picking up where you left off…" />;
  if (!organization) return <Redirect href="/org/org-type" />;

  const step = organization.onboarding_step
    ? stepByKey(organization.onboarding_step as OrgStepKey)
    : null;

  return <Redirect href={(step?.route ?? '/org/org-type') as Href} />;
}
