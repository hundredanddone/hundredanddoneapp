import { useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AddressMapPicker, Banner, Card, Chip, DayTimeBlockPicker, Text } from '@/components';
import { spacing } from '@/constants/theme';
import {
  saveAvailability,
  saveHomeVisitServiceArea,
  useAdvanceStep,
  useMyOrganization,
  useOrgAvailability,
  usePrimaryBranch,
} from '@/features/onboarding';
import { OrgStepShell } from '@/features/onboarding/OrgStepShell';
import {
  DEFAULT_SLOT_MINUTES,
  cloneEmptyWeek,
  isWeekEmpty,
  rulesToWeekly,
  slotDurationFromRules,
} from '@/features/org-setup/availability';
import { useTheme } from '@/hooks/useTheme';
import type {
  AvailabilityRule,
  LatLng,
  OrgBranch,
  Organization,
  WeeklyAvailability,
} from '@/types';

const RADIUS_CHOICES = [3, 5, 10, 15, 25, 50];

interface HomeVisitDraft {
  enabled: boolean;
  weekly: WeeklyAvailability;
  slotMinutes: number;
  radiusKm: number;
  center: LatLng | null;
  centerAddress: string;
}

/**
 * Baseline comes from the saved home-visit rules plus the primary branch, which
 * seeds the service-area centre. Local edits win once the org touches anything.
 */
function savedValues(
  rules: AvailabilityRule[] | undefined,
  branch: OrgBranch | null | undefined,
): HomeVisitDraft {
  const hasRules = Boolean(rules && rules.length > 0);
  return {
    enabled: hasRules,
    weekly: hasRules ? rulesToWeekly(rules as AvailabilityRule[]) : cloneEmptyWeek(),
    slotMinutes: rules ? slotDurationFromRules(rules) : DEFAULT_SLOT_MINUTES,
    radiusKm: 10,
    center:
      branch?.lat != null && branch?.lng != null
        ? { latitude: branch.lat, longitude: branch.lng }
        : null,
    centerAddress: branch?.address ?? '',
  };
}

export default function HomeVisitAvailabilityScreen() {
  const { colors } = useTheme();
  const advance = useAdvanceStep();
  const { data: organization } = useMyOrganization();
  const { data: branch } = usePrimaryBranch(organization?.id);
  const { data: rules } = useOrgAvailability(organization?.id, 'home');

  const [draft, setDraft] = useState<HomeVisitDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saved = useMemo(() => savedValues(rules, branch), [rules, branch]);
  const values = draft ?? saved;
  // Functional update — see the note in org/location.tsx. Two callbacks landing in the
  // same render would otherwise drop the first write.
  const update = (patch: Partial<HomeVisitDraft>) =>
    setDraft((prev) => ({ ...(prev ?? saved), ...patch }));

  const handleSave = async (org: Organization, keepEnabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      if (keepEnabled && values.center) {
        await saveAvailability(org.id, 'home', values.weekly, values.slotMinutes);
        await saveHomeVisitServiceArea(org.id, values.center, values.radiusKm);
      } else {
        // Turning home visits off clears the hours; nothing is bookable without them.
        await saveAvailability(org.id, 'home', cloneEmptyWeek(), values.slotMinutes);
      }
      await advance({
        organizationId: org.id,
        currentStep: 'availability_home',
        orgType: org.org_type,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your home-visit settings.');
    } finally {
      setSaving(false);
    }
  };

  const blocked = values.enabled && (isWeekEmpty(values.weekly) || !values.center);

  return (
    <OrgStepShell
      stepKey="availability_home"
      onNext={(org) => void handleSave(org, values.enabled)}
      onSkip={(org) => void handleSave(org, false)}
      skipLabel="I don't offer home visits"
      nextDisabled={blocked}
      saving={saving}
      error={error}
    >
      <Card>
        <View style={styles.toggleRow}>
          <View style={styles.toggleBody}>
            <Text variant="bodyStrong">Do you also offer home visits?</Text>
            <Text variant="caption" color="textMuted">
              Patients can book you to visit them at their address.
            </Text>
          </View>
          <Switch
            value={values.enabled}
            onValueChange={(enabled) => update({ enabled })}
            trackColor={{ true: colors.primary, false: colors.borderStrong }}
          />
        </View>
      </Card>

      {values.enabled ? (
        <View style={styles.section}>
          <Banner
            tone="info"
            title="Home-visit hours are independent"
            message="Set them to whatever suits travel time — they do not have to match your clinic hours."
          />

          <DayTimeBlockPicker
            value={values.weekly}
            onChange={(weekly) => update({ weekly })}
            slotDurationMinutes={values.slotMinutes}
            onSlotDurationChange={(slotMinutes) => update({ slotMinutes })}
          />

          <View style={styles.section}>
            <Text variant="heading">Service area</Text>
            <Text variant="caption" color="textMuted">
              How far from this point are you willing to travel?
            </Text>
            <View style={styles.radiusRow}>
              {RADIUS_CHOICES.map((km) => (
                <Chip
                  key={km}
                  label={`${km} km`}
                  selected={values.radiusKm === km}
                  onPress={() => update({ radiusKm: km })}
                />
              ))}
            </View>
            <AddressMapPicker
              label="Service area centre"
              addressLabel="Centre address"
              coords={values.center}
              onChangeCoords={(center) => update({ center })}
              address={values.centerAddress}
              onChangeAddress={(centerAddress) => update({ centerAddress })}
              radiusKm={values.radiusKm}
              height={240}
            />
          </View>
        </View>
      ) : null}
    </OrgStepShell>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleBody: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.md },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
