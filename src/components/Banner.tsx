import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import { Text } from './Text';

export type BannerTone = 'info' | 'warning' | 'success' | 'danger';

export interface BannerProps {
  title: string;
  message?: string;
  tone?: BannerTone;
  actionLabel?: string;
  onPressAction?: () => void;
}

const iconFor: Record<BannerTone, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  warning: 'time',
  success: 'checkmark-circle',
  danger: 'alert-circle',
};

export function Banner({ title, message, tone = 'info', actionLabel, onPressAction }: BannerProps) {
  const { colors } = useTheme();
  const toneMap = {
    info: { bg: colors.primarySoft, fg: colors.primary },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  } as const;
  const { bg, fg } = toneMap[tone];

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Ionicons name={iconFor[tone]} size={20} color={fg} style={styles.icon} />
      <View style={styles.body}>
        <Text variant="bodyStrong" style={{ color: fg }}>
          {title}
        </Text>
        {message ? (
          <Text variant="caption" color="textSubtle">
            {message}
          </Text>
        ) : null}
        {actionLabel && onPressAction ? (
          <Pressable onPress={onPressAction} accessibilityRole="button" hitSlop={8}>
            <Text variant="bodyStrong" style={{ color: fg, textDecorationLine: 'underline' }}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: spacing.xs },
});
