import { useState } from 'react';

import { useAdvanceStep, useMyOrganization, useOrgServices } from '@/features/onboarding';
import { OrgStepShell } from '@/features/onboarding/OrgStepShell';
import { ServiceManager } from '@/features/org-setup/ServiceManager';
import type { Organization } from '@/types';

export default function OrgServicesScreen() {
  const advance = useAdvanceStep();
  const { data: organization } = useMyOrganization();
  const { data: services = [] } = useOrgServices(organization?.id);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async (org: Organization) => {
    await advance({ organizationId: org.id, currentStep: 'services', orgType: org.org_type });
  };

  return (
    <OrgStepShell
      stepKey="services"
      onNext={(org) => void handleNext(org)}
      nextDisabled={services.length === 0}
      error={error}
    >
      <ServiceManager organizationId={organization?.id ?? null} onError={setError} />
    </OrgStepShell>
  );
}
