import { useQuery } from '@tanstack/react-query';

import type { LatLng, VisitType } from '@/types';

import { discoverOrganizations, fetchProviderProfile } from './api';

export const discoveryKeys = {
  search: (center: LatLng | null, radiusKm: number, visitType: VisitType, search: string) =>
    [
      'discovery',
      center?.latitude ?? null,
      center?.longitude ?? null,
      radiusKm,
      visitType,
      search,
    ] as const,
  provider: (organizationId: string) => ['discovery', 'provider', organizationId] as const,
};

export function useDiscovery(
  center: LatLng | null,
  radiusKm: number,
  visitType: VisitType,
  search: string,
) {
  return useQuery({
    queryKey: discoveryKeys.search(center, radiusKm, visitType, search),
    queryFn: () => discoverOrganizations({ center: center as LatLng, radiusKm, visitType, search }),
    enabled: Boolean(center),
  });
}

export function useProviderProfile(organizationId: string | undefined) {
  return useQuery({
    queryKey: discoveryKeys.provider(organizationId ?? 'none'),
    queryFn: () => fetchProviderProfile(organizationId as string),
    enabled: Boolean(organizationId),
  });
}
