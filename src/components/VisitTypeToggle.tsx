import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { VisitType } from '@/types';

import { Text } from './Text';

export interface VisitTypeToggleProps {
  value: VisitType;
  onChange: (value: VisitType) => void;
  /** Hide/disable an option the provider does not offer. */
  availableTypes?: VisitType[];
  compact?: boolean;
}

const META: Record<VisitType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  clinic: { label: 'I visit the clinic', icon: 'business-outline' },
  home: { label: 'Doctor visits me', icon: 'home-outline' },
};

/**
 * The core "visit clinic / doctor visits me" switch. Used on discovery, provider
 * profiles and the booking flow; the last choice is remembered in the preferences store.
 */
export function VisitTypeToggle({
  value,
  onChange,
  availableTypes = ['clinic', 'home'],
  compact = false,
}: VisitTypeToggleProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceMuted }]}>
      {(['clinic', 'home'] as VisitType[]).map((type) => {
        const selected = value === type;
        const enabled = availableTypes.includes(type);
        return (
          <Pressable
            key={type}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !enabled }}
            disabled={!enabled}
            onPress={() => onChange(type)}
            style={[
              styles.option,
              compact ? styles.optionCompact : null,
              selected ? { backgroundColor: colors.surface } : null,
              !enabled ? styles.disabled : null,
            ]}
          >
            <Ionicons
              name={META[type].icon}
              size={compact ? 15 : 17}
              color={selected ? colors.primary : colors.textMuted}
            />
            <Text
              variant={compact ? 'caption' : 'bodyStrong'}
              style={{ color: selected ? colors.primary : colors.textMuted }}
              numberOfLines={1}
            >
              {META[type].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 4, borderRadius: radius.md, gap: 4 },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  optionCompact: { paddingVertical: spacing.sm },
  disabled: { opacity: 0.4 },
});
