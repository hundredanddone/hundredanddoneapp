import { useState } from 'react';
import { View } from 'react-native';

import { Banner, LoadingScreen, Screen, Text } from '@/components';
import { spacing } from '@/constants/theme';
import { useActiveOrganization } from '@/features/org-setup';
import { ServiceManager } from '@/features/org-setup/ServiceManager';

export default function OrgSetupServicesScreen() {
  const { organizationId, isPending } = useActiveOrganization();
  const [error, setError] = useState<string | null>(null);

  if (isPending) return <LoadingScreen />;

  return (
    <Screen scroll>
      <View style={{ gap: spacing.sm }}>
        <Text variant="title">Services and pricing</Text>
        <Text variant="body" color="textMuted">
          What patients can book, and what each visit type costs.
        </Text>
      </View>

      {error ? <Banner tone="danger" title="Something went wrong" message={error} /> : null}

      <ServiceManager organizationId={organizationId} onError={setError} />
    </Screen>
  );
}
