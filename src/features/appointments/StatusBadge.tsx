import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AppointmentStatus } from '@/types';

import { STATUS_LABELS } from './api';

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { colors } = useTheme();

  const tone: Record<AppointmentStatus, { bg: string; fg: string }> = {
    pending: { bg: colors.warningSoft, fg: colors.warning },
    confirmed: { bg: colors.primarySoft, fg: colors.primary },
    en_route: { bg: colors.primarySoft, fg: colors.primary },
    in_progress: { bg: colors.primarySoft, fg: colors.primary },
    completed: { bg: colors.successSoft, fg: colors.success },
    cancelled: { bg: colors.dangerSoft, fg: colors.danger },
    no_show: { bg: colors.dangerSoft, fg: colors.danger },
  };

  return (
    <View style={[styles.badge, { backgroundColor: tone[status].bg }]}>
      <Text variant="label" style={{ color: tone[status].fg }}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
});
