import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView. Off for screens that own their own list. */
  scroll?: boolean;
  /** Pinned footer, outside the scroll area (e.g. a wizard's Continue button). */
  footer?: ReactNode;
  padded?: boolean;
  edges?: { top?: boolean; bottom?: boolean };
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = false,
  footer,
  padded = true,
  edges = { top: false, bottom: true },
  contentContainerStyle,
  style,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const padding = padded ? { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg } : null;
  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[padding, styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding, contentContainerStyle]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.flex,
        { backgroundColor: colors.background },
        edges.top ? { paddingTop: insets.top } : null,
        style,
      ]}
    >
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: (edges.bottom ? insets.bottom : 0) + spacing.md,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl, gap: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
});
