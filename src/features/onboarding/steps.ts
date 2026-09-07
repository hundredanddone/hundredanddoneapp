import type { OrgType } from '@/types';

export type OrgStepKey =
  | 'org_type'
  | 'basic_info'
  | 'location'
  | 'availability_clinic'
  | 'availability_home'
  | 'services'
  | 'staff'
  | 'verification';

export interface OrgStep {
  key: OrgStepKey;
  title: string;
  subtitle: string;
  route: string;
  /** Steps that do not apply to every org type. */
  appliesTo?: OrgType[];
  skippable?: boolean;
}

/**
 * The org wizard in order. `organizations.onboarding_step` stores the key of the step
 * the org still has to complete, so exiting and returning resumes in place.
 */
export const ORG_STEPS: OrgStep[] = [
  {
    key: 'org_type',
    title: 'What kind of practice is this?',
    subtitle: 'This shapes the rest of your setup. You can change it later.',
    route: '/(onboarding)/org/org-type',
  },
  {
    key: 'basic_info',
    title: 'Tell patients who you are',
    subtitle: 'Your public profile on 100 and Done.',
    route: '/(onboarding)/org/basic-info',
  },
  {
    key: 'location',
    title: 'Where are you based?',
    subtitle: 'Your primary location. Hospitals can add more branches later.',
    route: '/(onboarding)/org/location',
  },
  {
    key: 'availability_clinic',
    title: 'Clinic visit hours',
    subtitle: 'When patients can come to you.',
    route: '/(onboarding)/org/availability-clinic',
  },
  {
    key: 'availability_home',
    title: 'Home visits',
    subtitle: 'Optional — separate hours and a service area.',
    route: '/(onboarding)/org/availability-home',
    skippable: true,
  },
  {
    key: 'services',
    title: 'Services you offer',
    subtitle: 'Add at least one, with a price per visit type.',
    route: '/(onboarding)/org/services',
  },
  {
    key: 'staff',
    title: 'Your team',
    subtitle: 'Invite doctors and staff to this organization.',
    route: '/(onboarding)/org/staff',
    appliesTo: ['clinic', 'hospital'],
    skippable: true,
  },
  {
    key: 'verification',
    title: 'Verification documents',
    subtitle: 'We review these before your profile goes live.',
    route: '/(onboarding)/org/verification',
  },
];

export const FIRST_ORG_STEP: OrgStepKey = 'org_type';

/** Steps that apply to a given org type — an independent doctor skips the staff step. */
export function stepsForOrgType(orgType: OrgType | null): OrgStep[] {
  if (!orgType) return ORG_STEPS.filter((step) => !step.appliesTo);
  return ORG_STEPS.filter((step) => !step.appliesTo || step.appliesTo.includes(orgType));
}

export function stepIndex(key: OrgStepKey, orgType: OrgType | null): number {
  return stepsForOrgType(orgType).findIndex((step) => step.key === key);
}

/** The step after `key`, or null when the wizard is finished. */
export function nextStep(key: OrgStepKey, orgType: OrgType | null): OrgStep | null {
  const steps = stepsForOrgType(orgType);
  const index = steps.findIndex((step) => step.key === key);
  return index >= 0 && index + 1 < steps.length ? (steps[index + 1] ?? null) : null;
}

export function stepByKey(key: OrgStepKey): OrgStep | undefined {
  return ORG_STEPS.find((step) => step.key === key);
}

export const PATIENT_STEPS = [
  { key: 'profile', title: 'Confirm your details', route: '/(onboarding)/patient/profile' },
  { key: 'location', title: 'Enable location', route: '/(onboarding)/patient/location' },
] as const;
