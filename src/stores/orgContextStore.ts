import 'expo-sqlite/localStorage/install';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OrgContextState {
  /**
   * The organization the signed-in org user is currently acting for. A doctor can
   * belong to more than one org (e.g. their own practice plus a hospital), so every
   * org-side query is scoped by this id rather than by the profile alone.
   */
  activeOrganizationId: string | null;
  /** Branch filter inside the active org; null means "all branches". */
  activeBranchId: string | null;
  setActiveOrganizationId: (id: string | null) => void;
  setActiveBranchId: (id: string | null) => void;
  clear: () => void;
}

export const useOrgContextStore = create<OrgContextState>()(
  persist(
    (set) => ({
      activeOrganizationId: null,
      activeBranchId: null,
      setActiveOrganizationId: (activeOrganizationId) =>
        set({ activeOrganizationId, activeBranchId: null }),
      setActiveBranchId: (activeBranchId) => set({ activeBranchId }),
      clear: () => set({ activeOrganizationId: null, activeBranchId: null }),
    }),
    {
      name: 'hundred-and-done:org-context',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
