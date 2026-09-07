import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type AppColors } from '@/constants/theme';

export interface Theme {
  colors: AppColors;
  isDark: boolean;
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { colors: isDark ? darkColors : lightColors, isDark };
}
