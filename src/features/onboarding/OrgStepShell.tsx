import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, LoadingScreen, Screen, StepProgress } from '@/components';
import { spacing } from '@/constants/theme';
import type { Organization } from '@/types';

import { useMyOrganization } from './hooks';
import { stepByKey, stepIndex, stepsForOrgType, type OrgStepKey } from './steps';

export interface OrgStepShellProps {
  stepKey: OrgStepKey;
  children: ReactNode | ((organization: Organization) => ReactNode);
  onNext: (organization: Organization) => void | Promise<void>;
  nextLabel?: string;
  nextDisabled?: boolean;
  saving?: boolean;
  error?: string | null;
  onSkip?: (organization: Organization) => void | Promise<void>;
  skipLabel?: string;
  /** The org-type step runs before an organization row exists. */
  allowMissingOrganization?: boolean;
}

/**
 * Shared chrome for every org wizard step: progress header, error banner and a pinned
 * footer. Keeps each step file focused on the one thing it collects.
 */
export function OrgStepShell({
  stepKey,
  children,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  saving = false,
  error,
  onSkip,
  skipLabel = 'Skip for now',
  allowMissingOrganization = false,
}: OrgStepShellProps) {
  const { data: organization, isPending } = useMyOrganization();

  if (isPending) return <LoadingScreen />;
  if (!organization && !allowMissingOrganization) return <LoadingScreen />;

  const orgType = organization?.org_type ?? null;
  const steps = stepsForOrgType(orgType);
  const index = stepIndex(stepKey, orgType);
  const meta = stepByKey(stepKey);

  return (
    <Screen
      scroll
      edges={{ top: true, bottom: true }}
      footer={
        <View style={styles.footer}>
          <Button
            label={nextLabel}
            onPress={() => void onNext(organization as Organization)}
            disabled={nextDisabled}
            loading={saving}
          />
          {onSkip ? (
            <Button
              label={skipLabel}
              variant="ghost"
              size="md"
              disabled={saving}
              onPress={() => void onSkip(organization as Organization)}
            />
          ) : null}
        </View>
      }
    >
      <StepProgress
        current={index >= 0 ? index + 1 : 1}
        total={steps.length}
        title={meta?.title ?? ''}
        subtitle={meta?.subtitle}
      />

      {error ? <Banner tone="danger" title="Could not save" message={error} /> : null}

      {typeof children === 'function' ? children(organization as Organization) : children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.xs },
});
