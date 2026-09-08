import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { usePreferencesStore, type ThemeMode } from '@/stores/preferencesStore';

import { Chip } from './Chip';
import { Text } from './Text';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Appearance picker. 'System' follows the device; the others pin the palette. */
export function ThemeToggle() {
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);

  return (
    <View style={styles.container}>
      <Text variant="label" color="textMuted">
        APPEARANCE
      </Text>
      <View style={styles.row}>
        {MODES.map((mode) => (
          <Chip
            key={mode.value}
            label={mode.label}
            selected={themeMode === mode.value}
            onPress={() => setThemeMode(mode.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
});
