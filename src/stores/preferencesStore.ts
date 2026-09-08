import 'expo-sqlite/localStorage/install';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { VisitType } from '@/types';

export type ThemeMode = 'system' | 'light' | 'dark';

interface PreferencesState {
  /** 'system' follows the device; the others override it. */
  themeMode: ThemeMode;
  /** Last "visit clinic / doctor visits me" choice, reused as the default everywhere. */
  visitType: VisitType;
  /** Discovery radius in km. */
  searchRadiusKm: number;
  setThemeMode: (mode: ThemeMode) => void;
  setVisitType: (visitType: VisitType) => void;
  setSearchRadiusKm: (km: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      visitType: 'clinic',
      searchRadiusKm: 10,
      setThemeMode: (themeMode) => set({ themeMode }),
      setVisitType: (visitType) => set({ visitType }),
      setSearchRadiusKm: (searchRadiusKm) => set({ searchRadiusKm }),
    }),
    {
      name: 'hundred-and-done:preferences',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
