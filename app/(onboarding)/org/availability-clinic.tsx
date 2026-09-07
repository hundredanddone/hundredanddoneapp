import { useMemo, useState } from 'react';

import { Banner, DayTimeBlockPicker } from '@/components';
import {
  saveAvailability,
  useAdvanceStep,
  useMyOrganization,
  useOrgAvailability,
} from '@/features/onboarding';
import { OrgStepShell } from '@/features/onboarding/OrgStepShell';
import {
  DEFAULT_SLOT_MINUTES,
  defaultClinicWeek,
  isWeekEmpty,
  rulesToWeekly,
  slotDurationFromRules,
} from '@/features/org-setup/availability';
import type { Organization, WeeklyAvailability } from '@/types';

interface AvailabilityDraft {
  weekly: WeeklyAvailability;
  slotMinutes: number;
}

export default function ClinicAvailabilityScreen() {
  const advance = useAdvanceStep();
  const { data: organization } = useMyOrganization();
  const { data: rules } = useOrgAvailability(organization?.id, 'clinic');

  const [draft, setDraft] = useState<AvailabilityDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved rules are the baseline; a fresh org starts from a sensible Mon–Fri pattern.
  const saved = useMemo<AvailabilityDraft>(
    () =>
      rules && rules.length > 0
        ? { weekly: rulesToWeekly(rules), slotMinutes: slotDurationFromRules(rules) }
        : { weekly: defaultClinicWeek(), slotMinutes: DEFAULT_SLOT_MINUTES },
    [rules],
  );
  const values = draft ?? saved;

  const handleNext = async (org: Organization) => {
    setSaving(true);
    setError(null);
    try {
      await saveAvailability(org.id, 'clinic', values.weekly, values.slotMinutes);
      await advance({
        organizationId: org.id,
        currentStep: 'availability_clinic',
        orgType: org.org_type,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your hours.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrgStepShell
      stepKey="availability_clinic"
      onNext={(org) => void handleNext(org)}
      nextDisabled={isWeekEmpty(values.weekly)}
      saving={saving}
      error={error}
    >
      <Banner
        tone="info"
        title="These are your in-person clinic hours"
        message="Home-visit hours are set separately on the next step, so they can differ completely."
      />
      <DayTimeBlockPicker
        value={values.weekly}
        onChange={(weekly) => setDraft({ ...values, weekly })}
        slotDurationMinutes={values.slotMinutes}
        onSlotDurationChange={(slotMinutes) => setDraft({ ...values, slotMinutes })}
      />
    </OrgStepShell>
  );
}
