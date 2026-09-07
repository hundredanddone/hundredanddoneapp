import 'expo-sqlite/localStorage/install';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { VisitType } from '@/types';

interface PreferencesState {
  /** Last "visit clinic / doctor visits me" choice, reused as the default everywhere. */
  visitType: VisitType;
  /** Discovery radius in km. */
  searchRadiusKm: number;
  setVisitType: (visitType: VisitType) => void;
  setSearchRadiusKm: (km: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      visitType: 'clinic',
      searchRadiusKm: 10,
      setVisitType: (visitType) => set({ visitType }),
      setSearchRadiusKm: (searchRadiusKm) => set({ searchRadiusKm }),
    }),
    {
      name: 'hundred-and-done:preferences',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
