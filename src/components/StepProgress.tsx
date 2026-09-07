import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import { Text } from './Text';

export interface StepProgressProps {
  current: number;
  total: number;
  title: string;
  subtitle?: string;
}

/** Header for a resumable wizard step: "Step 3 of 8" + a progress bar. */
export function StepProgress({ current, total, title, subtitle }: StepProgressProps) {
  const { colors } = useTheme();
  const ratio = total > 0 ? Math.min(Math.max(current / total, 0), 1) : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
        <View
          style={[styles.fill, { backgroundColor: colors.primary, width: `${ratio * 100}%` }]}
        />
      </View>
      <Text variant="label" color="textMuted">
        {`STEP ${current} OF ${total}`}
      </Text>
      <Text variant="title">{title}</Text>
      {subtitle ? (
        <Text variant="body" color="textMuted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.pill },
});
