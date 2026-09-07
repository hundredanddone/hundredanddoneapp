import { useState } from 'react';

import { useAdvanceStep, useMyOrganization } from '@/features/onboarding';
import { OrgStepShell } from '@/features/onboarding/OrgStepShell';
import { StaffManager } from '@/features/org-setup/StaffManager';
import type { Organization } from '@/types';

export default function OrgStaffScreen() {
  const advance = useAdvanceStep();
  const { data: organization } = useMyOrganization();
  const [error, setError] = useState<string | null>(null);

  const handleNext = async (org: Organization) => {
    await advance({ organizationId: org.id, currentStep: 'staff', orgType: org.org_type });
  };

  return (
    <OrgStepShell
      stepKey="staff"
      onNext={(org) => void handleNext(org)}
      onSkip={(org) => void handleNext(org)}
      skipLabel="Skip — I'll add my team later"
      error={error}
    >
      <StaffManager organizationId={organization?.id ?? null} onError={setError} />
    </OrgStepShell>
  );
}
