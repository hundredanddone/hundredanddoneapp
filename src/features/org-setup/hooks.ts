import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useOrgContextStore } from '@/stores/orgContextStore';
import type { OrgBranch, Organization } from '@/types';

export const orgSetupKeys = {
  memberships: (profileId: string) => ['org-setup', 'memberships', profileId] as const,
  branches: (organizationId: string) => ['org-setup', 'branches', organizationId] as const,
};

export interface Membership {
  id: string;
  organization_id: string;
  role_in_org: string;
  organizations: Organization | null;
}

/** Every org this profile belongs to — a doctor can work at more than one. */
export function useMyMemberships() {
  const profileId = useAuthStore((s) => s.session?.user.id ?? null);
  return useQuery({
    queryKey: orgSetupKeys.memberships(profileId ?? 'none'),
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from('org_members')
        .select('id, organization_id, role_in_org, organizations (*)')
        .eq('profile_id', profileId as string);
      if (error) throw error;
      return (data ?? []) as unknown as Membership[];
    },
    enabled: Boolean(profileId),
  });
}

export function useOrgBranches(organizationId: string | null) {
  return useQuery({
    queryKey: orgSetupKeys.branches(organizationId ?? 'none'),
    queryFn: async (): Promise<OrgBranch[]> => {
      const { data, error } = await supabase
        .from('org_branches')
        .select('*')
        .eq('organization_id', organizationId as string)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrgBranch[];
    },
    enabled: Boolean(organizationId),
  });
}

/**
 * The organization the org-side UI is acting for.
 *
 * Falls back to the first membership so a doctor invited to a clinic lands somewhere
 * sensible without ever having picked an org, and pins the choice for later sessions.
 */
export function useActiveOrganization() {
  const activeOrganizationId = useOrgContextStore((s) => s.activeOrganizationId);
  const setActiveOrganizationId = useOrgContextStore((s) => s.setActiveOrganizationId);
  const { data: memberships = [], isPending } = useMyMemberships();

  const active =
    memberships.find((membership) => membership.organization_id === activeOrganizationId) ??
    memberships[0] ??
    null;

  useEffect(() => {
    if (active && active.organization_id !== activeOrganizationId) {
      setActiveOrganizationId(active.organization_id);
    }
  }, [active, activeOrganizationId, setActiveOrganizationId]);

  return {
    organization: active?.organizations ?? null,
    organizationId: active?.organization_id ?? null,
    roleInOrg: active?.role_in_org ?? null,
    memberships,
    isPending,
  };
}
