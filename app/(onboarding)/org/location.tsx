import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddressMapPicker, Banner, TextField } from '@/components';
import { spacing } from '@/constants/theme';
import {
  upsertPrimaryBranch,
  useAdvanceStep,
  useMyOrganization,
  usePrimaryBranch,
} from '@/features/onboarding';
import { OrgStepShell } from '@/features/onboarding/OrgStepShell';
import type { LatLng, OrgBranch, Organization } from '@/types';

interface LocationDraft {
  branchName: string;
  address: string;
  coords: LatLng | null;
}

/** Saved branch as the baseline; local edits win. See basic-info for the rationale. */
function savedValues(branch: OrgBranch | null | undefined): LocationDraft {
  return {
    branchName: branch?.name ?? 'Main location',
    address: branch?.address ?? '',
    coords:
      branch?.lat != null && branch?.lng != null
        ? { latitude: branch.lat, longitude: branch.lng }
        : null,
  };
}

export default function OrgLocationScreen() {
  const advance = useAdvanceStep();
  const { data: organization } = useMyOrganization();
  const { data: branch } = usePrimaryBranch(organization?.id);

  const [draft, setDraft] = useState<LocationDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = draft ?? savedValues(branch);
  const update = (patch: Partial<LocationDraft>) => setDraft({ ...values, ...patch });

  const handleNext = async (org: Organization) => {
    setSaving(true);
    setError(null);
    try {
      await upsertPrimaryBranch(org.id, {
        name: values.branchName.trim() || 'Main location',
        address: values.address.trim(),
        coords: values.coords,
      });
      await advance({ organizationId: org.id, currentStep: 'location', orgType: org.org_type });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this location.');
    } finally {
      setSaving(false);
    }
  };

  const isHospital = organization?.org_type === 'hospital';

  return (
    <OrgStepShell
      stepKey="location"
      onNext={(org) => void handleNext(org)}
      nextDisabled={values.address.trim().length < 5 || !values.coords}
      saving={saving}
      error={error}
    >
      <View style={styles.form}>
        {isHospital ? (
          <Banner
            tone="info"
            title="More branches later"
            message="Add this hospital's main address now. You can add other branches from the dashboard once you're set up."
          />
        ) : null}

        <TextField
          label="Location name"
          value={values.branchName}
          onChangeText={(branchName) => update({ branchName })}
          placeholder="Main location"
          hint="Patients see this when you have more than one branch."
        />

        <AddressMapPicker
          label="Primary location"
          coords={values.coords}
          onChangeCoords={(coords) => update({ coords })}
          address={values.address}
          onChangeAddress={(address) => update({ address })}
        />
      </View>
    </OrgStepShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
});
