import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type AppColors } from '@/constants/theme';
import { usePreferencesStore } from '@/stores/preferencesStore';

export interface Theme {
  colors: AppColors;
  isDark: boolean;
}

/**
 * Resolves the palette from the saved preference, falling back to the device setting.
 * The choice is persisted, so it survives a restart, and because the root layout reads
 * `isDark` from here the status bar and navigation chrome follow it too.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const themeMode = usePreferencesStore((s) => s.themeMode);

  const isDark = themeMode === 'system' ? scheme === 'dark' : themeMode === 'dark';
  return { colors: isDark ? darkColors : lightColors, isDark };
}
