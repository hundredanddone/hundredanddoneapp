import { Image, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

import { Text } from './Text';

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

export function Avatar({ uri, name, size = 44 }: AvatarProps) {
  const { colors } = useTheme();
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[dimension, { backgroundColor: colors.surfaceMuted }]} />;
  }
  return (
    <View style={[dimension, styles.fallback, { backgroundColor: colors.primarySoft }]}>
      <Text variant="bodyStrong" color="primary" style={{ fontSize: size * 0.36 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
