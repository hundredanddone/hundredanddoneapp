import { useState } from 'react';
import { View } from 'react-native';

import { Banner, LoadingScreen, Screen, Text } from '@/components';
import { spacing } from '@/constants/theme';
import { useActiveOrganization } from '@/features/org-setup';
import { StaffManager } from '@/features/org-setup/StaffManager';

export default function OrgSetupStaffScreen() {
  const { organizationId, isPending } = useActiveOrganization();
  const [error, setError] = useState<string | null>(null);

  if (isPending) return <LoadingScreen />;

  return (
    <Screen scroll>
      <View style={{ gap: spacing.sm }}>
        <Text variant="title">Your team</Text>
        <Text variant="body" color="textMuted">
          Doctors and staff who work under this organization.
        </Text>
      </View>

      {error ? <Banner tone="danger" title="Something went wrong" message={error} /> : null}

      <StaffManager organizationId={organizationId} onError={setError} />
    </Screen>
  );
}
