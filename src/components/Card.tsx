import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { radius, shadow, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Card({ children, onPress, padded = true, style, testID }: CardProps) {
  const { colors } = useTheme();
  const base: ViewStyle[] = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
    padded ? styles.padded : {},
    style ?? {},
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={[base, shadow]}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [base, shadow, pressed ? styles.pressed : null]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.9 },
});
