import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import {
  Banner,
  Button,
  DayTimeBlockPicker,
  LoadingScreen,
  Screen,
  Text,
  VisitTypeToggle,
} from '@/components';
import { spacing } from '@/constants/theme';
import { onboardingKeys, saveAvailability, useOrgAvailability } from '@/features/onboarding';
import { useActiveOrganization } from '@/features/org-setup';
import {
  DEFAULT_SLOT_MINUTES,
  cloneEmptyWeek,
  rulesToWeekly,
  slotDurationFromRules,
} from '@/features/org-setup/availability';
import type { VisitType, WeeklyAvailability } from '@/types';

interface AvailabilityDraft {
  /** Which visit type this draft belongs to — switching tabs discards it. */
  visitType: VisitType;
  weekly: WeeklyAvailability;
  slotMinutes: number;
}

export default function OrgAvailabilityScreen() {
  const queryClient = useQueryClient();
  const { organizationId, isPending } = useActiveOrganization();
  const [visitType, setVisitType] = useState<VisitType>('clinic');
  const { data: rules, isFetching } = useOrgAvailability(organizationId ?? undefined, visitType);

  const [draft, setDraft] = useState<AvailabilityDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const saved = useMemo<AvailabilityDraft>(
    () => ({
      visitType,
      weekly: rules && rules.length > 0 ? rulesToWeekly(rules) : cloneEmptyWeek(),
      slotMinutes: rules ? slotDurationFromRules(rules) : DEFAULT_SLOT_MINUTES,
    }),
    [rules, visitType],
  );

  // A draft only applies to the visit type it was started on.
  const values = draft && draft.visitType === visitType ? draft : saved;

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveAvailability(organizationId, visitType, values.weekly, values.slotMinutes);
      await queryClient.invalidateQueries({
        queryKey: onboardingKeys.availability(organizationId, visitType),
      });
      setDraft(null);
      setMessage({ tone: 'success', text: 'Your hours have been updated.' });
    } catch (e) {
      setMessage({
        tone: 'danger',
        text: e instanceof Error ? e.message : 'Could not save your hours.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isPending) return <LoadingScreen />;

  return (
    <Screen
      scroll
      edges={{ top: true, bottom: true }}
      footer={<Button label="Save hours" loading={saving} onPress={() => void handleSave()} />}
    >
      <View style={{ gap: spacing.sm }}>
        <Text variant="display">Availability</Text>
        <Text variant="body" color="textMuted">
          Clinic and home-visit hours are kept separately.
        </Text>
      </View>

      <VisitTypeToggle
        value={visitType}
        onChange={(next) => {
          setMessage(null);
          setVisitType(next);
        }}
      />

      {message ? (
        <Banner
          tone={message.tone === 'success' ? 'success' : 'danger'}
          title={message.tone === 'success' ? 'Saved' : 'Could not save'}
          message={message.text}
        />
      ) : null}

      {visitType === 'home' ? (
        <Banner
          tone="info"
          title="Home visits"
          message="Turning every day off here stops new home-visit bookings. Your service area is set on your profile."
        />
      ) : null}

      {isFetching && !rules ? (
        <Text variant="caption" color="textMuted">
          Loading your current hours…
        </Text>
      ) : (
        <DayTimeBlockPicker
          value={values.weekly}
          onChange={(weekly) => setDraft({ ...values, visitType, weekly })}
          slotDurationMinutes={values.slotMinutes}
          onSlotDurationChange={(slotMinutes) => setDraft({ ...values, visitType, slotMinutes })}
        />
      )}
    </Screen>
  );
}
