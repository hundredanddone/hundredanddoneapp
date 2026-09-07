import { supabase } from '@/lib/supabase';
import type { LatLng, OrgBranch } from '@/types';

export interface BranchInput {
  name: string;
  address: string;
  coords: LatLng | null;
  isPrimary?: boolean;
}

export async function createBranch(organizationId: string, input: BranchInput): Promise<OrgBranch> {
  const { data, error } = await supabase
    .from('org_branches')
    .insert({
      organization_id: organizationId,
      name: input.name,
      address: input.address,
      lat: input.coords?.latitude ?? null,
      lng: input.coords?.longitude ?? null,
      is_primary: input.isPrimary ?? false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as OrgBranch;
}

export async function deleteBranch(branchId: string): Promise<void> {
  const { error } = await supabase.from('org_branches').delete().eq('id', branchId);
  if (error) throw error;
}
