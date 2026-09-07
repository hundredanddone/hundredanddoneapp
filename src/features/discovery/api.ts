import { supabase } from '@/lib/supabase';
import type { DiscoveryResult, LatLng, OrgBranch, Organization, VisitType } from '@/types';

export interface DiscoveryParams {
  center: LatLng;
  radiusKm: number;
  visitType: VisitType;
  search?: string;
}

/**
 * Location-based search.
 *
 * Distance filtering happens in Postgres via the `discover_organizations` RPC so that
 * anon/patient clients never receive rows outside their radius, and so the query can
 * stay inside the discovery-safe column set the RLS policies expose.
 */
export async function discoverOrganizations(params: DiscoveryParams): Promise<DiscoveryResult[]> {
  const { data, error } = await supabase.rpc('discover_organizations', {
    p_lat: params.center.latitude,
    p_lng: params.center.longitude,
    p_radius_km: params.radiusKm,
    p_visit_type: params.visitType,
    p_search: params.search?.trim() || null,
  });

  if (error) throw error;
  return (data ?? []) as DiscoveryResult[];
}

export interface ProviderProfile {
  organization: Organization;
  branches: OrgBranch[];
  services: {
    id: string;
    name: string;
    description: string | null;
    service_offerings: {
      id: string;
      visit_type: VisitType;
      price: number;
      duration_minutes: number;
      is_active: boolean;
    }[];
  }[];
  rating: { average: number | null; count: number };
}

export async function fetchProviderProfile(organizationId: string): Promise<ProviderProfile> {
  const [orgResult, branchResult, serviceResult, reviewResult] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', organizationId).single(),
    supabase.from('org_branches').select('*').eq('organization_id', organizationId),
    supabase
      .from('services')
      .select(
        'id, name, description, service_offerings(id, visit_type, price, duration_minutes, is_active)',
      )
      .eq('organization_id', organizationId),
    supabase.from('reviews').select('rating').eq('organization_id', organizationId),
  ]);

  if (orgResult.error) throw orgResult.error;
  if (branchResult.error) throw branchResult.error;
  if (serviceResult.error) throw serviceResult.error;

  const ratings = (reviewResult.data ?? []) as { rating: number }[];
  const average =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null;

  return {
    organization: orgResult.data as Organization,
    branches: (branchResult.data ?? []) as OrgBranch[],
    services: (serviceResult.data ?? []) as ProviderProfile['services'],
    rating: { average, count: ratings.length },
  };
}
