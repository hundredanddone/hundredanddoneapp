import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { SelectableCard, Text } from '@/components';
import { spacing } from '@/constants/theme';
import {
  createOrganization,
  onboardingKeys,
  useAdvanceStep,
  useMyOrganization,
  updateOrganization,
} from '@/features/onboarding';
import { OrgStepShell } from '@/features/onboarding/OrgStepShell';
import { useAuthStore } from '@/stores/authStore';
import { useOrgContextStore } from '@/stores/orgContextStore';
import type { OrgType } from '@/types';

const OPTIONS: {
  value: OrgType;
  title: string;
  description: string;
  icon: 'person' | 'business' | 'medkit';
}[] = [
  {
    value: 'independent_doctor',
    title: 'Independent doctor',
    description: 'You practise on your own. Your organization is just you — an org of one.',
    icon: 'person',
  },
  {
    value: 'clinic',
    title: 'Clinic',
    description: 'A single practice with one or more doctors and support staff.',
    icon: 'business',
  },
  {
    value: 'hospital',
    title: 'Hospital',
    description: 'Multiple departments and branches, with many doctors and staff.',
    icon: 'medkit',
  },
];

export default function OrgTypeScreen() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const setActiveOrganizationId = useOrgContextStore((s) => s.setActiveOrganizationId);
  const queryClient = useQueryClient();
  const advance = useAdvanceStep();
  const { data: organization } = useMyOrganization();

  const [selected, setSelected] = useState<OrgType | null>(organization?.org_type ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    if (!selected || !session) return;
    setSaving(true);
    setError(null);
    try {
      // Resuming this step just changes the type; the org row is created once.
      const org = organization
        ? await updateOrganization(organization.id, { org_type: selected })
        : await createOrganization(session.user.id, selected, profile?.full_name ?? 'My practice');

      setActiveOrganizationId(org.id);
      await queryClient.invalidateQueries({
        queryKey: onboardingKeys.organization(session.user.id),
      });
      await advance({ organizationId: org.id, currentStep: 'org_type', orgType: selected });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your organization type.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrgStepShell
      stepKey="org_type"
      allowMissingOrganization
      onNext={() => void handleNext()}
      nextDisabled={!selected}
      saving={saving}
      error={error}
    >
      <View style={styles.options}>
        {OPTIONS.map((option) => (
          <SelectableCard
            key={option.value}
            title={option.title}
            description={option.description}
            icon={`${option.icon}-outline`}
            selected={selected === option.value}
            onPress={() => setSelected(option.value)}
          />
        ))}
      </View>
      <Text variant="caption" color="textMuted">
        Clinics and hospitals can invite doctors and staff later. Independent doctors skip that
        step.
      </Text>
    </OrgStepShell>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.md },
});
