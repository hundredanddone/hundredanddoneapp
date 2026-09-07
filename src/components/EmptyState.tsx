import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onPressAction?: () => void;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onPressAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text variant="heading" center>
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textMuted" center>
          {message}
        </Text>
      ) : null}
      {actionLabel && onPressAction ? (
        <Button label={actionLabel} onPress={onPressAction} variant="secondary" fullWidth={false} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
});
