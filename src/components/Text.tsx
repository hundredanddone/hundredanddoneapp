import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { typography, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ColorKey =
  | 'text'
  | 'textMuted'
  | 'textSubtle'
  | 'primary'
  | 'primaryStrong'
  | 'danger'
  | 'success'
  | 'warning'
  | 'onPrimary';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorKey;
  center?: boolean;
}

export function Text({ variant = 'body', color = 'text', center, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const base = typography[variant] as TextStyle;
  return (
    <RNText
      {...rest}
      style={[base, { color: colors[color] }, center ? { textAlign: 'center' } : null, style]}
    />
  );
}
